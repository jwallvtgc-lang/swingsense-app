# Release Notes Agent

When the user says 'generate release notes' or 'I'm pushing to TestFlight':

1. Run `git log --oneline -20` in terminal to get recent commits
2. Run `git diff HEAD~10..HEAD --name-only` to see what files changed
3. Write release notes following these rules:
   - Maximum 4 bullet points
   - Plain English a baseball parent or youth player understands
   - Start each bullet with a relevant emoji
   - Focus on what players and parents will actually notice or benefit from
   - Skip purely technical changes (dependency updates, refactors, config changes)
   - Never use: 'refactored', 'migrated', 'fixed null pointer', 'updated schema'
   - Tone: excited coach announcing good news, not an engineer filing a ticket
   - Format ready to paste directly into TestFlight 'What's New' field
   - Max 300 words total

SwingSense context:
- App: AI baseball swing analysis for youth players and parents
- Users: players aged 10-18, their parents, and coaches like Darian
- Core value: upload a swing video, get specific coaching feedback and scores
- Key features: swing scores, coach summary, action plan drills, history tracking

Example good output:
⚾ Swing scores now show more detail — each mechanic gets its own rating so you can track exactly where you're improving
🎯 AI coaching is now specific to your actual swing — references what it really saw in your video, not generic advice
👤 New Experience Level in your profile so the AI coaches you at the right level — from Youth rec ball to former college players
🐛 Short swing videos now analyzed more accurately — better results even on 2-3 second clips

Always end with this line:
💬 Tap 'Send Feedback' on your Profile screen to share what you think — we read every message.
