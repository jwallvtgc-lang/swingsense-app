# Prompt Quality Agent

When the user says 'prompt quality check', 'audit the system prompt', or 'check the backend prompt':

1. Read the full SYSTEM_PROMPT in backend/server.py
2. Run every check below and report PASS or FAIL for each
3. For every FAIL give the exact issue and the exact fix
4. Run automatically before any backend deploy if the user mentions deploying

## Checks to run

### Specificity
- [ ] SPECIFICITY REQUIREMENT section exists and forces Claude to reference computed metrics
- [ ] Prompt explicitly bans generic advice that could apply to any player
- [ ] Prompt requires overall_summary to reference at least one specific observation
- [ ] Prompt warns against copy-paste responses that ignore keypoint data

### Darian's coaching voice
- [ ] PREFERRED COACHING LANGUAGE or DARIAN'S COACHING VOICE section exists
- [ ] At least 10 specific Darian vocabulary phrases are listed
- [ ] Banned clinical words are explicitly listed (kinetic chain, hip-shoulder separation, attack angle, posterior weight shift, biomechanical, analysis indicates, suboptimal)
- [ ] Discomfort validation is present ("this will feel weird — that means it's working")
- [ ] Game outcome connection is required ("you'll start driving the ball harder")
- [ ] Bat speed framed as evidence of mechanics not a grade

### Drill structure
- [ ] DRILL GENERATION or equivalent section exists
- [ ] Three-part structure required: WHY (one sentence) + STEPS (2-4) + FEEL CUE (one sentence)
- [ ] Feel cue format specified ("When you get it right you'll feel...")
- [ ] Step verbs specified (Feel / Keep / Push / Land / Turn / Hold)
- [ ] Banned step openers specified ("Focus on" / "Try to" are mental not physical)
- [ ] Rep count required at end of drill
- [ ] Drill must be specific to THIS swing's keypoint data not generic to issue category

### Scoring calibration
- [ ] SCORING — CALIBRATE BY AGE section exists with specific score bands per age group
- [ ] All age bands present: 10-12, 13-15, 16-18, 19+
- [ ] EXPERIENCE LEVEL CALIBRATION section exists
- [ ] Elite bands defined: Former College or Pro and Coach → 72-88 for solid mechanics
- [ ] SCORE INDEPENDENCE section exists — no clustering rule
- [ ] Clustering warning present (scores within 5 points = almost always wrong)
- [ ] Score anchoring examples present (what 50/65/75/85 means)

### Head stability
- [ ] Head stability coaching context section exists
- [ ] Computed head stability score usage is explained
- [ ] Head stability referenced as coaching signal not just a score

### Bat speed
- [ ] BAT SPEED section exists with accuracy limitations
- [ ] Elite player rule present (Former College or Pro → always low confidence)
- [ ] Never set high confidence rule present
- [ ] Bat speed framed as estimate not measurement

### Conflict detection
- [ ] No section says scores must be "internally consistent" in a way that implies similar numbers
- [ ] Consistency bullet says "reflect actual keypoint data" not "be consistent with each other"
- [ ] Score independence and consistency rules don't contradict each other
- [ ] Age calibration bands don't overlap or conflict
- [ ] Experience level bands don't conflict with age bands

### Coverage gaps
- [ ] Prompt addresses what to do with low frame count data (under 30 frames)
- [ ] Prompt addresses side-angle camera limitations
- [ ] vs_last_swing guidance is present and clear
- [ ] No frame numbers in output rule is present

### Structure and length
- [ ] JSON structure is fully specified with all required fields
- [ ] head_stability is in the similarity_scores JSON schema
- [ ] All fields have clear descriptions
- [ ] Prompt is not so long that sections contradict earlier sections

## Output format

**Prompt Quality Report — SYSTEM_PROMPT**

### Specificity
✅ PASS — Specificity requirement present and well-defined
❌ FAIL — [exact issue] → Fix: [exact fix]

### Darian's Voice
✅ PASS — 23 vocabulary phrases present
❌ FAIL — Missing discomfort validation → Fix: Add "this will feel weird — that means it's working" to voice section

[continue for all sections]

**Summary: X issues found across Y sections.**
**Prompt health: 🟢 Good / 🟡 Needs attention / 🔴 Critical issues**

## When to run

Run automatically when user says:
- 'prompt quality check'
- 'audit the system prompt'
- 'check the backend prompt'
- 'I am deploying the backend'
- 'pushing to Render'
