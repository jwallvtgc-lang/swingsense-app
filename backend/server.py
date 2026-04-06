"""
SwingSense Backend API — Phase 0

FastAPI server that runs the analysis pipeline:
  1. Download swing video from Supabase Storage
  2. Extract keypoints with MoveNet Thunder (TFLite)
  3. Analyze mechanics with Claude
  4. Return structured coaching output
"""

import hashlib
import json
import os
import tempfile
import time
import urllib.request
from pathlib import Path

import cv2
import httpx
import numpy as np
from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# Log config at import (helps debug Render crashes)
import sys
def _log(msg: str) -> None:
    print(msg, flush=True)
    sys.stdout.flush()

_log(f"[Startup] Python {sys.version}")
_log(f"[Startup] PORT={os.environ.get('PORT', 'not set')}")
_log(f"[Startup] ANTHROPIC_API_KEY={'set' if os.environ.get('ANTHROPIC_API_KEY') else 'NOT SET'}")

try:
    from tflite_runtime.interpreter import Interpreter
    _log("[Startup] Using tflite_runtime")
except ImportError:
    try:
        import tensorflow as tf
        Interpreter = tf.lite.Interpreter
        _log("[Startup] Using tensorflow.lite (tflite_runtime not available)")
    except ImportError as e:
        _log(f"[Startup] FATAL: Neither tflite_runtime nor tensorflow available: {e}")
        raise

app = FastAPI(title="SwingSense Analysis API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MoveNet Setup ────────────────────────────────────────────────

TFLITE_MODEL_URL = (
    "https://tfhub.dev/google/lite-model/movenet/singlepose/thunder/tflite/float16/4"
    "?lite-format=tflite"
)
MODEL_CACHE_DIR = Path.home() / ".swingsense"
MODEL_FILENAME = "movenet_thunder_f16.tflite"

KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

_interpreter = None


def get_interpreter():
    global _interpreter
    if _interpreter is not None:
        return _interpreter

    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_CACHE_DIR / MODEL_FILENAME

    if not model_path.exists():
        print("Downloading MoveNet Thunder model...")
        urllib.request.urlretrieve(TFLITE_MODEL_URL, str(model_path))
        print(f"Model saved to: {model_path}")

    _interpreter = Interpreter(model_path=str(model_path))
    _interpreter.allocate_tensors()
    print("MoveNet Thunder loaded.")
    return _interpreter


def resize_with_pad(image: np.ndarray, target_h: int, target_w: int) -> np.ndarray:
    """Resize image preserving aspect ratio with zero-padding (replaces tf.image.resize_with_pad)."""
    h, w = image.shape[:2]
    scale = min(target_h / h, target_w / w)
    new_h = int(h * scale)
    new_w = int(w * scale)
    resized = cv2.resize(image, (new_w, new_h))

    pad_top = (target_h - new_h) // 2
    pad_bottom = target_h - new_h - pad_top
    pad_left = (target_w - new_w) // 2
    pad_right = target_w - new_w - pad_left

    return cv2.copyMakeBorder(
        resized, pad_top, pad_bottom, pad_left, pad_right,
        cv2.BORDER_CONSTANT, value=[0, 0, 0],
    )


def extract_keypoints(video_path: str, sample_rate: int = 2) -> dict:
    """Extract MoveNet keypoints from a video file."""
    interpreter = get_interpreter()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    input_dtype = input_details[0]["dtype"]

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Cannot open video file")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frames_data = []
    frame_number = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_number % sample_rate == 0:
            img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = resize_with_pad(img, 256, 256)
            img = np.expand_dims(img, axis=0).astype(input_dtype)

            interpreter.set_tensor(input_details[0]["index"], img)
            interpreter.invoke()

            keypoints_raw = interpreter.get_tensor(output_details[0]["index"])
            keypoints_array = keypoints_raw[0, 0, :, :]

            keypoints = {}
            for i, name in enumerate(KEYPOINT_NAMES):
                y, x, confidence = keypoints_array[i]
                keypoints[name] = {
                    "x": round(float(x), 4),
                    "y": round(float(y), 4),
                    "confidence": round(float(confidence), 4),
                }

            frames_data.append({
                "frame_number": frame_number,
                "timestamp_ms": round((frame_number / fps) * 1000, 1),
                "keypoints": keypoints,
            })

        frame_number += 1

    cap.release()

    return {
        "video_file": Path(video_path).name,
        "resolution": {"width": width, "height": height},
        "fps": round(fps, 2),
        "total_frames": total_frames,
        "frames_processed": len(frames_data),
        "sample_rate": sample_rate,
        "frames": frames_data,
    }


def validate_swing_video(keypoint_data: dict) -> None:
    """
    Validate that the video contains a detectable person and swing motion.
    Raises HTTPException with no_swing_detected if validation fails.
    """
    frames = keypoint_data.get("frames", [])
    if not frames:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "no_swing_detected",
                "message": "We couldn't detect a swing in this video. Make sure you're visible in the frame and take a full swing.",
            },
        )

    # 1. Person check: require meaningful body detection
    CONF_THRESHOLD = 0.3
    MIN_KEYPOINTS_PER_FRAME = 8  # at least 8 of 17 keypoints with decent confidence
    MIN_GOOD_FRAMES_RATIO = 0.3  # at least 30% of frames must have good detection

    good_frames = 0
    for frame in frames:
        kps = frame.get("keypoints", {})
        high_conf_count = sum(1 for kp in kps.values() if kp.get("confidence", 0) >= CONF_THRESHOLD)
        if high_conf_count >= MIN_KEYPOINTS_PER_FRAME:
            good_frames += 1

    if good_frames < len(frames) * MIN_GOOD_FRAMES_RATIO:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "no_swing_detected",
                "message": "We couldn't detect a swing in this video. Make sure you're visible in the frame and take a full swing.",
            },
        )

    # 2. Swing motion check: require significant wrist/arm movement
    WRIST_KEYS = ["left_wrist", "right_wrist"]
    ELBOW_KEYS = ["left_elbow", "right_elbow"]
    MIN_MOVEMENT_RANGE = 0.08  # normalized coords 0-1; 0.08 = ~8% of frame

    def movement_range(keys: list[str]) -> float:
        xs, ys = [], []
        for frame in frames:
            kps = frame.get("keypoints", {})
            for key in keys:
                if key in kps and kps[key].get("confidence", 0) >= CONF_THRESHOLD:
                    xs.append(kps[key]["x"])
                    ys.append(kps[key]["y"])
        if len(xs) < 3:
            return 0.0
        return max(max(xs) - min(xs), max(ys) - min(ys))

    wrist_range = movement_range(WRIST_KEYS)
    elbow_range = movement_range(ELBOW_KEYS)

    if wrist_range < MIN_MOVEMENT_RANGE and elbow_range < MIN_MOVEMENT_RANGE:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "no_swing_detected",
                "message": "We couldn't detect a swing in this video. Make sure you're visible in the frame and take a full swing.",
            },
        )


