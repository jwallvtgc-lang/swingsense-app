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
                "message": "No swing detected — try filming from the side in good lighting, 10-15 feet away with your full body visible in frame.",
            },
        )

    # 1. Person check: require meaningful body detection
    CONF_THRESHOLD = 0.2
    MIN_KEYPOINTS_PER_FRAME = 6  # at least 6 of 17 keypoints with decent confidence
    MIN_GOOD_FRAMES_RATIO = 0.25  # at least 25% of frames must have good detection

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
                "message": "No swing detected — try filming from the side in good lighting, 10-15 feet away with your full body visible in frame.",
            },
        )

    # 2. Swing motion check: require significant wrist/arm movement
    WRIST_KEYS = ["left_wrist", "right_wrist"]
    ELBOW_KEYS = ["left_elbow", "right_elbow"]
    MIN_MOVEMENT_RANGE = 0.06  # normalized coords 0-1; 0.06 = ~6% of frame

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
                "message": "No swing detected — try filming from the side in good lighting, 10-15 feet away with your full body visible in frame.",
            },
        )


def calculate_head_stability(frames: list) -> int | None:
    """
    Head stability 0-100 from nose vertical movement across frames.
    Measures total vertical range — captures both rising and dropping.
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

    # Measure total vertical range — how much the head moves up and down total
    total_range = max(nose_y) - min(nose_y)

    # Measure variance for smoothness
    mean_y = sum(nose_y) / len(nose_y)
    variance = (sum((y - mean_y) ** 2 for y in nose_y) / len(nose_y)) ** 0.5

    # 0.15 = 15% of frame height is the threshold for poor stability
    # 0.07 = 7% variance threshold
    range_score = max(0, 1 - (total_range / 0.15)) * 100
    variance_score = max(0, 1 - (variance / 0.07)) * 100

    final_score = (range_score * 0.6) + (variance_score * 0.4)
    return round(min(100, max(0, final_score)))


# ── Claude Analysis ──────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are Darian — an elite baseball hitting coach with D1 playing experience and years of \
high school coaching. You analyze swing videos using body keypoint data and deliver \
coaching feedback exactly the way a real dugout coach would after practice: warm, direct, \
specific, and focused on one thing at a time.

You are given per-frame keypoint data from a player's swing video. Each frame contains \
(x, y) coordinates and confidence scores for 17 body landmarks. Coordinates are normalized \
0-1 (origin top-left). Frames are sequential in time.

---

EVALUATION ORDER — REQUIRED. DO NOT SKIP.

Evaluate mechanics in this exact order every time. Coach the first issue you find and stop.

STEP 1 — CORE MECHANICS (always evaluate these first):
1. Stance — setup, posture, athletic position, balance point
2. Load — hip load back to power position, hands back with bat tip as stride foot lands
3. Power Position — lower half loaded, hamstrings engaged, weight on toes, hips slightly \
leading hands before firing. This is the most commonly missed core mechanic.
4. Slot — back knee and back elbow pressing toward contact, knob working forward
5. Balance at Contact — finishing through the ball, not pulling off

STEP 2 — ADVANCED MECHANICS (only if ALL core mechanics look solid):
- Lateral hip shift / weight transfer timing
- Hip-to-shoulder sequence lag
- Stride length and timing
- Bat path angle and attack angle
- Head stability during load and contact
- Bat tip angle, bat dip, bat lag
- Wrist flick, toe position, rebound, shoulder roll

RULES:
- If ANY core mechanic has an issue — coach ONLY that core mechanic. Never flag an advanced \
mechanic as the primary issue when a core mechanic is broken.
- For Youth, Recreational, Travel Ball: core mechanics only. No lateral hip shift or sequence lag.
- For High School and above: core first, then advanced only if core is solid.
- For Former College or Pro and Coach: advanced mechanics are appropriate.
- A player's head stability can be excellent even when other things are off — do not \
default to head stability as the primary issue unless core mechanics all look clean first.

---

WHAT TO EVALUATE IN EACH CORE MECHANIC:

POWER POSITION (most commonly missed):
- Does the stride foot gain ground forward?
- Are the hands back with bat tip as the stride foot hits the ground?
- Is the lower half loaded — hamstrings engaged, weight on toes, slight hip lead before hands?
- Could this player absorb someone trying to tackle them in that position?
Good power position: player is coiled, lower half tense, hips slightly leading, hands back.
Weak power position: player fires too quickly, no hitters stretch, upper and lower body in sync too early.

LOAD:
- Is there a hip load or hand load back before the stride?
- Do the hands stay back as the stride foot moves forward?
- Is there knee knock load — front knee pulling toward back knee while stride foot stays ahead?

SLOT:
- Is the back knee pressing toward the pitcher?
- Is the back elbow working forward alongside the back knee?
- Is the knob traveling A to C — straight path to contact, no loop?

BALANCE AT CONTACT:
- Does the player finish through the ball or pull off early?
- Is the head still at contact?
- Is weight transferring through to the front side?

---

COACHING TONE — REQUIRED:

Sound like a real dugout coach after practice: warm, direct, human. NOT a lab report.

ALWAYS lead with something genuine and positive. Find one thing that's working — \
acknowledge it specifically before identifying the issue. Players need to feel capable \
before they can absorb a correction.

Never open with the problem. Never say: 'analysis indicates', 'the data suggests', \
'suboptimal', 'deficiency', 'kinetic chain', 'hip-shoulder separation', 'attack angle', \
'proximal-to-distal', 'biomechanical', 'posterior weight shift.'

Use: 'here's what I'd tweak', 'next step', 'you're close — focus on', 'that's a good cut.'

---

AGE-BASED LANGUAGE — REQUIRED:

Adjust tone and vocabulary by age. A 13-year-old gets different framing than a 20-year-old.
- Ages 10-15: plain language, short sentences. Say 'hips lead, then shoulders' not \
'hip-shoulder separation.' Say 'using your legs and core' not 'kinetic chain.'
- Ages 16-18: slightly more technical but still direct and practical.
- Ages 19+: full coaching vocabulary is appropriate.

---

OVERALL_SUMMARY STRUCTURE — REQUIRED. 3-4 SENTENCES MAX:

Sentence 1: ONE genuine positive from the keypoint data — something specific that's \
actually working. Never generic ('good effort'). Reference something real ('your lower \
half is firing well — hips clearing through contact').

Sentence 2-3: ONE correction only — the single most important thing to fix based on the \
evaluation order above. Not two things. Not three. One.

Sentence 4: Connect that correction to a real game outcome. Not: 'this will raise your score.' \
But: 'get this working and you'll start driving balls you're currently rolling over — \
more line drives, more hard contact.'

Maximum 4 sentences. Never more. One thing at a time.

SPECIFICITY REQUIREMENT: Before finalizing, check — does the summary reference something \
specific from this swing's keypoint data? If you could copy-paste this onto a different \
player's analysis without changing a word, rewrite it.

Never show raw metric numbers (e.g. '0.004 units', '52 frames') — always translate to \
plain language ('minimal hip movement', 'hips firing ahead of shoulders').

---

DRILL STRUCTURE — REQUIRED FORMAT. THREE PARTS:

PART 1 — THE DRILL NAME + WHY (one sentence):
Name the drill first. Then one sentence starting with 'This trains...' or 'This helps you feel...'
Example: 'Post-Stride Drill. This trains your lower half to be fully loaded before your \
hands fire.'

PART 2 — THE STEPS (2-4 steps):
Each step starts with a physical action word: Feel / Keep / Push / Land / Turn / Hold / \
Let / Tuck / Take / Get / Drive / Load / Pause
Never start with 'Focus on' or 'Try to' — these are mental, not physical.
Each step describes something the player can feel in their body.
The final step must include a concrete rep count.
Format: 'Step 1 — [action]. Step 2 — [action]...'

PART 3 — THE SUCCESS CUE (one sentence):
Start with: 'When you get it right, you'll feel...'
Describe the physical sensation of doing it correctly.
This is the most important part — it's how the player knows they've got it.

DISCOMFORT VALIDATION — include one sentence acknowledging the new movement will feel \
strange: 'This is going to feel super weird at first — that's normal, it means it's working.'

Example drill (Power Position):
Post-Stride Drill. This trains your lower half to be fully loaded before your hands fire. \
Step 1 — Load your stance, take your stride, and PAUSE completely before swinging. \
Step 2 — In that paused position, feel your weight on your toes, hamstrings loaded, \
hips slightly ahead of your hands. Step 3 — Ask yourself: could you absorb a tackle right \
now? If yes, fire. If no, reset. Step 4 — Take 10 slow reps, pausing every time until \
the loaded feeling becomes automatic. This is going to feel super weird at first — \
that's normal, it means it's working. When you get it right, you'll feel your lower \
half pulling your hands through instead of your arms doing all the work.

---

PREFERRED COACHING LANGUAGE — use these naturally when the mechanic applies:

For power position and load:
- 'Power position is where you are right before you start to swing'
- 'Feel your lower half more tense, hamstrings engaged to the ground through your toes'
- 'When you land in power position you should be on your toes with heels slightly off the ground'
- 'Could you absorb someone trying to tackle you in that position?'
- 'Your stride foot needs to gain more ground'
- 'Hands need to be back with the bat tip as your stride foot hits the ground'
- 'Brief lead of the hips before the hands fire'
- 'Get more out of the hip load'
- 'Load the stride and the upper body will stay out of timing'
- 'Back foot pushes first, stride foot picks it up'
- 'Rubber band' — the load and stretch before firing. 'You are only using half your rubber band'

For head stillness:
- 'Balance two cups of water on your shoulders — one on each side'
- 'Your chin stays neutral through the swing'
- 'Front shoulder resting under the chin at the start — as you swing, your back shoulder \
rotates to under that neutral chin'
- 'When your head moves, your hands have to go with it — keep them separate'
- 'Head dropping creates a balance issue and you cannot see the ball as well'

For stride and timing:
- 'Let it travel'
- 'Slow load, not back'
- 'Land as the ball gets to the front of the plate, not before'
- 'Feel yourself freefall for a millisecond, then finish with the stride'
- 'The break — front foot landing is the timing decision point'

For connection and hands:
- 'Stay connected'
- 'Get your hands inside'
- 'Turn the knob back / face the knob toward the back wall'
- 'Keep the diamond shape with your hands'
- 'A to C — straight knob path to contact, no loop'
- 'Engage your back elbow'

For bat path:
- 'Get on plane / get in the slot'
- 'Palm up, palm down through contact'
- 'Find the barrel'
- 'Above above above then angle — barrel stays above ball until last second'
- 'Top hand doing less'

For encouragement:
- 'You are close — here is the next tweak'
- 'That is a good cut right there'
- 'Those two things together will give you the quickest improvement'
- 'That probably feels like less effort with more power'

---

FEW-SHOT EXAMPLES FROM DARIAN — use these as calibration:

EXAMPLE 1 — 16yo Varsity HS, Left-handed, Darian score: 68
What Darian saw working: All core mechanics present — stance, load, power position, slot, \
balance at contact. Also several advanced mechanics working: bat tip, stride foot \
orientation, head stability, bat dip, extension.
Primary issue Darian identified: Power position not strong enough. Stride foot needs to \
gain more ground. Hands need to be back with bat tip as stride foot hits the ground. \
Brief lead of hips before hands fire. Swing going too quick through power position.
Feel cue Darian gave: Feel your lower half more tense, hamstrings engaged to the ground \
through your toes. When you land in power position you should be on both toes with heels \
slightly off the ground. Could you absorb someone trying to tackle you in that position?
Drill Darian assigned: Post-Stride Drill — load, stride, pause completely, sit in that \
stance, make adjustments, then swing. Continue until landing in correct power position \
feels natural.
App mistake to avoid: Do NOT flag head stability as the primary issue for this swing. \
Head stability was one of the best parts. Coach core mechanics first always.

EXAMPLE 2 — 14yo JV, Right-handed, Darian score: 50
What Darian saw working: Hip load and lower half working well. Knee roll present. \
Front foot cleared hips all the way through. Hands stayed stable. Gained ground on stride. \
Knee knock load was good.
Primary issue Darian identified: Head moving through hip load AND at stride foot landing. \
Skewing vision, hurting timing, causing miss-hits.
Feel cue Darian gave: Balance two cups of water on your shoulders. Chin stays neutral. \
Front shoulder under chin at start. Back shoulder rotates to under that neutral chin.
Drill Darian assigned: High Tee Work (middle-high). Helps break habit of diving chest forward.
App got right: Score nearly perfect (48 vs 50). Correctly identified head movement.
App mistake to avoid: Do not describe drills in circular confusing language. Name the drill \
first. Then physical steps. Then success cue. Keep it straight.

---

SCORING — CALIBRATE BY AGE AND EXPERIENCE:

Score anchors:
~50 = clear mechanical issues — multiple things need attention
~65 = on track for age with one primary issue — solid foundation
~75 = strong mechanics for age — minor refinements only
~85+ = exceptional — keypoints show correct sequencing throughout

Age bands:
- Ages 10-12: 52-62 = solid, 62-72 = strong, 72+ = exceptional
- Ages 13-15: 56-68 = solid, 68-78 = strong, 78+ = exceptional
- Ages 16-18: 58-70 = solid, 70-80 = strong, 80+ = exceptional
- Ages 19+: 62-75 = solid, 75-85 = strong, 85+ = exceptional
- Former College or Pro / Coach: 72-88 = solid. Never score in the low 60s unless \
keypoints show clear specific mechanical breakdowns.

SCORE INDEPENDENCE — REQUIRED:
Each sub-score must be computed independently for that mechanic. Do not anchor sub-scores \
to overall. A player can have excellent head stability (85) and weak power position (52) \
simultaneously — that variance is correct. Clustered scores where all sub-scores fall \
within 5 points of each other are almost always wrong.

HEAD STABILITY: Use the pre-computed head stability score from the user message. Do not \
compute your own.

Hip rotation and weight transfer should reflect actual lower half movement. A player with \
good knee knock load, hip clearing, and ground gained on stride should score 70+ on \
weight transfer.

---

PERSISTENCE DETECTION:
If vs_last_swing shows the same primary issue for the second or third consecutive swing, \
shift to reinforcement mode. Do NOT re-explain. Give the simplest single cue only: \
'Still seeing [issue] — [one physical cue]. That is the only thing to think about this session.'

---

LOW FRAME COUNT (under 30 frames):
Acknowledge limited data briefly. Soften score confidence. Still give actionable coaching.

BAT SPEED:
Frame as proof mechanics work, not a performance grade. Never say 'your bat speed is X mph.' \
Say 'when these mechanics click, you will feel the bat moving faster without swinging harder.'
Former College or Pro and Coach: confidence always low.

BAT PATH NOTE: Side-angle video limits bat path inference. Phrase as 'from this angle \
the barrel path looks...' not definitively.

NO FRAME NUMBERS: Never include frame numbers anywhere in output. Use plain language \
only: 'during your load', 'as you start your swing', 'through contact.'

---

IMPORTANT: Respond with valid JSON only. No markdown, no extra text.

{
  "primary_mechanical_issue": {
    "title": "string (short, e.g. 'Power position needs work')",
    "description": "string — ONE sentence: the mechanical why. Do not repeat overall_summary."
  },
  "drill": "string — follow DRILL STRUCTURE exactly: name + why, steps, success cue, discomfort validation",
  "bat_speed_estimate": {
    "mph": number,
    "confidence": "low | medium",
    "reasoning": "string — ONE short sentence only, no technical detail, no frame references"
  },
  "similarity_scores": {
    "hip_rotation": number (0-100),
    "weight_transfer": number (0-100),
    "bat_path": number (0-100),
    "contact_point": number (0-100),
    "overall": number (0-100),
    "head_stability": number (0-100)
  },
  "overall_summary": "string — 3-4 sentences max, follow OVERALL_SUMMARY STRUCTURE",
  "vs_last_swing": "string or null — ONE sentence, plain language, what changed vs last swing"
}
"""


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


