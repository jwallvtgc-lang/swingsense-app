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
import uuid
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
_log(f"[Startup] SUPABASE_URL={'set' if os.environ.get('SUPABASE_URL') else 'NOT SET'}")
_log(
    f"[Startup] SUPABASE_SERVICE_KEY={'set' if os.environ.get('SUPABASE_SERVICE_KEY') else 'NOT SET'}"
)
_log(f"[Startup] SUPABASE_ANON_KEY={'set' if os.environ.get('SUPABASE_ANON_KEY') else 'NOT SET'}")
_trace_key = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or
    os.environ.get("SUPABASE_SERVICE_KEY") or
    os.environ.get("SUPABASE_ANON_KEY") or
    ""
)
_log(f"[Startup] CoachingTrace key resolved: ...{_trace_key[-10:] if len(_trace_key) >= 10 else '(too short)'}")

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


async def write_coaching_trace(
    user_id: str | None,
    swing_id: str | None,
    call_type: str,
    experience_level: str | None,
    computed_metrics: dict | None,
    full_prompt: str,
    raw_response: str,
    parsed_response: dict | None,
    latency_ms: int,
    model_version: str,
    prompt_version: str,
) -> None:
    """Write a coaching trace record to Supabase for quality tracking."""
    SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    SUPABASE_KEY = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or
        os.environ.get("SUPABASE_SERVICE_KEY") or
        os.environ.get("SUPABASE_ANON_KEY")
    )

    if not SUPABASE_URL or not SUPABASE_KEY:
        _log("[CoachingTrace] WARNING: Missing Supabase config, skipping trace write")
        return

    try:
        parsed_primary_issue = None
        parsed_cue = None
        parsed_drill = None
        parsed_summary = None

        if parsed_response and isinstance(parsed_response, dict):
            if call_type == "main_analysis":
                parsed_primary_issue = parsed_response.get("primary_mechanical_issue", {}).get("title")
                parsed_drill = parsed_response.get("drill")
                parsed_summary = parsed_response.get("overall_summary")
            elif call_type == "drill_coach":
                parsed_cue = parsed_response.get("response_text")
                parsed_drill = parsed_response.get("adjusted_drill")
            elif call_type == "progress_coach":
                parsed_summary = parsed_response.get("summary")

        payload = {
            "user_id": user_id,
            "swing_id": swing_id,
            "call_type": call_type,
            "experience_level": experience_level,
            "computed_metrics": computed_metrics,
            "full_prompt": full_prompt,
            "raw_response": raw_response,
            "parsed_primary_issue": parsed_primary_issue,
            "parsed_cue": parsed_cue,
            "parsed_drill": parsed_drill,
            "parsed_summary": parsed_summary,
            "latency_ms": latency_ms,
            "model_version": model_version,
            "prompt_version": prompt_version,
        }

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        trace_url = f"{SUPABASE_URL}/rest/v1/coaching_traces"
        def _mask(v: str) -> str:
            return f"{v[:5]}...{v[-5:]}" if len(v) >= 10 else v[:5] + "..."
        masked_headers = {k: _mask(v) for k, v in headers.items()}
        _log(f"[CoachingTrace] POST {trace_url} headers={masked_headers}")
        payload_preview = json.dumps(payload)[:200]
        _log(f"[CoachingTrace] body={payload_preview}")

        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.post(
                trace_url,
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()

        _log(f"[CoachingTrace] Logged {call_type}: {latency_ms}ms model={model_version} prompt={prompt_version}")
    except Exception as e:
        _log(f"[CoachingTrace] ERROR writing trace: {e}")


# ── Claude Analysis ──────────────────────────────────────────────

# Increment on every prompt change. Logged in coaching_traces for quality tracking.
# v1.2 — Darian scoring rubric, disrupters, mechanic language
MAIN_ANALYSIS_PROMPT_VERSION = "v1.2"
# v1.1: mechanic hierarchy, drill library, score calibration, leads with positives
# v1.0: Initial production prompt with Darian's Core 5 mechanics framework

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

CAUSAL CHAIN RULE:
When both slot and balance_at_contact are low, identify which is causing the other.
If hand drop is present — wrists falling below the back shoulder during the load phase \
— coach the hand drop as the primary issue. Hand drop is upstream: it causes the \
shoulder to drop, which steepens the barrel, which forces the body to compensate at \
contact and create balance issues. Fix the hands and balance often self-corrects.
Never coach balance when hand drop is the root cause.

---

MECHANIC PRIORITY HIERARCHY

Tier 1 — Core mechanics (evaluate first, in this order):
  1. Starting stance
  2. Load (hip and hand load sequence)
  3. Power position (hands back, on toes, hitter's stretch)
  4. Slot (back knee + back elbow driving forward)
  5. Balance at contact (judged AT contact, not after swing finishes)

Tier 2 — Advanced mechanics (only target if ALL Tier 1 mechanics are present):
  Bat tip → Stride orientation → Head stability → Bat lag →
  Extension through contact → Wrist flick → Knee roll → Hip shift

RULE: Never identify a Tier 2 mechanic as the primary issue if any Tier 1 mechanic \
is missing or below threshold. Head stability is always a Tier 2 mechanic.

---

DISRUPTERS — check for these before identifying the primary issue:

- Hand cast: hands push away from chest toward opposite batter's box, creating a rounded swing
- Roll over: wrists rolling over before or after contact
- Lack of direction: front shoulder, point of hip, or stride foot pulling away before/after contact
- Head instability: head turning, yanking, sideways, or falling before or after contact
- Lack of palm up palm down: incorrect hand orientation at contact
- Shoulder yank: front shoulder pulling to side before or at contact
- Barrel drop at slot: barrel pushing away from torso as slot starts
- Not gaining ground / over striding: disrupts slot and bat path
- Eyes pull: eyes looking past contact or head yanking as contact starts
- Shoulder drop: back shoulder dropping before slot starts

RULE: If a disrupter is present, it takes priority as the primary issue over any core \
mechanic score. If multiple disrupters are present, identify the one most disrupting \
the swing sequence.

---

WHAT TO EVALUATE IN EACH CORE MECHANIC:

STANCE:
Balance through the center of the body. Head up-right, both eyes addressing the pitcher. \
Feet one step outside shoulder width, toes in line facing opposite batter's box. \
Bat at 45 degree angle, elbows at 90 degrees creating a diamond shape. Weight over heels, knees flexed.

LOAD:
Hip load shifts center of gravity over back leg — stacking the weight. \
Hand load tethered to stride — as foot strike approaches, hands still loading to power position. \
Stride gains ground at foot strike. Hip stack initiates momentum shift to stride foot.

POWER POSITION (most commonly missed):
Top hand in punching posture. Lower half grounded at stride landing — \
weight over back leg, on toes, lower half tense ready to create torque. \
Does the stride foot gain ground forward? Are the hands back with bat tip as the stride foot hits? \
Could this player absorb someone trying to tackle them in that position?
Good power position: player is coiled, lower half tense, hips slightly leading, hands back.
Weak power position: player fires too quickly, no hitter's stretch, upper and lower body in sync too early.

SLOT:
Back elbow and back knee pinching forward simultaneously. \
Bottom hand and front elbow working toward contact. Back elbow toward rib cage, \
back knee pinches inward. All in sequence with lower half momentum shift. \
Knob traveling A to C — straight path to contact, no loop.
Hand drop before swing initiation: if the hands fall below the back shoulder before \
the forward move starts, this is a slot/load issue — the hands need to stay up with \
the barrel above the ball until the last second before contact. \
Cue: 'Attack from the top. Keep your barrel above the ball until contact — \
above, above, above, then create the angle right at contact.'

BALANCE AT CONTACT:
Balance maintained through all sequences: hip load → hand load → stride → power position \
→ slot → extension. Extension is the last 30% of the swing. Contact at 70% of swing arc, \
arms and wrists follow through to create backspin.
IMPORTANT: Evaluate balance AT the moment of contact only — not what happens after. \
A player who is balanced at contact but falls off in the follow-through should NOT \
be penalized for balance. Freeze the player at contact — are the feet in line \
(toe to toe from starting stance to stride landing)? If yes, balance at contact is solid.

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

OUTPUT STRUCTURE — REQUIRED ORDER

1. WHAT'S WORKING (required, before any criticism):
   Identify every core mechanic that is present and working correctly.
   Name them specifically. Minimum 2 positives even for low-scoring swings.
   Use Darian's language: "Your load sequence is on point", \
   "Power position hands are back", "Hip rotation fired through contact"

2. PRIMARY ISSUE (one only):
   The single most important thing to fix, selected per the mechanic hierarchy above.
   One sentence: what is wrong and why it matters.

3. FEEL CUE (one only):
   What the player should feel, not what they did wrong.
   Connect to physical sensation. Example: "Feel like you could absorb a tackle \
   in that position" not "keep your hands back".

4. DRILL:
   Selected from the drill library above. Named explicitly. 3-5 steps. \
   One success cue at the end.

---

DRILL SELECTION RULES

Select the drill that directly addresses the identified primary issue.
Use these mappings:

Power position weak → Post stride drill, Drop step drill
Hands dropping / shoulder drop → Rest bat on shoulder drill, Top hand drill
Head movement / eye instability → Point of focus drill, High tee work (middle-high)
Gliding / weight forward / no hip load → Post stride drill, Drop step drill
Rounded swing / no bat lag / early extension → Curtain swing, Split grip drill, Rope bat, One hand bottom tee
Balance falling off after contact → Freeze drill (hold finish 3 seconds)
Slot missing / front arm locking out → Elbow jab drill, Inside corner tee work

Name the drill explicitly. Give 3-5 steps maximum. End with one success cue.
Do not invent drills. Do not combine multiple drills into one instruction.

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

EXAMPLE 3 — 7yo Coach Pitch, Right-handed, Darian score: 68
What Darian saw working: Starting stance good, hand load and stride good, knee roll \
and hip rotation good, core mechanics almost all present, slot is pretty good although \
hands slightly low.
Primary issue Darian identified: Hands dropping below the back shoulder before the \
swing starts. Back shoulder dropping with the hands. Creates a long slow swing and \
forces extension to go upward at contact. Secondary: eyes/head sliding away from \
looking down at contact.
Feel cue: Attack from the top. Keep the barrel above the ball until contact — above, \
above, above, then create the angle right at contact. Keep your right hand above the \
shoulder at the start of the swing. Feel like you are swinging down toward the ball \
like an ax chopping wood.
Drills: (1) Rest bat on shoulder, take 50% swing to tee — shoulder gives a barrier \
keeping hands up and barrel above ball. (2) Top hand only drill — choke up or use \
smaller bat, right hand only, take the swing in a straight line slightly down to the ball.
App score: 55 (Darian: 68 — 13 points off)
App quality: 6/10 — improvement from previous. Got 90% of action plan right.
App mistake to avoid: Primary issue was hands dropping (slot/load), NOT balance at \
contact. App correctly noted balance issue but it was secondary and happened AFTER \
contact in the follow-through, not AT contact. Freeze the player at contact to \
evaluate balance — at contact this player was balanced. Also never say 'get on your \
front side' or 'feel weight on your front foot' — weight stays mostly back until \
contact, landing light on the stride foot.

---

SCORING RUBRIC

Core mechanics — 10 points each (max 50 total):
  Starting stance: 10
  Load: 10
  Power Position: 10
  Slot: 10
  Balance at contact: 10

Advanced mechanics — 5 points each (max 50 total):
  Bat tip: 5
  Connected stride: 5
  Wrist flick / full extension: 5
  Stride foot orientation: 5
  Perfect load sequence: 5
  Knee roll: 5
  Rebound: 5
  Bat lag: 5
  Hip shift: 5
  On toes at power position: 5

SCORING RULES:
- All ages and experience levels have a max score of 100
- Ages 5-13: award max advanced mechanic points (5 per mechanic) regardless of core mechanic issues
- Ages 14+: if any core mechanic is missing OR a disrupter is present, advanced mechanic max = 3
- If any core mechanic scores 4 or less: advanced mechanic max = 3

SCORE INDEPENDENCE — REQUIRED:
Each sub-score must be computed independently for that mechanic. Do not anchor sub-scores \
to overall. A player can have excellent head stability and weak power position simultaneously \
— that variance is correct. Clustered scores where all sub-scores fall within 5 points \
of each other are almost always wrong.

HEAD STABILITY: Use the pre-computed head stability score from the user message. Do not \
compute your own.

RULE: Balance at contact is judged at the moment of contact only. \
Weight falling off AFTER the swing is complete does not count against the score.

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
    # Note: hip X-width is NOT used — from a side-angle camera, left/right hip X
    # coordinates are nearly identical (~0.01–0.02), always below any useful threshold.
    # Knee bend Y-ratio and hip height are viewpoint-independent and reliable from the side.
    setup_frames = frames[: max(2, len(frames) // 5)]
    knee_bends, hip_crouch = [], []
    for f in setup_frames:
        lh = get_kp(f, "left_hip")
        rh = get_kp(f, "right_hip")
        lk = get_kp(f, "left_knee")
        rk = get_kp(f, "right_knee")
        la = get_kp(f, "left_ankle")
        ra = get_kp(f, "right_ankle")

        # Knee bend: (knee_y - hip_y) / (ankle_y - hip_y)
        # 0 = locked straight, ~0.50 = good athletic flex, >0.80 = extreme bend
        # Uses Y-axis only — works from any camera angle
        if lk and lh and la:
            total = abs(la[1] - lh[1])
            if total > 0:
                knee_bends.append(abs(lk[1] - lh[1]) / total)
        if rk and rh and ra:
            total = abs(ra[1] - rh[1])
            if total > 0:
                knee_bends.append(abs(rk[1] - rh[1]) / total)

        # Hip crouch depth: hip_y / ankle_y
        # Higher ratio = hips lower in frame = more athletic crouch
        # Typical batting stance: 0.60–0.80. Below 0.55 = standing too tall.
        if lh and la and la[1] > 0:
            hip_crouch.append(lh[1] / la[1])
        elif rh and ra and ra[1] > 0:
            hip_crouch.append(rh[1] / ra[1])

    stance_score = 62

    # Primary: knee flex (both legs averaged when available)
    if knee_bends:
        avg = sum(knee_bends) / len(knee_bends)
        if 0.35 <= avg <= 0.70:
            stance_score += 16  # good athletic flex
        elif 0.25 <= avg < 0.35 or 0.70 < avg <= 0.82:
            stance_score += 4   # some flex present
        elif avg < 0.20 or avg > 0.85:
            stance_score -= 12  # legs nearly locked or extreme crouch
        # Additional penalty: no proper athletic knee bend at all
        if avg < 0.25 or avg > 0.75:
            stance_score -= 15

    # Secondary: hip height as crouch-depth proxy
    if hip_crouch:
        avg = sum(hip_crouch) / len(hip_crouch)
        if 0.60 <= avg <= 0.80:
            stance_score += 8   # hips in athletic position
        elif avg < 0.52:
            stance_score -= 8   # standing too tall — hips too high

    # Tertiary: head stability at setup — unstable head = no set stance
    nose_ys = [get_kp(f, "nose")[1] for f in setup_frames if get_kp(f, "nose")]
    if len(nose_ys) >= 3 and (max(nose_ys) - min(nose_ys)) > 0.05:
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

    power_score = 65  # default — not enough data

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
                power_score = 85
            elif gap_ms >= 280:
                power_score = 72
            elif gap_ms >= 180:
                power_score = 58
            elif gap_ms >= 80:
                power_score = 48
            else:
                power_score = 35  # under 80ms — truly instant firing

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

    # Hand height check — wrists should stay at or above back shoulder during load
    wrist_drops = []
    for f in frames[: len(frames) // 2]:  # first half (load phase)
        lw = get_kp(f, "left_wrist")
        rw = get_kp(f, "right_wrist")
        ls = get_kp(f, "left_shoulder")
        rs = get_kp(f, "right_shoulder")
        wrist = lw or rw
        shoulder = ls or rs
        if wrist and shoulder:
            # Y increases downward, so wrist Y > shoulder Y means wrist is below shoulder
            drop = wrist[1] - shoulder[1]
            wrist_drops.append(drop)

    if len(wrist_drops) >= 3:
        avg_drop = sum(wrist_drops) / len(wrist_drops)
        if avg_drop > 0.08:  # wrists significantly below shoulders
            slot_score -= 20  # major hand drop
        elif avg_drop > 0.04:  # wrists slightly below shoulders
            slot_score -= 10  # minor hand drop

    slot_score = max(0, min(100, slot_score))

    # BALANCE AT CONTACT — lateral body control through the contact zone
    # Measures hip weight transfer forward and shoulder stability.
    # Does NOT use nose vertical movement — head bobs during any swing (that's head_stability).
    # Darian's definition: "finishing through the ball, not pulling off" = lateral X-axis control.
    contact_start = int(len(frames) * 0.55)
    contact_end = int(len(frames) * 0.90)
    contact_frames = frames[contact_start:contact_end] or frames[2 * len(frames) // 3:]

    hip_xs_c, shoulder_xs_c = [], []
    for f in contact_frames:
        lh = get_kp(f, "left_hip")
        rh = get_kp(f, "right_hip")
        ls = get_kp(f, "left_shoulder")
        rs = get_kp(f, "right_shoulder")
        if lh and rh:
            hip_xs_c.append((lh[0] + rh[0]) / 2)
        if ls and rs:
            shoulder_xs_c.append((ls[0] + rs[0]) / 2)

    balance_score = 65

    # Primary: hip forward drive through contact
    # Hips moving forward = weight transferring through the ball (good)
    # Hips stalling or reversing = bailing / pulling off (bad)
    if len(hip_xs_c) >= 3:
        movement = hip_xs_c[-1] - hip_xs_c[0]
        if movement > 0.04:
            balance_score += 15  # strong weight transfer through contact
        elif movement > 0.015:
            balance_score += 8   # moderate forward drive
        elif movement < -0.03:
            balance_score -= 20  # hips reversing — pulling off the ball
        elif movement < -0.01:
            balance_score -= 10

    # Secondary: shoulder lateral stability
    # Shoulders rotating through = good; front shoulder yanking away = pulling off
    if len(shoulder_xs_c) >= 3:
        drift = shoulder_xs_c[-1] - shoulder_xs_c[0]
        if drift > 0.03:
            balance_score += 8   # shoulders driving through contact
        elif drift < -0.04:
            balance_score -= 12  # front shoulder pulling off early

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
    return scores


async def analyze_with_claude(
    keypoint_data: dict,
    player_profile: dict,
    user_id: str | None = None,
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
        core_5_block = f"""
COMPUTED CORE 5 MECHANICS (use these to anchor your evaluation — do not override without strong keypoint evidence):
Stance: {core_5_scores['stance']}/100
Load: {core_5_scores['load']}/100
Slot: {core_5_scores['slot']}/100
Balance at Contact: {core_5_scores['balance_at_contact']}/100
Overall (weighted): {core_5_scores['overall']}/100

Power Position: evaluate qualitatively from keypoint data — look for stride foot gaining ground, hands back with bat tip at stride landing, hips slightly leading hands before firing.

The lowest scoring mechanic above is the most likely primary issue. Use overall score as your anchor for similarity_scores.overall — stay within 8 points of it unless keypoint data strongly contradicts it.

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

    # Build full prompt for tracing
    full_prompt = f"SYSTEM:\n{SYSTEM_PROMPT}\n\nUSER:\n{user_message}"

    # Time the Claude API call
    start_time = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    latency_ms = round((time.time() - start_time) * 1000)

    result_text = response.content[0].text

    try:
        parsed_result = json.loads(result_text)
    except json.JSONDecodeError:
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed_result = json.loads(result_text[start:end])
        else:
            parsed_result = None
            raise HTTPException(status_code=500, detail="Failed to parse Claude response as JSON")

    return parsed_result


# ── Drill Selector ────────────────────────────────────────────────

DRILL_SELECTOR_PROMPT_VERSION = "drill_selector_v1.0"
# v1.0: Initial drill selector — picks best library drill for player's specific mechanical issue

_MECHANIC_KEYWORDS: list[tuple[str, list[str]]] = [
    ("Stance", ["stance", "setup", "posture", "athletic position", "foot width"]),
    ("Load & Stride", ["load", "stride", "timing", "hand load", "hip load"]),
    ("Power Position", ["power position", "hip", "coil", "lower half", "hamstring"]),
    ("Slot", ["slot", "path", "barrel", "elbow", "back knee", "knob"]),
    ("Balance/Extension", ["balance", "contact", "finish", "extension", "falling off", "head"]),
]

def _map_issue_to_mechanic(issue_title: str) -> str | None:
    """Map primary_mechanical_issue.title to a Supabase drills.mechanic value."""
    t = issue_title.lower()
    for mechanic, keywords in _MECHANIC_KEYWORDS:
        if any(kw in t for kw in keywords):
            return mechanic
    return None


async def _query_candidate_drills(mechanic: str | None) -> list[dict]:
    """Fetch candidate drills from Supabase. If mechanic is None, returns all drills."""
    SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    SUPABASE_KEY = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    )
    if not SUPABASE_URL or not SUPABASE_KEY:
        _log("[DrillSelector] WARNING: Missing Supabase URL or key — skipping drill query")
        return []

    _log(f"[DrillSelector] Querying drills table mechanic={mechanic!r}")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    # When mechanic is specified, accept drills that match OR have null mechanic (general purpose).
    # PostgREST OR filter syntax: ?or=(col.op.val,col.op.val)
    params: dict[str, str] = {"select": "id,name,mechanic,purpose,focus_points"}
    if mechanic:
        params["or"] = f"(mechanic.eq.{mechanic},mechanic.is.null)"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/drills",
                headers=headers,
                params=params,
            )
            if not resp.is_success:
                _log(f"[DrillSelector] HTTP {resp.status_code} querying drills: {resp.text[:500]}")
                return []
            rows = resp.json()
            if not isinstance(rows, list):
                _log(f"[DrillSelector] Unexpected response type {type(rows).__name__}: {str(rows)[:300]}")
                return []
            _log(f"[DrillSelector] Found {len(rows)} candidate drills (mechanic={mechanic!r})")
            return rows
    except Exception as e:
        _log(f"[DrillSelector] ERROR querying drills: {type(e).__name__}: {e}")
        return []


async def _fetch_full_drill(drill_id: str) -> dict | None:
    """Fetch a full drill record by ID from Supabase."""
    SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    SUPABASE_KEY = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    )
    if not SUPABASE_URL or not SUPABASE_KEY:
        _log("[DrillSelector] WARNING: Missing Supabase config in _fetch_full_drill")
        return None

    _log(f"[DrillSelector] Fetching full drill id={drill_id}")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/drills",
                headers=headers,
                params={
                    "select": "id,name,mechanic,purpose,foundation,setup,focus_points,finish_reminders,video_url",
                    "id": f"eq.{drill_id}",
                    "limit": "1",
                },
            )
            if not resp.is_success:
                _log(f"[DrillSelector] HTTP {resp.status_code} fetching drill {drill_id}: {resp.text[:300]}")
                return None
            rows = resp.json()
            if not isinstance(rows, list):
                _log(f"[DrillSelector] Unexpected fetch response: {str(rows)[:300]}")
                return None
            if not rows:
                _log(f"[DrillSelector] No drill found for id={drill_id}")
                return None
            _log(f"[DrillSelector] Fetched drill: {rows[0].get('name')!r}")
            return rows[0]
    except Exception as e:
        _log(f"[DrillSelector] ERROR fetching full drill {drill_id}: {type(e).__name__}: {e}")
        return None


async def _run_drill_selector(
    issue_description: str,
    mechanic: str | None,
    candidates: list[dict],
    user_id: str | None,
    swing_id: str | None,
    player_profile: dict,
) -> str | None:
    """Call Claude to select the best drill from candidates. Returns drill_id or None."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key or not candidates:
        return None

    drill_list_text = "\n".join(
        f"- id: {d['id']}\n  name: {d['name']}\n  purpose: {d.get('purpose', '')}\n  focus_points: {d.get('focus_points', '')}"
        for d in candidates
    )

    system_prompt = "You are a baseball coaching assistant. Respond only with valid JSON."
    user_message = (
        f"A player's swing analysis identified this specific issue:\n\n"
        f"\"{issue_description}\"\n\n"
        f"The primary mechanic affected is: {mechanic or 'general'}\n\n"
        f"Here are the available drills for this mechanic:\n\n{drill_list_text}\n\n"
        f"Select the single drill that best addresses the player's specific issue. "
        f"Consider the purpose and focus points of each drill against the issue description. "
        f"Return only a JSON object: {{\"drill_id\": \"uuid\"}}"
    )

    full_prompt = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_message}"
    client = Anthropic(api_key=api_key)
    _log(f"[DrillSelector] Calling Claude with {len(candidates)} candidates")

    start_time = time.time()
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=128,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        latency_ms = round((time.time() - start_time) * 1000)
        result_text = response.content[0].text.strip()
        _log(f"[DrillSelector] Claude raw response ({latency_ms}ms): {result_text[:200]}")

        parsed: dict | None = None
        try:
            parsed = json.loads(result_text)
        except json.JSONDecodeError:
            start = result_text.find("{")
            end = result_text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    parsed = json.loads(result_text[start:end])
                except json.JSONDecodeError:
                    _log(f"[DrillSelector] Could not parse JSON from: {result_text[:200]}")

        drill_id = parsed.get("drill_id") if parsed else None
        _log(f"[DrillSelector] Parsed drill_id={drill_id!r}")

        # Validate returned ID is in the candidate list
        valid_ids = {d["id"] for d in candidates}
        if drill_id not in valid_ids:
            _log(f"[DrillSelector] drill_id {drill_id!r} not in {len(valid_ids)} candidates — using first")
            drill_id = candidates[0]["id"] if candidates else None

        try:
            await write_coaching_trace(
                user_id=user_id,
                swing_id=swing_id,
                call_type="drill_selector",
                experience_level=player_profile.get("experience_level"),
                computed_metrics=None,
                full_prompt=full_prompt,
                raw_response=result_text,
                parsed_response=parsed,
                latency_ms=latency_ms,
                model_version="claude-sonnet-4-6",
                prompt_version=DRILL_SELECTOR_PROMPT_VERSION,
            )
        except Exception as e:
            _log(f"[DrillSelector] ERROR writing trace: {e}")

        return drill_id
    except Exception as e:
        _log(f"[DrillSelector] ERROR calling Claude: {e}")
        return None


async def select_drill_for_analysis(
    primary_issue_title: str,
    primary_issue_description: str,
    user_id: str | None,
    swing_id: str | None,
    player_profile: dict,
) -> dict | None:
    """
    Full drill selection flow: map mechanic → query candidates → call drill_selector → fetch full drill.
    Returns the selected drill record, or None on any failure.
    """
    mechanic = _map_issue_to_mechanic(primary_issue_title)
    _log(f"[DrillSelector] mechanic={mechanic!r} for issue={primary_issue_title!r}")

    candidates = await _query_candidate_drills(mechanic)
    if not candidates:
        _log("[DrillSelector] No candidates found, falling back to all drills")
        candidates = await _query_candidate_drills(None)

    if not candidates:
        _log("[DrillSelector] No drills in library, skipping")
        return None

    drill_id = await _run_drill_selector(
        issue_description=primary_issue_description,
        mechanic=mechanic,
        candidates=candidates,
        user_id=user_id,
        swing_id=swing_id,
        player_profile=player_profile,
    )

    if not drill_id:
        # Fall back to first candidate
        drill_id = candidates[0]["id"]
        _log(f"[DrillSelector] No drill_id from Claude, using fallback {drill_id}")

    full_drill = await _fetch_full_drill(drill_id)
    if full_drill:
        _log(f"[DrillSelector] Selected drill: {full_drill.get('name')!r}")
    return full_drill


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
    front_facing: bool = False


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


class PersonalBestRequest(BaseModel):
    user_id: str
    swing_id: str
    new_score: int
    previous_best: int | None
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


@app.post("/admin/backfill-core5")
async def backfill_core5():
    SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "") or os.environ.get(
        "SUPABASE_SERVICE_KEY", ""
    )

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY",
        )

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    base = f"{SUPABASE_URL}/rest/v1"

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(
            f"{base}/swing_analyses",
            headers=headers,
            params={"select": "id,keypoint_data", "limit": "1000"},
        )
        resp.raise_for_status()
        swings = resp.json()

    backfilled = 0
    skipped = 0
    errors = 0

    async with httpx.AsyncClient(timeout=120.0) as client:
        for swing in swings:
            swing_id = swing["id"]
            keypoint_data = swing.get("keypoint_data")
            if not keypoint_data:
                skipped += 1
                continue
            frames = keypoint_data.get("frames", [])
            if len(frames) < 20:
                skipped += 1
                continue
            try:
                scores = compute_core_5(frames)
                patch_resp = await client.patch(
                    f"{base}/swing_analyses",
                    headers=headers,
                    params={"id": f"eq.{swing_id}"},
                    json={
                        "stance_score": scores["stance"],
                        "load_score": scores["load"],
                        "power_position_score": scores["power_position"],
                        "slot_score": scores["slot"],
                        "balance_at_contact_score": scores["balance_at_contact"],
                        "core5_overall": scores["overall"],
                    },
                )
                patch_resp.raise_for_status()
                backfilled += 1
            except Exception as e:
                errors += 1
                _log(f"[Backfill] ERR {swing_id}: {e}")

    return {"backfilled": backfilled, "skipped": skipped, "errors": errors}


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

        # Mirror X coordinates for front-facing camera
        if request.front_facing:
            _log("[Analyze] Mirroring X coordinates for front-facing camera")
            for frame in keypoint_data["frames"]:
                for kp in frame["keypoints"].values():
                    kp["x"] = 1.0 - float(kp["x"])
        if len(keypoint_data["frames"]) < 30:
            _log(
                "[Analyze] WARNING: Low frame count — metrics will be unreliable. Video may be too short or wrong format."
            )

        validate_swing_video(keypoint_data)

        swing_metrics_text = compute_swing_metrics(keypoint_data["frames"])
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
        coaching_output = await analyze_with_claude(
            keypoint_data,
            profile,
            user_id=request.user_id,
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

        # Select a vetted library drill for the primary mechanical issue
        primary_issue = coaching_output.get("primary_mechanical_issue") or {}
        issue_title = primary_issue.get("title", "")
        issue_desc = primary_issue.get("description", "")
        _log(f"[DrillSelector] primary_issue_title={issue_title!r}")
        if issue_title:
            try:
                selected_drill = await select_drill_for_analysis(
                    primary_issue_title=issue_title,
                    primary_issue_description=issue_desc,
                    user_id=request.user_id,
                    swing_id=request.analysis_id,
                    player_profile=profile,
                )
                coaching_output["selected_drill"] = selected_drill
                _log(f"[DrillSelector] Result: {selected_drill.get('name') if selected_drill else None!r}")
            except Exception as e:
                _log(f"[Analyze] drill_selector failed (non-fatal): {type(e).__name__}: {e}")
                coaching_output["selected_drill"] = None
        else:
            _log("[DrillSelector] No primary issue title — skipping drill selector")
            coaching_output["selected_drill"] = None

        elapsed = time.time() - start_time
        _log(f"[Analyze] Done in {elapsed:.1f}s")

        return {
            "analysis_id": request.analysis_id,
            "keypoint_data": keypoint_data,
            "coaching_output": coaching_output,
            "core_5_scores": core_5_scores,
            "processing_time_seconds": round(elapsed, 1),
            "prompt_version": MAIN_ANALYSIS_PROMPT_VERSION,
            "model_version": "claude-sonnet-4-6",
            "latency_ms": round(elapsed * 1000),
            "computed_metrics": core_5_scores,
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


# DEPRECATED: The initial drill recommendation is now handled by drill_selector (AI-132).
# This endpoint remains for "Did you try this drill?" feedback responses only.
DRILL_COACH_PROMPT_VERSION = "v1.0"
# v1.0: Initial drill follow-up prompt with Darian's coaching voice and feedback response patterns

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

    # Build full prompt for tracing
    full_prompt = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_message}"

    # Time the Claude API call
    start_time = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    latency_ms = round((time.time() - start_time) * 1000)

    result_text = response.content[0].text

    try:
        parsed_result = json.loads(result_text)
    except json.JSONDecodeError:
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed_result = json.loads(result_text[start:end])
        else:
            parsed_result = None
            raise HTTPException(status_code=500, detail="Failed to parse response")

    try:
        await write_coaching_trace(
            user_id=profile.get("user_id"),
            swing_id=request.analysis_id,
            call_type="drill_coach",
            experience_level=profile.get("experience_level"),
            computed_metrics=None,
            full_prompt=full_prompt,
            raw_response=result_text,
            parsed_response=parsed_result,
            latency_ms=latency_ms,
            model_version="claude-sonnet-4-6",
            prompt_version=DRILL_COACH_PROMPT_VERSION,
        )
    except Exception as e:
        _log(f"[drill_followup] Error writing trace: {e}")

    return parsed_result


# Increment on every prompt change. Logged in coaching_traces for quality tracking.
PROGRESS_COACH_PROMPT_VERSION = "v1.0"
# v1.0: Initial progress tracking prompt with Core 5 trend analysis and Darian's coaching language

# Increment on every prompt change. Logged in coaching_traces for quality tracking.
PERSONAL_BEST_PROMPT_VERSION = "v1.0"
# v1.0: Initial personal best celebration prompt for milestone swing achievements

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

    # Build swing trend summary for Claude and calculate best_overall
    swing_summaries = []
    overall_scores = []
    for i, swing in enumerate(request.swings):
        date = (swing.get("created_at", "") or "")[:10]
        stance = swing.get("stance_score", 0) or 0
        load = swing.get("load_score", 0) or 0
        power_pos = swing.get("power_position_score", 0) or 0
        slot = swing.get("slot_score", 0) or 0
        balance = swing.get("balance_at_contact_score", 0) or 0
        overall = swing.get("overall_score", 0) or 0
        if overall > 0:
            overall_scores.append(overall)
        swing_summaries.append(
            f"Swing {i + 1} ({date}): overall={overall}, "
            f"stance={stance}, load={load}, power_position={power_pos}, "
            f"slot={slot}, balance_at_contact={balance}"
        )

    # Calculate best overall score
    best_overall = max(overall_scores) if overall_scores else 0

    # Compute trends
    def trend(metric: str):
        vals = [
            s.get(metric, 0) or 0
            for s in request.swings
            if s.get(metric) is not None
        ]
        vals = [v for v in vals if v > 0]
        if len(vals) < 2:
            return None, None
        change = vals[-1] - vals[0]
        avg = sum(vals) / len(vals)
        return round(change), round(avg)

    metrics = [
        "stance_score",
        "load_score",
        "power_position_score",
        "slot_score",
        "balance_at_contact_score",
    ]
    trend_lines = []
    most_improved = None
    most_improved_change = 0
    most_stuck = None
    most_stuck_avg = 100

    # Map core 5 field names to player-friendly mechanic names
    core5_labels = {
        "stance_score": "Stance",
        "load_score": "Load",
        "power_position_score": "Power Position",
        "slot_score": "Slot",
        "balance_at_contact_score": "Balance at Contact"
    }

    for m in metrics:
        change, avg = trend(m)
        if change is None:
            continue
        label = core5_labels[m]
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

You evaluate based on Darian's CORE 5 MECHANICS in order:
1. Stance — setup, posture, athletic position, balance point
2. Load — hip load back to power position, hands back with bat tip
3. Power Position — lower half loaded, hamstrings engaged, weight on toes, hips slightly leading hands
4. Slot — back knee and back elbow pressing forward, knob working toward contact
5. Balance at Contact — finishing through the ball, not pulling off

RULES:
- 2-3 sentences maximum — this is a card not an essay
- Lead with something genuinely positive if the data supports it
- Name the one core mechanic that improved most specifically (use exact names: Stance, Load, Power Position, Slot, Balance at Contact)
- Name the one core mechanic to focus on next
- End with one forward-looking sentence that connects to real hitting
- Use Darian's vocabulary: balance point, stay connected, hips first, let it travel, power position, rubber band, attack from the top
- Never use: kinetic chain, biomechanical, posterior weight shift, analysis indicates, hip rotation, bat path
- Sound like a coach texting after practice not writing a report

Respond in JSON only:
{
  "summary": "string — 2-3 sentence progress summary in Darian voice",
  "most_improved": "string or null — core mechanic name (Stance, Load, Power Position, Slot, or Balance at Contact)",
  "focus_next": "string — one core mechanic to work on this week (Stance, Load, Power Position, Slot, or Balance at Contact)",
  "swings_analyzed": number
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

    # Build full prompt for tracing
    full_prompt = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_message}"

    # Time the Claude API call
    start_time = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    latency_ms = round((time.time() - start_time) * 1000)

    result_text = response.content[0].text

    try:
        claude_response = json.loads(result_text)
    except json.JSONDecodeError:
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            claude_response = json.loads(result_text[start:end])
        else:
            claude_response = None
            _log("[ProgressCoach] Failed to parse Claude response as JSON")
            raise HTTPException(status_code=500, detail="Failed to parse response")

    try:
        await write_coaching_trace(
            user_id=request.user_id,
            swing_id=None,
            call_type="progress_coach",
            experience_level=profile.get("experience_level"),
            computed_metrics=None,
            full_prompt=full_prompt,
            raw_response=result_text,
            parsed_response=claude_response,
            latency_ms=latency_ms,
            model_version="claude-sonnet-4-6",
            prompt_version=PROGRESS_COACH_PROMPT_VERSION,
        )
    except Exception as e:
        _log(f"[progress_coach] Error writing trace: {e}")

    # Add our computed best_overall to the response
    claude_response["best_overall"] = best_overall
    return claude_response


@app.post("/personal-best")
async def personal_best(request: PersonalBestRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    _log(f"[PersonalBest] user_id={request.user_id} swing_id={request.swing_id} new_score={request.new_score} previous_best={request.previous_best}")

    profile = request.player_profile
    name = profile.get("first_name", "Player")
    age = profile.get("age", 15)
    experience = profile.get("experience_level", "")

    # Determine if this is the first swing or a genuine improvement
    is_first_swing = request.previous_best is None
    improvement_points = 0 if is_first_swing else request.new_score - request.previous_best

    system_prompt = """You are an elite baseball hitting coach celebrating a player's personal best swing. Use Darian's coaching voice — warm, genuinely excited, specific, dugout coach energy.

COACHING VOICE:
- Sound like a coach who just watched their player crush one in practice
- Use Darian's vocabulary: power position, balance point, stay connected, hips first, let it travel, rubber band, attack from the top
- Celebrate the achievement genuinely without being over the top
- Connect the score improvement to real mechanics they must have executed
- End with motivation to keep building on this foundation
- Keep it conversational — like texting after a great practice session

TONE RULES:
- For first swing ever: focus on establishing a baseline, celebrate getting started
- For small improvement (1-5 points): acknowledge steady progress, encourage consistency
- For solid improvement (6-12 points): celebrate the breakthrough, name what clicked
- For major improvement (13+ points): genuine excitement, this is a big moment

BANNED WORDS: biomechanical, kinetic chain, hip-shoulder separation, analysis indicates, suboptimal, metrics, data points

Respond in JSON only:
{
  "celebration_text": "string — 2-3 sentences in Darian voice celebrating the achievement",
  "what_clicked": "string — one specific mechanic improvement that likely drove the score gain (Stance, Load, Power Position, Slot, or Balance at Contact)",
  "keep_building": "string — one encouraging sentence about maintaining this momentum"
}"""

    # Build context based on whether it's first swing or improvement
    if is_first_swing:
        context = f"This is {name}'s very first swing analysis — establishing their baseline score of {request.new_score}."
        tone_instruction = "Welcome them to the journey. This score is their starting point, not a judgment. Focus on the fact that they're now getting real feedback on their mechanics."
    else:
        context = f"{name} just improved from {request.previous_best} to {request.new_score} (+{improvement_points} points)."
        if improvement_points <= 5:
            tone_instruction = "Acknowledge the steady progress. Small gains compound into big improvements over time."
        elif improvement_points <= 12:
            tone_instruction = "This is a solid breakthrough. Something clicked mechanically. Celebrate what they did right."
        else:
            tone_instruction = "This is a major jump. Be genuinely excited. This player just had a significant mechanical breakthrough."

    user_message = f"""Player: {name}, Age: {age}, Experience: {experience}

Context: {context}

Instruction: {tone_instruction}

Write a personal best celebration in Darian's coaching voice."""

    client = Anthropic(api_key=api_key)

    # Build full prompt for tracing
    full_prompt = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_message}"

    # Time the Claude API call
    start_time = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    latency_ms = round((time.time() - start_time) * 1000)

    result_text = response.content[0].text

    try:
        parsed_result = json.loads(result_text)
    except json.JSONDecodeError:
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed_result = json.loads(result_text[start:end])
        else:
            parsed_result = None
            raise HTTPException(status_code=500, detail="Failed to parse personal best response")

    try:
        await write_coaching_trace(
            user_id=request.user_id,
            swing_id=request.swing_id,
            call_type="personal_best",
            experience_level=profile.get("experience_level"),
            computed_metrics=None,
            full_prompt=full_prompt,
            raw_response=result_text,
            parsed_response=parsed_result,
            latency_ms=latency_ms,
            model_version="claude-sonnet-4-6",
            prompt_version=PERSONAL_BEST_PROMPT_VERSION,
        )
    except Exception as e:
        _log(f"[personal_best] Error writing trace: {e}")

    return parsed_result


@app.get("/debug/drill-selector")
async def debug_drill_selector():
    """
    Smoke-test the drill selector without running a full analysis.
    Exposes every intermediate value so failures are visible in the response body.
    Safe to call from browser or curl.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    SUPABASE_KEY = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    )
    diag: dict = {
        "anthropic_key_set": bool(api_key),
        "supabase_url_set": bool(SUPABASE_URL),
        "supabase_key_set": bool(SUPABASE_KEY),
        "supabase_url_prefix": SUPABASE_URL[:40] if SUPABASE_URL else None,
        "supabase_key_tail": SUPABASE_KEY[-8:] if len(SUPABASE_KEY) >= 8 else "(too short)",
    }

    # Step 1: query all drills
    all_drills = await _query_candidate_drills(None)
    diag["total_drills_in_table"] = len(all_drills)
    diag["sample_drill_keys"] = list(all_drills[0].keys()) if all_drills else []
    diag["sample_drill_ids"] = [d["id"] for d in all_drills[:3]]

    # Step 2: mechanic-filtered query (OR null)
    slot_drills = await _query_candidate_drills("Slot")
    diag["slot_drill_count"] = len(slot_drills)

    # Step 3: Claude call — done inline so we can capture raw response + any error
    candidates = all_drills[:5]
    diag["candidates_sent_to_claude"] = len(candidates)
    diag["candidate_ids"] = [d["id"] for d in candidates]
    diag["claude_raw_response"] = None
    diag["claude_exception"] = None
    diag["claude_parsed"] = None
    drill_id_from_claude: str | None = None

    if candidates and api_key:
        drill_list_text = "\n".join(
            f"- id: {d['id']}\n  name: {d['name']}\n  purpose: {d.get('purpose', '')}"
            for d in candidates
        )
        system_prompt = "You are a baseball coaching assistant. Respond only with valid JSON."
        user_message = (
            "A player's swing analysis identified this specific issue:\n\n"
            "\"Hands are dropping before the swing fires, losing power at contact\"\n\n"
            "The primary mechanic affected is: Power Position\n\n"
            f"Here are the available drills:\n\n{drill_list_text}\n\n"
            "Return only a JSON object: {\"drill_id\": \"<one of the ids above>\"}"
        )
        try:
            claude_client = Anthropic(api_key=api_key)
            resp = claude_client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=128,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            raw = resp.content[0].text.strip()
            diag["claude_raw_response"] = raw

            parsed: dict | None = None
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                s = raw.find("{")
                e = raw.rfind("}") + 1
                if s >= 0 and e > s:
                    try:
                        parsed = json.loads(raw[s:e])
                    except json.JSONDecodeError:
                        pass
            diag["claude_parsed"] = parsed
            drill_id_from_claude = parsed.get("drill_id") if parsed else None
            diag["drill_id_from_claude"] = drill_id_from_claude
            valid_ids = {d["id"] for d in candidates}
            diag["drill_id_in_candidate_list"] = drill_id_from_claude in valid_ids
        except Exception as exc:
            diag["claude_exception"] = f"{type(exc).__name__}: {exc}"

    # Step 4: fetch full drill (use first candidate as fallback if Claude failed)
    fetch_id = drill_id_from_claude or (candidates[0]["id"] if candidates else None)
    diag["fetch_drill_id"] = fetch_id
    full_drill = await _fetch_full_drill(fetch_id) if fetch_id else None
    diag["full_drill_name"] = full_drill.get("name") if full_drill else None
    diag["full_drill_has_required_fields"] = (
        all(k in (full_drill or {}) for k in ["foundation", "setup", "focus_points", "finish_reminders", "purpose"])
        if full_drill else False
    )

    return diag


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
