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

IMPORTANT: You MUST respond with valid JSON only. No markdown, no extra text.

Respond with this exact JSON structure:
{
  "observations": [
    {
      "title": "string",
      "description": "string",
      "type": "strength | improvement"
    }
  ],
  "priority_fixes": [
    {
      "title": "string",
      "description": "string",
      "what_it_should_look_like": "string"
    }
  ],
  "drill_recommendations": [
    {
      "name": "string",
      "description": "string",
      "how_to": "string",
      "targets": "string"
    }
  ],
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
    "overall": number (0-100)
  },
  "overall_summary": "string (2-3 sentences, encouraging, actionable)"
}

Guidelines:
- 3-5 observations covering: hip rotation, weight transfer, elbow position, bat path, contact point
- 1-2 priority fixes with what correct form looks like
- 1-2 drill recommendations
- Bat speed estimate from wrist keypoint velocity
- Similarity scores benchmarked against ideal pro mechanics

NO FRAME NUMBERS — ENFORCED IN ALL SECTIONS:
- Do NOT include any frame numbers or frame ranges (e.g. F100, F128-F183, Frames 10-25) anywhere in \
your output. Users cannot scrub to frames and do not understand them.
- Describe timing using plain language only: "during your load," "as you start your swing," \
"through contact," "when you're driving through the ball," "at the point of contact," etc.
- This applies to: observations (title and description), priority_fixes, drill_recommendations, \
bat_speed_estimate.reasoning, and overall_summary. Never use frame references in any field.

AGE-APPROPRIATE LANGUAGE (use the player's age from the profile):
- Under 16: Use simple words and short sentences. Avoid terms like "hip-shoulder separation," \
"rotational power," "kinetic chain." Use plain-language equivalents (e.g. "hips lead, then shoulders" \
instead of "separation," "using your legs and core" instead of "kinetic chain").
- 18+: You may use more technical terms if they are useful.
- Match tone to age: Younger players — encouraging, coach-like, cues they'd hear at practice. \
Older players — can be more technical if helpful.

BAT SPEED SECTION:
- The "reasoning" field is shown to the user. Use plain language only. Never mention "2D projection," \
"normalized coordinates," "keypoint velocity," or other technical terms. Explain in simple terms \
(e.g. "Based on how fast your hands moved through the zone" or "Estimated from your swing motion").

KEEP IT ACTIONABLE:
- Drills and fixes should be concrete and specific, but described in language the player will understand.
- Be encouraging but honest."""


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


def analyze_with_claude(keypoint_data: dict, player_profile: dict, analysis_id: str | None = None) -> dict:
    """Send keypoints to Claude and get structured coaching output."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    profile_lines = [
        f"Player: {player_profile.get('first_name', 'Player')}",
        f"Age: {player_profile.get('age', 15)}",
        f"Position: {player_profile.get('primary_position', 'Unknown')}",
        f"Batting side: {player_profile.get('batting_side', 'Right')}",
    ]
    if player_profile.get("height_feet"):
        h = f"{player_profile['height_feet']}'{player_profile.get('height_inches', 0)}\""
        profile_lines.append(f"Height: {h}")

    keypoint_summary = summarize_keypoints_for_prompt(keypoint_data, analysis_id)

    user_message = (
        f"Here is the player profile:\n\n"
        f"{chr(10).join(profile_lines)}\n\n"
        f"And here is the keypoint data extracted from their swing video:\n\n"
        f"{keypoint_summary}\n\n"
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

class AnalyzeRequest(BaseModel):
    analysis_id: str
    video_url: str
    user_id: str
    player_profile: dict | None = None


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
        keypoint_data = extract_keypoints(tmp_path, sample_rate=2)
        _log(f"[Analyze] Extracted {len(keypoint_data['frames'])} frames")

        profile = request.player_profile or {}
        _log("[Analyze] Calling Claude with fresh keypoint data...")
        coaching_output = analyze_with_claude(keypoint_data, profile, analysis_id=request.analysis_id)

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
