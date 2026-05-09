"""
One-time backfill script: populate core5 scores for all historical swing_analyses.
Run with: python backend/backfill_core5.py
"""

import os

import httpx


def compute_core_5(frames: list, head_stability_score=None) -> dict:
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
    return scores


SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

BASE = f"{SUPABASE_URL.rstrip('/')}/rest/v1"


def run_backfill():
    print("Fetching all swing analyses...")
    resp = httpx.get(
        f"{BASE}/swing_analyses",
        headers=HEADERS,
        params={"select": "id,keypoint_data,created_at", "limit": "1000"},
    )
    resp.raise_for_status()
    swings = resp.json()
    print(f"Found {len(swings)} swings to backfill")

    backfilled = 0
    skipped = 0
    errors = 0

    for swing in swings:
        swing_id = swing["id"]
        keypoint_data = swing.get("keypoint_data")

        if not keypoint_data:
            print(f"  SKIP {swing_id} — no keypoint data")
            skipped += 1
            continue

        frames = keypoint_data.get("frames", [])
        if len(frames) < 20:
            print(f"  SKIP {swing_id} — only {len(frames)} frames")
            skipped += 1
            continue

        try:
            scores = compute_core_5(frames)
            patch = httpx.patch(
                f"{BASE}/swing_analyses",
                headers=HEADERS,
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
            patch.raise_for_status()
            print(f"  OK  {swing_id} — overall={scores['overall']}")
            backfilled += 1
        except Exception as e:
            print(f"  ERR {swing_id} — {e}")
            errors += 1

    print()
    print(f"Done. Backfilled: {backfilled} | Skipped: {skipped} | Errors: {errors}")


if __name__ == "__main__":
    run_backfill()
