"""
AI-113: LLM-as-judge eval prompt, calibrated to Darian's 7 labeled swings.

Run:
    cd ~/Desktop/Swingsense-app-local
    ANTHROPIC_API_KEY=sk-... python backend/scripts/eval_prompt.py

Or add ANTHROPIC_API_KEY to backend/.env before running.
"""

import json
import os
import sys
from pathlib import Path

_backend_dir = Path(__file__).parent.parent
_env_file = _backend_dir / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        pass

import anthropic

# ---------------------------------------------------------------------------
# Version
# ---------------------------------------------------------------------------

# Increment when eval prompt changes. Used to track calibration history.
# v1.0 — Initial prompt calibrated to 7 Darian-labeled swings (June 2026)
EVAL_PROMPT_VERSION = "v1.0"

# ---------------------------------------------------------------------------
# Eval prompt
# ---------------------------------------------------------------------------

EVAL_PROMPT = """\
You are evaluating AI baseball coaching output against the standard set by \
Darian — a former D1 player and high school coach. You will be given:
- The player's age and experience level
- A summary of mechanics observed in the swing
- The coaching output the app produced (primary issue, overall summary, drill assigned)

Grade the output on three dimensions and return JSON only.

---

GRADE DEFINITIONS

A = This is what Darian would say. Correct mechanic prioritized, leads with specific \
positives, feel cue connects to physical sensation, drill directly addresses the issue, \
age-appropriate language.

B = Good coaching, minor issues. Right mechanic, right drill, but language slightly \
generic or summary slightly too long.

C = Not completely off-base but execution poor. This includes:
  - Right mechanic identified but vague language, unnamed drill, or wrong drill
  - Wrong mechanic BUT language is age-appropriate and not robotic (coaching has merit)
  - Correct direction with good tone but misses the specific primary issue

F = Clearly wrong. Requires at least two of the following:
  - Wrong primary mechanic identified AND identified something that was clearly NOT a problem
  - Sounds robotic — same content copy-pasted between sections verbatim
  - Drill has zero connection to any real issue in this swing
  - Language that would confuse or mislead the player

---

MECHANIC PRIORITY HIERARCHY (for evaluating issue_accuracy)

Tier 1 — Core mechanics (must be evaluated first, in this order):
  Starting stance → Load → Power position → Slot → Balance at contact

Tier 2 — Advanced mechanics (only valid primary issue if ALL Tier 1 are present):
  Bat tip → Stride orientation → Head stability → Bat lag →
  Extension → Wrist flick → Knee roll → Hip shift

RULE: If the app identified a Tier 2 mechanic as the primary issue when the swing \
context shows any Tier 1 mechanic missing → issue_accuracy = "fail" automatically.

---

EXAMPLE 1 — AGE 10, TRAVEL BALL (C-grade)

Mechanics observed in this swing:
  Core: Starting stance OK, load good (hip loaded into backside), stride foot gained \
ground, power position present, slot OK, balance at contact present.
  Primary weakness: Head drops and lifts significantly during the swing. Player uses \
head and shoulders to move the bat instead of hip snap. At contact, head yanks up \
and out.

What Darian would say (A-grade):
  What's working: Lower half working well. Hip loaded into backside. Stride foot \
gained ground. Swing plane relatively level.
  Primary issue: Head positioning through the load and swing — head drops and lifts \
significantly. Player should use hip snap to move the bat, not head and shoulders.
  Feel cue: Chest back at contact. Look down at contact. Keep your head neutral \
between your shoulders.
  Drill: Power position hold.

What the app said (C-grade):
  Primary issue: Hands dropping slightly below the shoulder before the swing starts.
  Summary: Your lower half looks good and your stride is working well. Focus on \
keeping your hands up through the load to get a cleaner path to the ball.
  Drill: High tee work to keep hands in the hitting zone.

Why it's C and not A:
  Wrong mechanic — hands were not the primary issue; head instability was. \
issue_accuracy = partial (hands are secondary at most).
  Drill mismatch — high tee addresses hand path, not head stability.
  Language is age-appropriate and not robotic, so this is C not F.

---

EXAMPLE 2 — AGE 7, YOUTH (C-grade)

Mechanics observed in this swing:
  Core: Starting stance solid, load present (some hip loading), stride gains ground, \
power position present (on toes), slot present, balance at contact good.
  Primary weakness: Gliding — weight landing on the front leg instead of staying \
loaded over the back. Player not loading hips, creating forward drift that removes \
the slot.
  Advanced: Level swing, eyes on contact, hips rotated, palm up/palm down at contact.
  Note: Body at contact was balanced and close to the ball — NOT pulling away from it.

What Darian would say (A-grade):
  What's working: Starting stance solid. Level swing. Eyes on contact. Hips rotated. \
Palm up palm down at contact. Gained ground. On toes at power position.
  Primary issue: Gliding — weight lands on the front leg instead of staying loaded \
over the back. This removes the slot. Player not loading hips, causing forward drift.
  Feel cue: Hit on your back leg. Chest back at contact. Land softly on your stride \
foot. Keep your head still.
  Drill: Post stride drill + Drop step drill.

What the app said (C-grade):
  Primary issue: Body pulling off the ball at contact — no balance maintained.
  Summary: Your swing has some good elements but you are losing balance at contact \
as your body pulls away from the ball. Focus on staying through the ball and \
finishing with your belly button facing the pitcher.
  Drill: Freeze drill — hold your finish for 3 seconds after each swing.

Why it's C and not F:
  Wrong mechanic — gliding (weight forward) is the opposite of pulling off the ball. \
issue_accuracy = fail.
  But language is age-appropriate, tone is warm, coaching has some merit around \
balance. Content is not copy-pasted or robotic.
  The drill (freeze) has some logic even though it misses the root cause.
  Two wrong elements (mechanic + drill) but intent and language quality are OK → C.

---

EXAMPLE 3 — AGE 10, REC (F-grade)

Mechanics observed in this swing:
  Core: Starting stance good, load present, stride gained ground, bat tip present, \
power position present, slot decent, balance at contact GOOD.
  Primary weakness: Rounded swing / lack of bat lag. Front arm near lockout at power \
position forces front shoulder to pull early. Wrists roll over after contact. \
Minimal extension through the ball.
  Note: Player was NOT spinning away from the ball. Balance at contact was solid.

What Darian would say (A-grade):
  What's working: Starting stance good. Load present. Gained ground. Bat tip. Power \
position. Slot decent. Balanced follow-through. Palm up palm down. Hips rotated. \
On toes. Looking down at contact.
  Primary issue: Rounded swing — lack of bat lag. Front arm near lockout at power \
position forces front shoulder off early. Hard to get inside the ball. Wrists roll \
over after contact with minimal extension through.
  Feel cue: Keep elbow bent. Maintain diamond shape. Relax your grip. Knob to ball. \
Bottom hand leads. Get your hands to the front of the plate.
  Drill: Curtain swing. Inside corner tee (50%). Rope bat. Split grip drill. \
One hand bottom tee middle. Elbow jab drill.

What the app said (F-grade):
  Primary issue: Spinning away from the ball before finishing through contact.
  Summary: Your mechanics show some good fundamentals but you are spinning away from \
the ball at contact. Make sure to keep your belly button facing the pitcher and not \
pulling to the side. Stay through the ball and avoid pulling off contact.
  Drill: Stay-through drill — keep your belly button facing the pitcher as you \
conclude the swing. Avoid letting it pull to the sky.

Why it's F and not C:
  Wrong mechanic — this player did NOT spin away from the ball. The app identified \
a problem that clearly did not exist. Balance at contact was actually good.
  Drill has zero connection to the real issue (rounded swing / locked arm).
  "Avoid letting it pull to the sky" is vague jargon — not standard coaching language.
  Content repeated verbatim across results and coaching tabs — robotic output.
  Three failures: wrong mechanic + wrong issue flagged + robotic + mismatched drill → F.

---

EVALUATION DIMENSIONS

issue_accuracy: Did the app identify the correct primary mechanic?
  Check Tier 1 before Tier 2. Use the mechanics context provided.
  "pass" = correct primary mechanic identified
  "partial" = right area but not specific enough, or secondary issue elevated to primary
  "fail" = wrong mechanic, or Tier 2 identified when any Tier 1 was missing or weak

summary_quality: Does the overall summary lead with positives, use age-appropriate \
language, stay under 4 sentences, avoid raw numbers and jargon?
  1 = generic, robotic, or copy-paste language with no real coaching value
  2 = correct direction, minor language issues, somewhat generic
  3 = sounds like Darian — specific, warm, age-appropriate

drill_quality: Does the drill directly address the primary issue? Is it named \
explicitly? Does it match what a real coach would assign for this problem?
  "pass" = named drill that matches the identified issue
  "fail" = unnamed drill, vague instructions, or drill for a completely different issue

overall_grade: A | B | C | F

Respond with JSON only. No preamble. No explanation outside the JSON.

{
  "issue_accuracy": "pass|fail|partial",
  "summary_quality": 1|2|3,
  "drill_quality": "pass|fail",
  "overall_grade": "A|B|C|F",
  "notes": "one sentence explaining the grade"
}
"""