def calculate_head_stability(frames: list) -> int | None:
    """
    Head stability 0–100 from nose vertical movement across frames.
    Returns None if there is not enough high-confidence nose data.
    """
    valid = [
        f
        for f in frames
        if f.get("keypoints", {}).get("nose", {}).get("confidence", 0) > 0.4
    ]
    if len(valid) < 10:
        return None

    nose_y = [f["keypoints"]["nose"]["y"] for f in valid]

    baseline_count = max(1, len(nose_y) // 5)
    baseline_y = sum(nose_y[:baseline_count]) / baseline_count

    max_drop = max(y - baseline_y for y in nose_y)

    mean_y = sum(nose_y) / len(nose_y)
    variance = (sum((y - mean_y) ** 2 for y in nose_y) / len(nose_y)) ** 0.5

    drop_score = max(0, 1 - (max_drop / 0.08)) * 100
    variance_score = max(0, 1 - (variance / 0.04)) * 100

    final_score = (drop_score * 0.7) + (variance_score * 0.3)

    return round(min(100, max(0, final_score)))


# ── Claude Analysis ──────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an elite baseball hitting coach with 20+ years of experience coaching \
players from youth travel ball through the major leagues. You specialize in \
biomechanical swing analysis using body keypoint data captured from video.

You are given per-frame keypoint data from a player's swing video. Each frame \
contains (x, y) coordinates and confidence scores for 17 body landmarks. \
Coordinates are normalized 0–1 (origin top-left). Frames are sequential in time.

Your job is to analyze THIS specific swing data and provide actionable coaching feedback. \
Each analysis request is for a different video; base your scores and feedback solely on \
the keypoint data provided, not on assumptions or prior analyses.

AGE-BASED LANGUAGE (REQUIRED):
- Use plain language for teen players (ages 10–19). Avoid jargon. Keep feedback accessible.
- Short words, short sentences. Say "hips lead, then shoulders" not "hip-shoulder separation."
- Say "using your legs and core" not "kinetic chain." Write like a coach talking at practice.
- A 13-year-old gets different framing than a 20-year-old college player. Adjust tone and complexity by age.

COACHING TONE (REQUIRED — NOT CLINICAL):
- Sound like a real dugout coach after practice: warm, direct, human. NOT a lab report or sports science paper.
- ALWAYS lead with something genuine and positive — find one thing that is working in every swing, even if the mechanics are rough. Youth players need to feel capable before they can absorb a correction. Never open with the problem even if the swing has multiple issues.
- Avoid cold phrases like "analysis indicates," "the data suggests," "suboptimal," "deficiency." Use "here's what I'd tweak," "next step," "you're close — focus on."
- overall_summary MUST feel encouraging and actionable: at least one warm or affirming line before or alongside the fix, unless the swing has severe mechanical issues across the board.
- SPECIFICITY REQUIREMENT — ENFORCED: Your coaching output must reference at least 2 specific observations from THIS swing's keypoint data. Generic advice that could apply to any player is not acceptable. Before finalizing your response, check: does the overall_summary reference something specific I saw in these keypoints? Does the drill address the specific timing or movement pattern in this data? If you could copy-paste this response onto a different player's analysis without changing a word, rewrite it.

SPECIFICITY REQUIREMENT — MANDATORY:
Before finalizing your response check these three things:
1. Does overall_summary reference at least one specific observation from the computed swing metrics provided? (e.g. hip shift value, head drop, shoulder-hip lag)
2. Does the drill address the specific timing or movement pattern visible in this data — not just the issue category generally?
3. Could you copy-paste this response onto a different player's analysis without changing a word? If yes — rewrite it.

Generic advice that ignores the computed metrics is not acceptable. A player who uploads two different swings must receive meaningfully different feedback if their computed metrics are different.

PREFERRED COACHING LANGUAGE — use these phrases naturally when the situation applies. Do not force them, but when the mechanic fits, use the coach's actual words:

For weight staying back:
- 'Stay behind your hip' (not 'maintain posterior weight shift')
- 'Keep your chest back' (not 'resist forward trunk tilt')
- 'Your weight needs to stay back' (not 'maintain rear-weighted stance')
- 'Go torso, land, back leg — in that order'

For stride timing:
- 'Let it travel' (not 'delay swing initiation')
- 'Slow load, not back' — aggressive stride but torso stays behind
- 'Spend more time in the gathering' (not 'extend load phase')
- 'Land as the ball gets to the front of the plate, not before'
- 'You need to improve your internal clock'
- 'Feel yourself freefall for a millisecond, then finish with the stride'

For head stillness:
- 'Keep your head still like a hat sitting on top'
- 'Chin over your front shoulder — as you swing, your back shoulder replaces it'
- 'Your eyes are moving with the ball — keep them still'
- 'Head dropping creates a balance issue and you can't see the ball as well'

For connection and hands:
- 'Stay connected' / 'feel connected' (not 'maintain proximal-to-distal sequencing')
- 'Get your hands inside' (not 'maintain an inside path')
- 'Turn the knob back' / 'face the knob toward the back wall'
- 'Keep the diamond shape with your hands'
- 'Your bottom hand can only go as far as your stride goes'

For hip load and rotation:
- 'Load the stride and the upper body will stay out of timing'
- 'Feel your hips reaching, feel your knees driving'
- 'Back foot pushes first, stride foot picks it up'
- 'Get more out of the hip load'

For bat path and slot:
- 'Get on plane' / 'get in the slot' (not 'optimize attack angle')
- 'Palm up, palm down through contact' (not 'forearm pronation/supination')
- 'Find the barrel' (not 'optimize barrel path efficiency')
- 'Stay inside the ball' (not 'avoid casting the barrel')

For encouragement and framing:
- 'You're close — here's the next tweak'
- 'That's a good cut right there'
- 'Those two things together will give you the quickest improvement'
- 'It all came together on that one' — use when a previous issue appears corrected
- 'That probably feels like less effort with more power' — use when mechanics improve
- Never say: 'analysis indicates', 'the data suggests', 'suboptimal', 'deficiency', 'kinetic chain', 'hip-shoulder separation', 'attack angle', 'proximal-to-distal'

DARIAN'S COACHING VOICE — use with PREFERRED COACHING LANGUAGE above:

NEW VOCABULARY TO ADD:
- 'Rubber band' — the load and stretch before firing. 'You're only using half your rubber band' means not fully loading
- 'The break' — front foot landing is the timing decision point. 'Land like that's the break'
- 'Your starting spot is how you'll land' — hands at setup should match hands at landing
- 'Freed up space' — what happens when a mechanical fix works
- 'Hunt that pitch' — being ready and aggressive for a specific pitch
- 'Tinker with it' — experimenting with a new feel
- 'Bigger blip' — measurable improvement

NEW FEEL CUES TO USE:
- 'This is going to feel weird at first — that means you're doing it right'
- 'When it feels tight in that spot, that's how you know you've got it'
- 'When your head moves, your hands have to go with it — keep them separate'

DISCOMFORT VALIDATION — REQUIRED:
When introducing a mechanical change in the drill, always include one sentence acknowledging it will feel strange. Darian does this constantly because players revert to comfort.
Use: 'This is going to feel super weird at first — that's normal and it means it's working.'
Never let a player think something is wrong just because it feels different.

CONNECT TO GAME OUTCOMES — REQUIRED:
Every overall_summary must end by connecting the mechanical fix to a real game result.
Not: 'Improving your hip rotation will raise your score'
But: 'Get this working and you'll start driving balls you used to roll over — more line drives, more backspin, more hard contact'
Use outcomes like: 'drive the ball harder', 'stay through pitches on the outer half', 'hit the ball where it's pitched', 'more backspin on your line drives', 'handle velocity better'

BAT SPEED AS EVIDENCE — NOT A GRADE:
When referencing bat speed, frame it as proof that mechanics work — not as a performance score.
Not: 'Your bat speed is estimated at 62 mph'
But: 'When these mechanics click, you'll feel the bat moving faster without swinging harder — that's how you know the sequence is right'

IMPORTANT: You MUST respond with valid JSON only. No markdown, no extra text.

Respond with this exact JSON structure:
{
  "primary_mechanical_issue": {
    "title": "string (short, e.g. 'Hips not leading')",
    "description": "string — ONE sentence only: why this matters for the drill. Do NOT repeat or paraphrase overall_summary; add only the mechanical \"why\" if not already clear from the summary."
  },
  "drill": "string (2–4 concrete steps for how to do the drill, each step on its own line. Example: 'Step 1 – Tuck a small towel under your lead arm.\\nStep 2 – Take 5–10 swings keeping the towel pinned.\\nStep 3 – Focus on keeping your elbow close to your body.')",
  "bat_speed_estimate": {
    "mph": number,
    "confidence": "low | medium | high",
    "reasoning": "string"
  },
  "similarity_scores": {
    "hip_rotation": number (0-100),
    "weight_transfer": number (0-100),
    "bat_path": number (0-100),
    "contact_point": number (0-100),
    "overall": number (0-100),
    "head_stability": number (0-100)
  },
  "overall_summary": "string (2-3 sentences, encouraging, actionable)",
  "vs_last_swing": "string or null — ONE sentence only, max ~25 words, plain language: what changed vs their last swing (or null if no previous swing context was provided)"
}

Guidelines:
- Pick the ONE most important thing to fix based on the keypoint data. Do not list multiple issues.
- primary_mechanical_issue is supporting context for the drill — keep description to ONE short sentence. The Coach's Summary already covers encouragement and big picture; avoid duplicating that here.
- The drill must include 2–4 concrete steps. Format as "Step 1 – [action]. Step 2 – [action]. Step 3 – [action]." (or use \\n between steps). Each step must be specific and actionable. Example for "towel under the arm": Step 1 – Tuck a small towel under your lead arm. Step 2 – Take 5–10 swings keeping the towel pinned. Step 3 – Focus on keeping your elbow close to your body. Never generic advice like "practice more" or "work on your mechanics."

DRILL GENERATION — follow DRILL STRUCTURE below for the "drill" JSON string:

DRILL STRUCTURE — REQUIRED FORMAT:
Every drill must have exactly three parts:

PART 1 — THE WHY (one sentence):
Start with 'This drill trains...' or 'This helps you feel...'
Explain what the drill fixes in plain language before listing steps.

PART 2 — THE STEPS (2-4 steps):
Each step starts with a physical action word: Feel / Keep / Push / Land / Turn / Hold / Let
Never start a step with 'Focus on' or 'Try to' — these are mental, not physical
Each step describes something the player can feel in their body

PART 3 — THE SUCCESS CUE (one sentence):
Start with 'When you get it right, you'll feel...'
Describe the physical sensation of doing it correctly
This is the most important part — it's how the player knows they've got it

Example:
This drill trains your lower half to lead before your arms fire. Step 1 — Get to your balance point and feel your back foot loaded. Step 2 — Let yourself freefall for one millisecond before your front foot moves. Step 3 — Feel your back foot push first, then your front foot picks it up. Step 4 — Take 10 slow-motion reps focusing only on that back-foot-first feeling. When you get it right, you'll feel like your hips are pulling your hands through instead of your arms doing all the work.

- Bat speed estimate from wrist keypoint velocity.

SCORING — CALIBRATE BY AGE:
- Use the player's age from the profile. Compare to age-appropriate benchmarks, NOT MLB/pro ideal as the default for teens.
- Expectations differ by age: a 15-year-old JV player with fundamentally sound mechanics should land in the solid/strong band for their age — not the 40s unless there are clear, major flaws in the keypoint data.
- Ages 10–12 (youth): 52–62 = solid for age, 62–72 = strong, 72+ = exceptional.
- Ages 13–15 (youth / JV / freshman): 56–68 = solid for age, 68–78 = strong, 78+ = exceptional. A capable high school player here should usually score solid-to-strong, not mid-40s to low-50s, unless keypoints show serious issues.
- Ages 16–18 (varsity): 58–70 = solid, 70–80 = strong, 80+ = exceptional.
- Ages 19+ (college/adult): 62–75 = solid, 75–85 = strong, 85+ = exceptional.
- Head stability is age-calibrated the same way as other scores — a 14-year-old who keeps their head reasonably still during load and contact should score 65–75, not 40s.
- HEAD STABILITY: A pre-computed head stability score is provided in the user message based on nose keypoint vertical movement analysis. Use this value directly as head_stability — do not compute your own. If no computed score is provided, estimate from the keypoint data with 100 = perfectly still, 0 = significant drop or movement during swing.
- Category scores (hip_rotation, weight_transfer, bat_path, contact_point, head_stability) must each reflect the actual keypoint data for that specific mechanic — not anchored to each other or to overall: do not assign a very low sub-score (e.g. bat_path in the low 40s) unless the keypoint trajectory clearly supports that; if one category is a clear outlier vs the others, briefly reflect that tension in overall_summary (e.g. "bat path is the main area to clean up") rather than implying the whole swing is weak.

SCORE INDEPENDENCE — REQUIRED:
Each sub-score must be computed independently from the keypoint data for that specific mechanic. Do not anchor on the overall score and distribute sub-scores around it. A player can have excellent head stability (85) and poor bat path (52) at the same time — that variance is correct and expected. Clustered scores where all sub-scores fall within 5 points of each other are almost always wrong and indicate you are not scoring each mechanic independently from the data.

EXPERIENCE LEVEL CALIBRATION:
Former College or Pro and Coach experience levels should score in the 72-88 range for solid mechanics. A former D1 player or coach with fundamentally sound mechanics should never score in the low 60s unless keypoints show clear specific mechanical breakdowns. Apply the elite scoring band to these experience levels the same way you apply youth bands to younger players.

SCORE INTERPRETATION — FRAME BY AGE:
- Same number means different things at different ages. A 60 overall for a 15-year-old should read as "on track for your age — here's the next tweak," not "below average." Mirror that framing in overall_summary and primary_mechanical_issue.description.

NO FRAME NUMBERS — ENFORCED IN ALL SECTIONS:
- Do NOT include any frame numbers or frame ranges (e.g. F100, F128-F183, Frames 10-25) anywhere in \
your output. Users cannot scrub to frames and do not understand them.
- Describe timing using plain language only: "during your load," "as you start your swing," \
"through contact," "when you're driving through the ball," "at the point of contact," etc.
- This applies to: primary_mechanical_issue, drill, bat_speed_estimate.reasoning, and overall_summary.

BAT SPEED SECTION:
- The "reasoning" field is optional and shown to the user. If included, it must be ONE short sentence \
only (e.g. "Based on your swing through the zone"). Do NOT include: methodology, frame references, \
coordinate math, barrel travel, projection explanations, calibration reasoning, or any technical detail.

KEEP IT ACTIONABLE:
- Be encouraging but honest. One fix, one drill — keep it simple so they can actually do it.

VS_LAST_SWING:
- If the request includes previous swing data, set vs_last_swing to ONE short sentence comparing THIS swing to last time (progress, regression, or what shifted). Plain language, no jargon.
- If no previous swing was provided, set vs_last_swing to null. Do not invent a comparison."""


def summarize_keypoints_for_prompt(data: dict, analysis_id: str | None = None) -> str:
    """Condense keypoint data for the Claude prompt."""
    lines = []
    if analysis_id:
        lines.append(f"Analysis ID: {analysis_id}")
    lines.extend([
        f"Video: {data['video_file']}",
        f"FPS: {data['fps']}",
        f"Total frames processed: {data['frames_processed']}",
        f"Resolution: {data.get('resolution', {}).get('width', '?')}x{data.get('resolution', {}).get('height', '?')}",
        "",
    ])

    frames = data["frames"]
    total = len(frames)

    if total > 200:
        step = max(1, total // 150)
        sampled = frames[::step]
        lines.append(f"(Sampled every {step} frames — {len(sampled)} of {total} shown)")
        lines.append("")
    else:
        sampled = frames

    for frame in sampled:
        fn = frame["frame_number"]
        ts = frame["timestamp_ms"]
        kps = frame["keypoints"]
        parts = [f"{name}:({v['x']},{v['y']},{v['confidence']})" for name, v in kps.items()]
        lines.append(f"F{fn} @{ts}ms | {' '.join(parts)}")

    return "\n".join(lines)


def compute_swing_metrics(frames: list) -> str:
    if not frames or len(frames) < 5:
        return "Insufficient frames for metric computation."
    lines = ["--- Computed swing metrics (use these to inform your scoring and coaching) ---"]

    def kp(frame, name):
        return frame["keypoints"].get(name, {})

    def conf(frame, name):
        return kp(frame, name).get("confidence", 0)

    hip_frames = [f for f in frames if conf(f, "left_hip") > 0.5 and conf(f, "right_hip") > 0.5]
    wrist_frames = [f for f in frames if conf(f, "left_wrist") > 0.4 and conf(f, "right_wrist") > 0.4]
    shoulder_frames = [f for f in frames if conf(f, "left_shoulder") > 0.5 and conf(f, "right_shoulder") > 0.5]
    nose_frames = [f for f in frames if conf(f, "nose") > 0.4]
    ankle_frames = [f for f in frames if conf(f, "left_ankle") > 0.4]
    if len(hip_frames) >= 5:
        first_third = hip_frames[: max(1, len(hip_frames) // 3)]
        last_third = hip_frames[2 * len(hip_frames) // 3 :]
        early_hip_x = sum(
            kp(f, "left_hip").get("x", 0.5) + kp(f, "right_hip").get("x", 0.5) for f in first_third
        ) / (2 * len(first_third))
        late_hip_x = sum(
            kp(f, "left_hip").get("x", 0.5) + kp(f, "right_hip").get("x", 0.5) for f in last_third
        ) / (2 * len(last_third))
        hip_shift = abs(late_hip_x - early_hip_x)
        lines.append(
            f"Hip lateral shift: {hip_shift:.3f} units (under 0.05 = minimal weight transfer, "
            f"0.05-0.12 = good transfer, over 0.12 = possible lunge)"
        )
    if len(nose_frames) >= 5:
        nose_y = [kp(f, "nose").get("y", 0) for f in nose_frames]
        baseline = sum(nose_y[: max(1, len(nose_y) // 5)]) / max(1, len(nose_y) // 5)
        max_drop = max(nose_y) - baseline
        nose_range = max(nose_y) - min(nose_y)
        lines.append(
            f"Head vertical range: {nose_range:.3f} units (under 0.03 = stable, "
            f"0.03-0.06 = moderate movement, over 0.06 = significant drop)"
        )
        lines.append(
            f"Head drop from setup baseline: {max_drop:.3f} units (positive = head dropping during swing)"
        )
    if len(hip_frames) >= 8 and len(shoulder_frames) >= 8:
        hip_x = [kp(f, "left_hip").get("x", 0) for f in hip_frames]
        sho_x = [kp(f, "left_shoulder").get("x", 0) for f in shoulder_frames]
        hip_start_idx = next((i for i in range(1, len(hip_x)) if abs(hip_x[i] - hip_x[0]) > 0.01), None)
        sho_start_idx = next((i for i in range(1, len(sho_x)) if abs(sho_x[i] - sho_x[0]) > 0.01), None)
        if hip_start_idx is not None and sho_start_idx is not None:
            hip_fn = hip_frames[hip_start_idx]["frame_number"]
            sho_fn = shoulder_frames[sho_start_idx]["frame_number"]
            lag = sho_fn - hip_fn
            if lag > 0:
                desc = "hips leading shoulders — correct sequence"
            elif lag == 0:
                desc = "hips and shoulders moving together — loss of separation"
            else:
                desc = "shoulders moving before hips — power leak, common cause of early rotation"
            lines.append(f"Hip-to-shoulder sequence: {lag:+d} frames ({desc})")
    if len(wrist_frames) >= 5:
        rw_x = [kp(f, "right_wrist").get("x", 0) for f in wrist_frames]
        rw_y = [kp(f, "right_wrist").get("y", 0) for f in wrist_frames]
        x_travel = max(rw_x) - min(rw_x)
        y_travel = max(rw_y) - min(rw_y)
        lines.append(
            f"Right wrist travel: horizontal {x_travel:.3f}, vertical {y_travel:.3f} "
            f"(large vertical = steep/choppy path, balanced = flatter path through zone)"
        )
    if len(ankle_frames) >= 5:
        ax = [kp(f, "left_ankle").get("x", 0) for f in ankle_frames]
        stride = max(ax) - min(ax)
        lines.append(
            f"Front ankle stride distance: {stride:.3f} units (under 0.04 = short/no stride, "
            f"0.04-0.10 = normal, over 0.10 = long stride)"
        )
    total = len(frames)
    high_conf_hip = len(hip_frames)
    coverage = round(high_conf_hip / total * 100) if total > 0 else 0
    lines.append(
        f"Data quality: {high_conf_hip}/{total} frames with reliable hip keypoints ({coverage}% coverage)"
    )
    lines.append("--- End computed metrics ---")
    return "\n".join(lines)


def analyze_with_claude(
    keypoint_data: dict,
    player_profile: dict,
    analysis_id: str | None = None,
    previous_swing: dict | None = None,
    head_stability_score: int | None = None,
) -> dict:
    """Send keypoints to Claude and get structured coaching output."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    # Always pass profile fields; default to youth player when profile missing/incomplete
    profile_age = player_profile.get('age')
    if profile_age is None:
        profile_age = 15  # Assume youth when no profile
    profile_lines = [
        f"Player: {player_profile.get('first_name', 'Player')}",
        f"Age: {profile_age}",
        f"Position: {player_profile.get('primary_position', 'Unknown')}",
        f"Batting side: {player_profile.get('batting_side', 'Right')}",
    ]
    experience = player_profile.get("experience_level")
    if experience:
        profile_lines.append(f'Experience level: {experience}')
    if player_profile.get("height_feet"):
        h = f"{player_profile['height_feet']}'{player_profile.get('height_inches', 0)}\""
        profile_lines.append(f"Height: {h}")

    keypoint_summary = summarize_keypoints_for_prompt(keypoint_data, analysis_id)
    swing_metrics = compute_swing_metrics(keypoint_data.get("frames", []))

    head_stability_block = ""
    if head_stability_score is not None:
        head_stability_block = (
            f"\nComputed head stability score: {head_stability_score}/100 "
            f"(based on nose keypoint vertical movement — use this as your head_stability score value)\n"
        )
    else:
        head_stability_block = (
            "\nHead stability could not be computed (insufficient nose keypoint confidence); "
            "still estimate head_stability in similarity_scores from keypoint data if possible.\n"
        )

    prev_block = ""
    if previous_swing:
        scores = previous_swing.get("similarity_scores") or {}
        summ = (previous_swing.get("overall_summary") or "")[:800]
        prev_block = (
            f"\n\nPrevious swing (for comparison only — same player, earlier video):\n"
            f"- Recorded at: {previous_swing.get('created_at', '')}\n"
            f"- Previous similarity scores: {json.dumps(scores)}\n"
            f"- Previous coach summary (excerpt): {summ}\n"
            f"Score THIS swing from the keypoint data only. Use the previous context only for "
            f"vs_last_swing (one sentence on what changed vs last time)."
        )

    user_message = (
        f"Here is the player profile:\n\n"
        f"{chr(10).join(profile_lines)}\n\n"
        f"{head_stability_block}"
        f"{swing_metrics}\n\n"
        f"And here is the raw keypoint data for additional reference:\n\n"
        f"{keypoint_summary}\n\n"
        f"{prev_block}"
        f"Please analyze this swing and respond with the JSON structure specified."
    )

    client = Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    result_text = response.content[0].text

    try:
        return json.loads(result_text)
    except json.JSONDecodeError:
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(result_text[start:end])
        raise HTTPException(status_code=500, detail="Failed to parse Claude response as JSON")


# ── API Endpoints ────────────────────────────────────────────────

class PreviousSwingPayload(BaseModel):
    created_at: str
    similarity_scores: dict | None = None
    overall_summary: str = ""


class AnalyzeRequest(BaseModel):
    analysis_id: str
    video_url: str
    user_id: str
    player_profile: dict | None = None
    previous_swing: PreviousSwingPayload | None = None


class DrillFollowupRequest(BaseModel):
    analysis_id: str
    original_summary: str
    original_drill: str
    primary_issue_title: str
    primary_issue_description: str
    feedback: str  # "helped" | "still_struggling" | "confused"
    player_profile: dict


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model_loaded=_interpreter is not None,
    )


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """
    Full analysis pipeline:
    1. Download video from URL
    2. Extract keypoints with MoveNet
    3. Analyze with Claude
    4. Return structured results

    Each request is independent: no caching. We download the video, run MoveNet,
    and call Claude fresh for every analyze call.
    """
    start_time = time.time()
    url_hash = hashlib.sha256(request.video_url.encode()).hexdigest()[:12]
    _log(f"[Analyze] Analyzing video analysis_id={request.analysis_id} url_hash={url_hash} url={request.video_url[:100]}...")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        _log(f"[Analyze] Downloading video from provided URL (no cache)...")
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(request.video_url)
            resp.raise_for_status()
            with open(tmp_path, "wb") as f:
                f.write(resp.content)
        _log(f"[Analyze] Downloaded {len(resp.content)} bytes")

        _log(f"[Analyze] Extracting keypoints from downloaded file (MoveNet per-request)...")
        cap_check = cv2.VideoCapture(tmp_path)
        total_frames_check = int(cap_check.get(cv2.CAP_PROP_FRAME_COUNT))
        cap_check.release()
        if total_frames_check < 60:
            sample_rate = 1  # capture every frame for short videos
        elif total_frames_check < 150:
            sample_rate = 2  # default
        else:
            sample_rate = max(2, total_frames_check // 150)  # cap at ~150 frames
        _log(f"[Analyze] total_frames={total_frames_check} using sample_rate={sample_rate}")
        keypoint_data = extract_keypoints(tmp_path, sample_rate=sample_rate)
        _log(f"[Analyze] Extracted {len(keypoint_data['frames'])} frames")
        if len(keypoint_data["frames"]) < 30:
            _log(
                "[Analyze] WARNING: Low frame count — metrics will be unreliable. Video may be too short or wrong format."
            )

        validate_swing_video(keypoint_data)

        head_stability = calculate_head_stability(keypoint_data["frames"])
        _log(f"[Analyze] head_stability_score={head_stability}")

        profile = request.player_profile or {}
        prev_sw = None
        if request.previous_swing is not None:
            ps = request.previous_swing
            prev_sw = (
                ps.model_dump(exclude_none=True)
                if hasattr(ps, "model_dump")
                else ps.dict(exclude_none=True)
            )
        _log("[Analyze] Calling Claude with fresh keypoint data...")
        coaching_output = analyze_with_claude(
            keypoint_data,
            profile,
            analysis_id=request.analysis_id,
            previous_swing=prev_sw,
            head_stability_score=head_stability,
        )

        elapsed = time.time() - start_time
        _log(f"[Analyze] Done in {elapsed:.1f}s")

        return {
            "analysis_id": request.analysis_id,
            "keypoint_data": keypoint_data,
            "coaching_output": coaching_output,
            "processing_time_seconds": round(elapsed, 1),
        }
    except httpx.HTTPStatusError as e:
        _log(f"[Analyze] Video download failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download video: {e}")
    except HTTPException:
        raise
    except Exception as e:
        _log(f"[Analyze] Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@app.post("/drill-followup")
async def drill_followup(request: DrillFollowupRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    profile = request.player_profile
    age = profile.get("age", 15)
    name = profile.get("first_name", "Player")
    experience = profile.get("experience_level", "")

    if request.feedback == "helped":
        tone_instruction = (
            "The player tried the drill and it helped. Celebrate the win genuinely, tell them what "
            "that feeling means for their swing, and give them one thing to watch for next time they upload."
        )
    elif request.feedback == "still_struggling":
        tone_instruction = (
            "The player tried the drill and is still struggling. Do NOT repeat the same drill. Give them "
            "a completely different, simpler physical cue for the same mechanical issue. No equipment needed. "
            "2-3 steps maximum. Start with something they can feel standing still before they even pick up a bat."
        )
    else:  # confused
        tone_instruction = (
            "The player is confused by the drill. Break it down into the single simplest physical action — "
            "one thing they can feel right now. Explain it like they have never heard of this concept before."
        )

    system_prompt = f"""You are an elite baseball hitting coach coaching in the voice of Darian — warm, direct, specific, dugout coach energy.

COACHING VOICE:
- Sound like a real coach responding after practice, not a report
- Use Darian's vocabulary: balance point, power position, rubber band, let it travel, hips first chest follows, feel connected, the break, freefall for a millisecond
- Short sentences. Real words. Nothing a parent needs to Google.
- Always validate the player's effort before giving new instruction
- If giving a new drill: always end with one sentence starting with "When you get it right, you'll feel..."
- Connect to game outcomes: "you'll start driving the ball harder", "more backspin on your line drives"

BANNED WORDS: kinetic chain, hip-shoulder separation, attack angle, posterior weight shift, biomechanical, analysis indicates, suboptimal

Respond in JSON only:
{{
  "response_text": "string — conversational response to their feedback, 2-4 sentences in Darian voice",
  "adjusted_drill": "string or null — new simplified drill if still_struggling or confused, null if helped",
  "encouragement": "string — one short closing line to send them back to practice"
}}"""

    user_message = f"""Player: {name}, Age: {age}, Experience: {experience}

Original issue: {request.primary_issue_title} — {request.primary_issue_description}

Original drill they attempted:
{request.original_drill}

Player feedback: {request.feedback}

Instruction: {tone_instruction}"""

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    result_text = response.content[0].text
    try:
        return json.loads(result_text)
    except json.JSONDecodeError:
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(result_text[start:end])
        raise HTTPException(status_code=500, detail="Failed to parse response")


@app.on_event("startup")
async def startup():
    """Pre-load the MoveNet model on server start."""
    _log("[Startup] Loading MoveNet model...")
    try:
        get_interpreter()
        _log("[Startup] MoveNet loaded successfully")
    except Exception as e:
        _log(f"[Startup] WARNING: Could not pre-load MoveNet model: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    print(f"\n  Starting SwingSense API on port {port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