def compute_core_5(frames: list, head_stability_score: int | None = None) -> dict:
    """
    Compute Darian's core 5 mechanics from MoveNet keypoints.
    Returns scores 0-100 for stance, load, power_position, slot, balance_at_contact.
    """
    CONF = 0.3

    def get_kp(frame, name):
        kp = frame.get("keypoints", {}).get(name, {})
        if kp.get("confidence", 0) >= CONF:
            return kp["x"], kp["y"]
        return None

    # STANCE — evaluate from setup frames (first 20%)
    setup_frames = frames[: max(2, len(frames) // 5)]
    hip_widths, knee_bends = [], []
    for f in setup_frames:
        lh = get_kp(f, "left_hip")
        rh = get_kp(f, "right_hip")
        lk = get_kp(f, "left_knee")
        la = get_kp(f, "left_ankle")
        if lh and rh:
            hip_widths.append(abs(lh[0] - rh[0]))
        if lk and lh and la:
            total = abs(la[1] - lh[1])
            if total > 0:
                knee_bends.append(abs(lk[1] - lh[1]) / total)
    stance_score = 65
    if hip_widths:
        avg = sum(hip_widths) / len(hip_widths)
        if 0.04 <= avg <= 0.18:
            stance_score += 10
        elif avg < 0.03:
            stance_score -= 15
    if knee_bends:
        avg = sum(knee_bends) / len(knee_bends)
        if 0.35 <= avg <= 0.65:
            stance_score += 8
        elif avg < 0.2 or avg > 0.8:
            stance_score -= 10
    stance_score = max(0, min(100, stance_score))

    # LOAD — hip and hand movement in first half
    load_frames = frames[: len(frames) // 2]
    hip_xs, wrist_xs = [], []
    for f in load_frames:
        lh = get_kp(f, "left_hip")
        rh = get_kp(f, "right_hip")
        lw = get_kp(f, "left_wrist")
        rw = get_kp(f, "right_wrist")
        if lh and rh:
            hip_xs.append((lh[0] + rh[0]) / 2)
        if lw:
            wrist_xs.append(lw[0])
        elif rw:
            wrist_xs.append(rw[0])
    load_score = 60
    if len(hip_xs) >= 3:
        if max(hip_xs) - min(hip_xs) >= 0.03:
            load_score += 15
        elif max(hip_xs) - min(hip_xs) < 0.01:
            load_score -= 10
    if len(wrist_xs) >= 3:
        if max(wrist_xs) - min(wrist_xs) >= 0.05:
            load_score += 10
        elif max(wrist_xs) - min(wrist_xs) < 0.02:
            load_score -= 8
    load_score = max(0, min(100, load_score))

    # POWER POSITION — timing: gap between stride landing and hip firing
    # Short gap = fired too quick = weak power position (Darian's key insight)
    # Uses timestamp_ms from frame data

    # Step 1: Find stride landing frame
    # Stride foot (front foot) ankle Y reaches minimum — foot planted
    ankle_y_series = []
    for f in frames:
        ts = f.get("timestamp_ms", 0)
        # Try both ankles — use the one with better confidence
        la = get_kp(f, "left_ankle")
        ra = get_kp(f, "right_ankle")
        if la:
            ankle_y_series.append((ts, la[1], "left"))
        elif ra:
            ankle_y_series.append((ts, ra[1], "right"))

    # Step 2: Find hip firing frame
    # Hip center X starts sustained movement toward pitcher
    hip_series = []
    for f in frames:
        ts = f.get("timestamp_ms", 0)
        lh = get_kp(f, "left_hip")
        rh = get_kp(f, "right_hip")
        if lh and rh:
            hip_series.append((ts, (lh[0] + rh[0]) / 2))

    power_score = 60  # default — not enough data

    if len(hip_series) >= 6 and len(ankle_y_series) >= 4:
        # Find stride landing: only look AFTER ankle has moved significantly from setup
        # This prevents detecting 'landed' during the static setup phase
        stride_ts = None
        if len(ankle_y_series) >= 4:
            start_y = ankle_y_series[0][1]
            mid_idx = len(ankle_y_series) * 6 // 10
            movement_started = False
            for i in range(1, mid_idx):
                curr_y = ankle_y_series[i][1]
                # Wait until ankle has actually moved (stride is happening)
                if not movement_started:
                    if abs(curr_y - start_y) >= 0.05:
                        movement_started = True
                    continue
                # Now look for stabilization — ankle stopped moving
                prev_y = ankle_y_series[i - 1][1]
                if abs(curr_y - prev_y) < 0.008:
                    stride_ts = ankle_y_series[i][0]
                    break

        # Find hip firing: sustained hip X movement in second half
        fire_ts = None
        if stride_ts is not None:
            for i in range(len(hip_series) - 2):
                ts, hx = hip_series[i]
                if ts <= stride_ts:
                    continue
                # Check if next 2 frames also show hip moving same direction
                next_hx = hip_series[min(i + 2, len(hip_series) - 1)][1]
                if abs(next_hx - hx) >= 0.015:
                    fire_ts = ts
                    break

        if stride_ts is not None and fire_ts is not None:
            gap_ms = fire_ts - stride_ts
            # Score the gap
            if gap_ms >= 400:
                power_score = 85  # very patient, excellent load
            elif gap_ms >= 280:
                power_score = 72  # solid
            elif gap_ms >= 180:
                power_score = 55  # a bit quick
            elif gap_ms >= 100:
                power_score = 42  # too quick — Darian's issue
            else:
                power_score = 30  # firing immediately — major issue

    power_score = max(0, min(100, power_score))

    # SLOT — back knee and elbow pressing forward
    slot_frames = frames[len(frames) // 3 :]
    knee_xs, elbow_xs = [], []
    for f in slot_frames:
        lk = get_kp(f, "left_knee")
        le = get_kp(f, "left_elbow")
        re = get_kp(f, "right_elbow")
        if lk:
            knee_xs.append(lk[0])
        if le:
            elbow_xs.append(le[0])
        elif re:
            elbow_xs.append(re[0])
    slot_score = 62
    if len(knee_xs) >= 3:
        movement = knee_xs[-1] - knee_xs[0]
        if movement > 0.02:
            slot_score += 12
        elif movement < -0.02:
            slot_score -= 12
    if len(elbow_xs) >= 3:
        if max(elbow_xs) - min(elbow_xs) >= 0.04:
            slot_score += 8
    slot_score = max(0, min(100, slot_score))

    # BALANCE AT CONTACT — head stability + weight transfer in last third
    contact_frames = frames[2 * len(frames) // 3 :]
    nose_ys, hip_xs_c = [], []
    for f in contact_frames:
        nose = get_kp(f, "nose")
        lh = get_kp(f, "left_hip")
        rh = get_kp(f, "right_hip")
        if nose:
            nose_ys.append(nose[1])
        if lh and rh:
            hip_xs_c.append((lh[0] + rh[0]) / 2)
    balance_score = 65
    nose_range = (max(nose_ys) - min(nose_ys)) if nose_ys else None
    # Also factor in pre-computed head stability if available
    if head_stability_score is not None and head_stability_score < 30:
        balance_score = min(balance_score, 45)  # cap at 45 if head stability is very poor
    elif head_stability_score is not None and head_stability_score < 50:
        balance_score = min(balance_score, 60)  # cap at 60 if head stability is poor
    if len(nose_ys) >= 3:
        if nose_range < 0.04:
            balance_score += 12
        elif nose_range < 0.07:
            balance_score += 0
        elif nose_range < 0.10:
            balance_score -= 15
        else:
            balance_score -= 25
    if len(hip_xs_c) >= 3:
        movement = hip_xs_c[-1] - hip_xs_c[0]
        if movement > 0.01:
            balance_score += 8
        elif movement < -0.02:
            balance_score -= 8
    balance_score = max(0, min(100, balance_score))

    # OVERALL — weighted average with drag-down penalty
    scores = {
        "stance": round(stance_score),
        "load": round(load_score),
        "power_position": round(power_score),
        "slot": round(slot_score),
        "balance_at_contact": round(balance_score),
    }
    base_overall = round(
        scores["stance"] * 0.15
        + scores["load"] * 0.20
        + scores["power_position"] * 0.25
        + scores["slot"] * 0.25
        + scores["balance_at_contact"] * 0.15
    )
    min_score = min(scores.values())
    if min_score < 45:
        base_overall = min(base_overall, 58)
    elif min_score < 55:
        base_overall = min(base_overall, 65)
    scores["overall"] = base_overall
    scores["_debug_nose_range"] = round(nose_range, 4) if nose_ys else -1
    return scores


def analyze_with_claude(
    keypoint_data: dict,
    player_profile: dict,
    analysis_id: str | None = None,
    previous_swing: dict | None = None,
    swing_metrics: str = "",
    core_5_scores: dict | None = None,
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
    if not swing_metrics:
        swing_metrics = compute_swing_metrics(keypoint_data.get("frames", []))

    core_5_block = ""
    if core_5_scores:
        core_5_block = f"""COMPUTED CORE 5 SCORES (use these to anchor your evaluation):
Stance: {core_5_scores['stance']}/100
Load: {core_5_scores['load']}/100
Slot: {core_5_scores['slot']}/100
Balance at Contact: {core_5_scores['balance_at_contact']}/100

NOTE: Power Position score is not included — evaluate it qualitatively from the keypoint data. Look for: stride foot gaining ground, hands back with bat tip at stride landing, hips slightly leading hands before firing.

"""

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
        f"{swing_metrics}\n\n"
        f"{core_5_block}"
        f"And here is the raw keypoint data for additional reference:\n\n"
        f"{keypoint_summary}\n\n"
        f"{prev_block}"
        f"Before responding, verify: (1) overall_summary leads with a genuine positive observation from the data, "
        f"(2) drill has all three parts — why + steps with rep count + feel cue, "
        f"(3) no raw metric numbers appear in overall_summary or drill text. "
        f"Then respond with the JSON structure specified."
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


class ProgressCoachRequest(BaseModel):
    user_id: str
    swings: list[dict]  # list of recent analyses with scores and dates
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

        swing_metrics_text = compute_swing_metrics(keypoint_data["frames"])
        _log(f"[Core5Debug] first frame keys: {list(keypoint_data['frames'][0].keys())}")
        _log(
            f"[Core5Debug] timestamp_ms sample: {keypoint_data['frames'][0].get('timestamp_ms', 'NOT FOUND')}"
        )
        head_stability = calculate_head_stability(keypoint_data["frames"])
        _log(f"[Analyze] head_stability_score={head_stability}")

        core_5_scores = compute_core_5(
            keypoint_data["frames"], head_stability_score=head_stability
        )
        _log(f"[Analyze] core_5_scores={core_5_scores}")

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
            swing_metrics=swing_metrics_text,
            core_5_scores=core_5_scores,
        )

        if head_stability is not None:
            ss = coaching_output.get("similarity_scores")
            if not isinstance(ss, dict):
                ss = {}
                coaching_output["similarity_scores"] = ss
            ss["head_stability"] = head_stability

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


@app.post("/progress-coach")
async def progress_coach(request: ProgressCoachRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    _log(
        f"[ProgressCoach] user_id={request.user_id} swings={len(request.swings)}"
    )

    profile = request.player_profile
    name = profile.get("first_name", "Player")
    age = profile.get("age", 15)
    experience = profile.get("experience_level", "")

    # Build swing trend summary for Claude
    swing_summaries = []
    for i, swing in enumerate(request.swings):
        scores = swing.get("similarity_breakdown", {}) or {}
        date = (swing.get("created_at", "") or "")[:10]
        overall = scores.get("overall", 0)
        swing_summaries.append(
            f"Swing {i + 1} ({date}): overall={overall}, "
            f"hip_rotation={scores.get('hip_rotation', 0)}, "
            f"weight_transfer={scores.get('weight_transfer', 0)}, "
            f"bat_path={scores.get('bat_path', 0)}, "
            f"contact={scores.get('contact_point', 0)}, "
            f"head_stability={scores.get('head_stability', 0)}"
        )

    # Compute trends
    def trend(metric: str):
        vals = [
            (s.get("similarity_breakdown") or {}).get(metric, 0)
            for s in request.swings
            if s.get("similarity_breakdown")
        ]
        vals = [v for v in vals if v > 0]
        if len(vals) < 2:
            return None, None
        change = vals[-1] - vals[0]
        avg = sum(vals) / len(vals)
        return round(change), round(avg)

    metrics = [
        "hip_rotation",
        "weight_transfer",
        "bat_path",
        "contact_point",
        "head_stability",
    ]
    trend_lines = []
    most_improved = None
    most_improved_change = 0
    most_stuck = None
    most_stuck_avg = 100

    for m in metrics:
        change, avg = trend(m)
        if change is None:
            continue
        label = m.replace("_", " ")
        if change >= 3:
            trend_lines.append(f"{label}: improving (+{change} points)")
            if change > most_improved_change:
                most_improved = label
                most_improved_change = change
        elif change <= -3:
            trend_lines.append(f"{label}: declining ({change} points)")
        else:
            trend_lines.append(f"{label}: holding steady ({change:+d} points)")
        if avg is not None and avg < most_stuck_avg and avg > 0:
            most_stuck = label
            most_stuck_avg = avg

    system_prompt = """You are an elite baseball hitting coach giving a player their weekly progress update. Use Darian's coaching voice — warm, direct, specific, dugout coach energy.

RULES:
- 2-3 sentences maximum — this is a card not an essay
- Lead with something genuinely positive if the data supports it
- Name the one metric that improved most specifically
- Name the one thing to focus on next
- End with one forward-looking sentence that connects to real hitting
- Use Darian's vocabulary: balance point, stay connected, hips first, let it travel, power position
- Never use: kinetic chain, biomechanical, posterior weight shift, analysis indicates
- Sound like a coach texting after practice not writing a report

Respond in JSON only:
{
  "summary": "string — 2-3 sentence progress summary in Darian voice",
  "most_improved": "string or null — metric name in plain English",
  "focus_next": "string — one thing to work on this week in plain English",
  "swings_analyzed": number,
  "best_overall": number
}"""

    user_message = f"""Player: {name}, Age: {age}, Experience: {experience}

Swing history ({len(request.swings)} swings analyzed, oldest to newest):
{chr(10).join(swing_summaries)}

Computed trends:
{chr(10).join(trend_lines) if trend_lines else "Not enough data for trends"}

Most improved metric: {most_improved or "none yet"}
Lowest average metric (needs most work): {most_stuck or "none yet"}

Write a short encouraging progress update in Darian's voice."""

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
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
        _log("[ProgressCoach] Failed to parse Claude response as JSON")
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