# ---------------------------------------------------------------------------
# Ground truth — 7 labeled swings from Darian's scoring sheet (June 2026)
#
# darian_grade: Swings 1-3 use old format (grade inferred from quality score + verdict).
#               Swings 4-7 have explicit structured verdict with A/B/C/F.
#   Swing 1: 1/10 quality, completely wrong primary issue → F
#   Swing 2: "did OK", right issue (head movement), tangled drill → C
#   Swing 3: 6/10 quality, wrong prioritization (balance vs hands) → C
#   Swing 4: explicit C — wrong mechanic (balance vs torque), language wrong
#   Swing 5: explicit C — wrong mechanic (hands vs head), drill mismatch, language off
#   Swing 6: explicit C — wrong mechanic (pulling off vs gliding), language wrong
#   Swing 7: explicit F — wrong mechanic (spinning vs rounded swing), robotic, drill mismatch
# ---------------------------------------------------------------------------

GROUND_TRUTH = [
    {
        "swing_id": 1,
        "age": 16,
        "level": "varsity high school",
        "mechanics_context": (
            "All 5 core mechanics present: stance ✓, load ✓, power position (weak) ✓, "
            "slot ✓, balance at contact ✓. Advanced mechanics also present: bat tip, "
            "head stability VERY GOOD throughout the entire swing, bat dip, knee roll "
            "very good, rebound very good. Power position not strong enough — stride "
            "foot needs more ground, hands need to be back with bat tip as stride foot "
            "lands, not on toes at power position."
        ),
        "darian_primary_issue": "power position — stride foot needs to gain ground, hands need to be back with bat tip as stride foot hits the ground, hitter's stretch too weak",
        "darian_grade": "F",
        "app_primary_issue": "head position and stability — head is moving, disrupting the swing",
        "app_summary": (
            "Your head stability is the main thing to focus on in your swing. "
            "Keeping your head still will improve your ability to track and hit the ball "
            "consistently. Your load looks active but head movement is costing you."
        ),
        "app_drill": (
            "Helmet snug drill — press your helmet snug on your head before each swing "
            "and focus on keeping it in place throughout the swing. Repeat 10 times."
        ),
    },
    {
        "swing_id": 2,
        "age": 14,
        "level": "junior varsity",
        "mechanics_context": (
            "Hip load and lower half working well. Knee knock load good. Gained ground "
            "with stride foot. Hand stability OK — hands didn't bounce or get pulled around. "
            "Fired from a slightly downward angle which is good. Core mechanics mostly present. "
            "Primary weakness: head moves significantly through hip load and as stride foot "
            "lands, skewing vision and hurting timing."
        ),
        "darian_primary_issue": "head movement through load and stride — head moves a lot as stride foot lands, skewing vision and hurting timing",
        "darian_grade": "C",
        "app_primary_issue": "head stability — head is moving through the load and stride, causing vision and timing issues",
        "app_summary": (
            "Your lower half is working hard and you're gaining good ground with your stride. "
            "Focus on keeping your head neutral through the swing. Keep your chin level and "
            "don't let your shoulder chase your chin — your front shoulder rests under your "
            "chin at the start and your back shoulder rotates under that neutral chin at contact."
        ),
        "app_drill": (
            "Keep your chin level throughout the swing. Your front shoulder rests under your "
            "chin at the starting stance — as you take your swing, your back shoulder will "
            "rotate under that neutral chin. Try this concept on the tee first before "
            "live pitching."
        ),
    },
    {
        "swing_id": 3,
        "age": 7,
        "level": "coach pitch",
        "mechanics_context": (
            "Starting stance good. Hand load and stride good. Knee roll and hip rotation good. "
            "Core mechanics almost all present. "
            "Primary weakness: hands drop below the shoulder before the swing starts, "
            "back shoulder drops with them, creating a long slow swing path and forcing "
            "upward extension at contact. "
            "Secondary: head slides slightly away at contact — eyes drift off the ball."
        ),
        "darian_primary_issue": "hands dropping before the swing starts — back shoulder drops with them, creating a long slow swing and forcing upward extension at contact",
        "darian_grade": "C",
        "app_primary_issue": "balance through contact — momentum pulls away and balance is lost as the swing concludes",
        "app_summary": (
            "Good load and stride fundamentals — you're working your lower half well. "
            "The main adjustment is staying balanced through the whole swing. Get on your "
            "front side at contact and hold that finish position. Your balance through "
            "the swing will lead to more consistent contact."
        ),
        "app_drill": (
            "Freeze drill — take a full swing and hold your finish position for 3 seconds. "
            "Feel your weight on your front foot and maintain your balance at the "
            "conclusion of the swing."
        ),
    },
    {
        "swing_id": 4,
        "age": 16,
        "level": "high school",
        "mechanics_context": (
            "All core mechanics present: stance ✓, load (connected stride) ✓, power "
            "position ✓, slot ✓, balance at contact ✓. Advanced mechanics: bat tip present, "
            "extension good, level bat path, follow-through good, diamond shape through "
            "contact, palm up/palm down at contact, lower half grounded at contact. "
            "Primary weakness: lack of torque — not enough drive from back leg, center "
            "of gravity too high, hand speed noticeably low."
        ),
        "darian_primary_issue": "lack of torque — needs more drive from back leg, center of gravity grounded over heels, more momentum from the lower half",
        "darian_grade": "C",
        "app_primary_issue": "balance at contact — losing balance as the swing concludes",
        "app_summary": (
            "Your core mechanics are solid with good bat path and extension. The primary "
            "focus for improvement is maintaining your balance through contact and not "
            "letting your weight shift too early in the swing. Work on staying centered "
            "as you drive through the ball."
        ),
        "app_drill": (
            "Balance drill — focus on staying centered through your swing and hold your "
            "finish position with weight balanced between your feet after contact."
        ),
    },
    {
        "swing_id": 5,
        "age": 10,
        "level": "travel",
        "mechanics_context": (
            "Lower half working well. Hip loaded into backside. Stride foot gained ground "
            "going forward from starting position. Swing plane relatively level. "
            "Primary weakness: head drops and lifts significantly during the swing — "
            "player uses head and shoulders to move the bat instead of hip snap. "
            "At contact, head yanks up and out."
        ),
        "darian_primary_issue": "head positioning — head drops and lifts significantly during the swing, should use hip snap not head and shoulders to move the bat",
        "darian_grade": "C",
        "app_primary_issue": "hands dropping slightly below the shoulder before the swing starts",
        "app_summary": (
            "Your lower half looks good and your stride is working well. Focus on keeping "
            "your hands up through the load to get a cleaner path to the ball. "
            "Your hip work is a strength to build on."
        ),
        "app_drill": (
            "High tee work — hit balls off a high tee to train keeping hands in the "
            "hitting zone and develop a proper hand path."
        ),
    },
    {
        "swing_id": 6,
        "age": 7,
        "level": "youth",
        "mechanics_context": (
            "Starting stance solid. Level swing plane. Eyes on contact. Hips rotated through. "
            "Palm up palm down at contact. Gained ground with stride foot. On toes at power "
            "position. Hand load sequence good (hands still loading back as stride advances). "
            "Primary weakness: gliding — weight is landing on the front leg instead of "
            "staying loaded over the back. Player not loading hips, causing forward drift "
            "that removes the slot. "
            "Note: body was close to the ball at contact but BALANCED — NOT pulling away "
            "from the ball. Momentum was working forward (correct direction) but in a "
            "gliding manner."
        ),
        "darian_primary_issue": "gliding — weight landing on the front leg instead of staying loaded over the back, removing the slot",
        "darian_grade": "C",
        "app_primary_issue": "body pulling off the ball at contact with no balance maintained",
        "app_summary": (
            "Your swing has some good elements but you are losing balance at contact as "
            "your body pulls away from the ball. Focus on staying through the ball and "
            "finishing with your belly button facing the pitcher."
        ),
        "app_drill": (
            "Freeze drill — hold your finish for 3 seconds after each swing to build "
            "balance and stay-through awareness."
        ),
    },
    {
        "swing_id": 7,
        "age": 10,
        "level": "rec",
        "mechanics_context": (
            "Starting stance good. Load present. Gained ground with stride. Bat tip present. "
            "Power position present. Slot decent. Balance at contact GOOD — player was "
            "balanced at contact and NOT spinning away from the ball. Palm up palm down. "
            "Hips rotated. On toes at power position. Looking down at contact. "
            "Primary weakness: rounded swing / lack of bat lag. Front arm near lockout at "
            "power position forces front shoulder to pull early. Wrists roll over after "
            "contact. Minimal extension through the ball."
        ),
        "darian_primary_issue": "rounded swing and lack of bat lag — front arm near lockout at power position forces front shoulder to pull early, wrists rolling over after contact",
        "darian_grade": "F",
        "app_primary_issue": "spinning away from the ball before finishing through contact",
        "app_summary": (
            "Your mechanics show some good fundamentals but you are spinning away from "
            "the ball at contact. Make sure to keep your belly button facing the pitcher "
            "and not pulling to the side. Stay through the ball and avoid pulling off contact."
        ),
        "app_drill": (
            "Stay-through drill — keep your belly button facing the pitcher as you "
            "conclude the swing. Avoid letting it pull to the sky."
        ),
    },
]

