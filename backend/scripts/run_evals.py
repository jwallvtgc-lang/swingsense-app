"""
AI-114: Eval runner — applies LLM-as-judge to unscored production traces.

Queries coaching_traces for main_analysis records where eval_score IS NULL,
runs each through the eval prompt, and writes eval_score + eval_flags back.

Run:
    cd ~/Desktop/Swingsense-app-local
    ANTHROPIC_API_KEY=sk-ant-... SUPABASE_SERVICE_KEY=... python backend/scripts/run_evals.py
    python backend/scripts/run_evals.py --limit 20

Required env vars:
    ANTHROPIC_API_KEY
    SUPABASE_SERVICE_KEY   (preferred — bypasses RLS)
    SUPABASE_URL           (or EXPO_PUBLIC_SUPABASE_URL)
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Load .env files — try backend first, then repo root
for _candidate in [
    Path(__file__).parent.parent / ".env",
    Path(__file__).parent.parent.parent / ".env",
]:
    if _candidate.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(_candidate, override=False)
        except ImportError:
            pass

import anthropic
import httpx

# Import shared eval prompt and JSON parse helper from eval_prompt.py
sys.path.insert(0, str(Path(__file__).parent))
from eval_prompt import EVAL_PROMPT, EVAL_PROMPT_VERSION


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_LIMIT = 50


def _get_supabase_config() -> tuple[str, str]:
    url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
        or ""
    ).rstrip("/")
    key = (
        os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
        or ""
    )
    return url, key


def _supabase_headers(key: str) -> dict:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------


def fetch_unscored_traces(url: str, key: str, limit: int) -> list[dict]:
    headers = _supabase_headers(key)
    headers.pop("Prefer")  # not needed for GET
    resp = httpx.get(
        f"{url}/rest/v1/coaching_traces",
        headers=headers,
        params={
            "select": "id,experience_level,computed_metrics,parsed_primary_issue,parsed_summary,parsed_drill",
            "eval_score": "is.null",
            "call_type": "eq.main_analysis",
            "limit": str(limit),
            "order": "created_at.desc",
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def write_eval_result(url: str, key: str, trace_id: str, grade: str, flags: dict) -> None:
    headers = _supabase_headers(key)
    resp = httpx.patch(
        f"{url}/rest/v1/coaching_traces",
        headers=headers,
        params={"id": f"eq.{trace_id}"},
        json={
            "eval_score": grade,
            "eval_flags": flags,
        },
        timeout=30.0,
    )
    resp.raise_for_status()


# ---------------------------------------------------------------------------
# Build eval user message from a production trace record
# ---------------------------------------------------------------------------


def _format_computed_metrics(metrics) -> str:
    if not metrics:
        return "No computed metrics available."
    if isinstance(metrics, str):
        try:
            metrics = json.loads(metrics)
        except Exception:
            return str(metrics)

    core5_keys = ["stance", "load", "power_position", "slot", "balance_at_contact"]
    parts = []

    core5 = {k: metrics[k] for k in core5_keys if k in metrics}
    if core5:
        scores = ", ".join(
            f"{k.replace('_', ' ').title()}: {v}" for k, v in core5.items()
        )
        parts.append(f"Core mechanics scores — {scores}")

    advanced_keys = [
        "bat_tip", "head_stability", "bat_lag", "extension",
        "wrist_flick", "knee_roll", "hip_shift", "stride_orientation",
    ]
    advanced = {k: metrics[k] for k in advanced_keys if k in metrics}
    if advanced:
        scores = ", ".join(
            f"{k.replace('_', ' ').title()}: {v}" for k, v in advanced.items()
        )
        parts.append(f"Advanced mechanics scores — {scores}")

    # Include any top-level numeric fields not already covered
    skip = set(core5_keys + advanced_keys + ["similarity_score"])
    extras = {
        k: v for k, v in metrics.items()
        if k not in skip and isinstance(v, (int, float))
    }
    if extras:
        extra_str = ", ".join(f"{k}: {v}" for k, v in extras.items())
        parts.append(f"Other — {extra_str}")

    return " | ".join(parts) if parts else "No structured metrics."


def build_trace_user_message(trace: dict) -> str:
    level = trace.get("experience_level") or "unknown level"
    mechanics = _format_computed_metrics(trace.get("computed_metrics"))
    primary_issue = trace.get("parsed_primary_issue") or "(not recorded)"
    summary = trace.get("parsed_summary") or "(not recorded)"
    drill = trace.get("parsed_drill") or "(not recorded)"

    return (
        f"Please grade this coaching output.\n\n"
        f"SWING CONTEXT\n"
        f"Player: {level}\n"
        f"Mechanics observed: {mechanics}\n\n"
        f"APP OUTPUT\n"
        f"Primary issue identified: {primary_issue}\n"
        f"Overall summary: {summary}\n"
        f"Drill assigned: {drill}\n\n"
        f"Grade this output using the EVALUATION DIMENSIONS. Return JSON only."
    )


# ---------------------------------------------------------------------------
# Grade one trace via Claude
# ---------------------------------------------------------------------------


def grade_trace(client: anthropic.Anthropic, trace: dict) -> dict:
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=EVAL_PROMPT,
        messages=[{"role": "user", "content": build_trace_user_message(trace)}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Run LLM-as-judge evals on unscored coaching traces.")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help=f"Max traces to score (default {DEFAULT_LIMIT})")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    supabase_url, supabase_key = _get_supabase_config()
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    if "SUPABASE_SERVICE_KEY" not in os.environ:
        print("WARNING: SUPABASE_SERVICE_KEY not set — using anon key. RLS may block reads/writes.")

    anthropic_client = anthropic.Anthropic(api_key=api_key)

    print(f"\n{'=' * 60}")
    print(f"SwingSense Eval Runner  |  EVAL_PROMPT {EVAL_PROMPT_VERSION}")
    print(f"{'=' * 60}")

    # Fetch
    print(f"\nFetching up to {args.limit} unscored main_analysis traces...")
    try:
        traces = fetch_unscored_traces(supabase_url, supabase_key, args.limit)
    except httpx.HTTPStatusError as e:
        print(f"ERROR fetching traces: {e.response.status_code} — {e.response.text}")
        sys.exit(1)

    if not traces:
        print("No unscored traces found.")
        return

    print(f"Found {len(traces)} traces to score.\n")

    # Grade
    scored = 0
    skipped = 0
    grade_counts: dict[str, int] = {"A": 0, "B": 0, "C": 0, "F": 0}

    for i, trace in enumerate(traces, 1):
        trace_id = trace["id"]
        level = trace.get("experience_level") or "unknown"
        print(f"  [{i}/{len(traces)}] {trace_id[:8]}... ({level})  ", end="", flush=True)

        try:
            result = grade_trace(anthropic_client, trace)
            grade = result.get("overall_grade", "?")
            write_eval_result(supabase_url, supabase_key, trace_id, grade, result)
            grade_counts[grade] = grade_counts.get(grade, 0) + 1
            scored += 1
            print(f"{grade}  — {result.get('notes', '')}")
        except json.JSONDecodeError as e:
            print(f"PARSE ERROR — skipping ({e})")
            skipped += 1
        except httpx.HTTPStatusError as e:
            print(f"WRITE ERROR {e.response.status_code} — skipping")
            skipped += 1
        except Exception as e:
            print(f"ERROR — skipping ({e})")
            skipped += 1

    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"Scored:  {scored}")
    print(f"Skipped: {skipped}")
    print(f"\nGrade distribution:")
    for grade in ["A", "B", "C", "F"]:
        count = grade_counts.get(grade, 0)
        bar = "█" * count
        print(f"  {grade}  {count:3d}  {bar}")


if __name__ == "__main__":
    main()