# ---------------------------------------------------------------------------
# Grade one swing
# ---------------------------------------------------------------------------


def build_user_message(record: dict) -> str:
    return (
        f"Please grade this coaching output.\n\n"
        f"SWING CONTEXT\n"
        f"Player: Age {record['age']}, {record['level']}\n"
        f"Mechanics observed: {record['mechanics_context']}\n\n"
        f"APP OUTPUT\n"
        f"Primary issue identified: {record['app_primary_issue']}\n"
        f"Overall summary: {record['app_summary']}\n"
        f"Drill assigned: {record['app_drill']}\n\n"
        f"Grade this output using the EVALUATION DIMENSIONS. Return JSON only."
    )


def grade_swing(client: anthropic.Anthropic, record: dict) -> dict:
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=EVAL_PROMPT,
        messages=[{"role": "user", "content": build_user_message(record)}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ---------------------------------------------------------------------------
# Calibration runner
# ---------------------------------------------------------------------------


def run_calibration() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set in environment or backend/.env")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    print(f"\n{'=' * 60}")
    print(f"SwingSense Eval Calibration  |  EVAL_PROMPT {EVAL_PROMPT_VERSION}")
    print(f"{'=' * 60}\n")

    results = []
    for record in GROUND_TRUTH:
        swing_id = record["swing_id"]
        darian_grade = record["darian_grade"]
        print(
            f"  Swing {swing_id} (age {record['age']}, {record['level']})... ",
            end="",
            flush=True,
        )

        try:
            grade = grade_swing(client, record)
            llm_grade = grade.get("overall_grade", "?")
            agree = llm_grade == darian_grade
            results.append(
                {
                    "swing_id": swing_id,
                    "darian_grade": darian_grade,
                    "llm_grade": llm_grade,
                    "agree": agree,
                    "issue_accuracy": grade.get("issue_accuracy"),
                    "summary_quality": grade.get("summary_quality"),
                    "drill_quality": grade.get("drill_quality"),
                    "notes": grade.get("notes", ""),
                }
            )
            status = "AGREE" if agree else f"DISAGREE  LLM={llm_grade}"
            print(status)
        except Exception as e:
            print(f"ERROR: {e}")
            results.append(
                {
                    "swing_id": swing_id,
                    "darian_grade": darian_grade,
                    "llm_grade": "ERROR",
                    "agree": False,
                    "notes": str(e),
                }
            )

    # ── report ──────────────────────────────────────────────────────────────
    agreed = sum(1 for r in results if r.get("agree"))
    total = len(results)
    pct = (agreed / total) * 100 if total else 0.0

    print(f"\n{'=' * 60}")
    print("CALIBRATION REPORT")
    print(f"{'=' * 60}")
    print(
        f"{'Swing':<7} {'Darian':<8} {'LLM':<6} {'Match':<7}"
        f" {'IssAcc':<10} {'SumQ':<6} {'Drill':<7} Notes"
    )
    print("-" * 100)
    for r in results:
        match = "✓" if r.get("agree") else "✗"
        print(
            f"{r['swing_id']:<7}"
            f"{r.get('darian_grade', '?'):<8}"
            f"{r.get('llm_grade', '?'):<6}"
            f"{match:<7}"
            f"{str(r.get('issue_accuracy', '?')):<10}"
            f"{str(r.get('summary_quality', '?')):<6}"
            f"{str(r.get('drill_quality', '?')):<7}"
            f"{r.get('notes', '')}"
        )

    print(f"\nAgreement: {agreed}/{total} = {pct:.0f}%")

    if pct >= 80:
        print("PASS — calibration target met (>=80%)")
    else:
        print("FAIL — calibration target not met (<80%)")
        print("\nDisagreements to investigate:")
        for r in results:
            if not r.get("agree"):
                sw = next(g for g in GROUND_TRUTH if g["swing_id"] == r["swing_id"])
                print(f"\n  Swing {r['swing_id']} (age {sw['age']}, {sw['level']})")
                print(f"    Darian grade : {r.get('darian_grade')}")
                print(f"    LLM grade    : {r.get('llm_grade')}")
                print(f"    App said     : {sw['app_primary_issue']}")
                print(f"    Should be    : {sw['darian_primary_issue']}")
                print(f"    LLM notes    : {r.get('notes')}")
                print(
                    f"    Suggestion   : Review the C/F boundary in GRADE DEFINITIONS "
                    f"for {r.get('darian_grade')}/{r.get('llm_grade')} cases"
                )


# ---------------------------------------------------------------------------
# Calibration disagreement notes (updated after each run)
# ---------------------------------------------------------------------------
# v1.0 first run: [fill in after running]

if __name__ == "__main__":
    run_calibration()
