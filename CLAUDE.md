# SwingSense — Agent Master Context

This file is read automatically by every Claude Code session. It contains everything needed to work on SwingSense autonomously without asking clarifying questions.

## What We're Building

SwingSense is an AI-powered baseball swing analysis app. Players record their swing, get instant biomechanical feedback, and receive drill recommendations grounded in real coaching methodology. Built for serious youth and amateur players.

**Core loop:** Record swing → Upload video → MoveNet extracts keypoints → Claude generates coaching feedback → Player sees score + drills

**Key advisor:** Darian — former D1 player, current high school coach. His coaching framework and voice are the gold standard for all feedback output.

## Tech Stack

- Frontend: React Native / Expo SDK 54
- Backend: FastAPI on Render (Docker, auto-deploy from GitHub)
- Database: Supabase (Postgres)
- Storage: Supabase Storage (swing videos)
- Auth: Supabase Auth (email, Apple, Google)
- AI: Anthropic Claude Sonnet (coaching output)
- Pose: MoveNet Thunder (17 keypoints, 2D)
- Build: EAS / Expo
- Distribution: TestFlight (iOS first)

**Backend URL:** https://swingsense-api.onrender.com
**Repo:** GitHub (auto-deploys to Render on push to main)

## Repository Structure

swingsense-app/
├── src/
│   ├── screens/
│   ├── components/
│   ├── services/
│   ├── navigation/
│   └── design-system/
├── backend/
│   └── server.py
├── supabase/
│   └── migrations/
├── .claude/
│   └── agents/
├── ios/
├── app.json
└── eas.json

## Non-Negotiable Rules

### Code Rules
- Never edit applied Supabase migrations — create new numbered migration files only
- Always run design system compliance after building any frontend component
- Commit format: AI-XX: description
- Backend auto-deploys on git push to main
- Run npx tsc --noEmit before every commit — zero TypeScript errors

### Coaching Rules (Darian's Framework)
- Never show raw metric numbers to players
- Lead with positives always
- One primary issue maximum per session
- Core mechanics before advanced — evaluate in this order:
  1. Stance
  2. Load
  3. Power Position
  4. Slot
  5. Balance at Contact
- Cue-based not correction-based
- Summary max 3-4 sentences

### Design System Rules
- All tokens in design-system/tokens.ts — never hardcode colors fonts or spacing
- typography.displayTitle = Righteous_400Regular
- typography.display = BebasNeue_400Regular
- displayTitleProps must be spread on all screen title headers

## Current Build Status

- Version: 1.1.0 (24) — live in TestFlight
- Distribution: store (all testers can install)
- Backend: Auto-deploys from GitHub main branch
- TestFlight public link: https://testflight.apple.com/join/jrA4Jg74

### Version Bump Checklist
Every build requires updating ALL THREE files:
1. app.json → expo.ios.buildNumber
2. ios/SwingSense/Info.plist → CFBundleVersion
3. ios/SwingSense.xcodeproj/project.pbxproj → CURRENT_PROJECT_VERSION (Debug + Release)

### EAS Build Pattern
eas build --platform ios --profile preview
eas submit --platform ios --id BUILD_ID_HERE
Never use --latest

## Key Architecture

### MoveNet Validation Thresholds
CONF_THRESHOLD = 0.2
MIN_KEYPOINTS_PER_FRAME = 6
MIN_GOOD_FRAMES_RATIO = 0.25
MIN_MOVEMENT_RANGE = 0.06

### Google Sign In
- GoogleService-Info.plist in ios/SwingSense/
- Supabase: Google provider enabled, Skip nonce checks ON
- Google button hidden in Expo Go via ExecutionEnvironment check

### Cost Control
- Progress Coach fetches once per session via ref
- Drill Coach is reactive only

## Linear Project Management

- Project: Swingsense
- Team: AI Baseball Coach
- Labels: coaching-quality, ux, infra
- Status flow: Idea → Backlog → In Progress → In Review → Done

### Current High Priority Backlog
- AI-50: Friendly upload error message (URGENT)
- AI-51: Upload retry logic (URGENT)
- AI-18: Basic vs advanced metrics toggle
- AI-57: Darian labeled dataset (50+ swings)
- AI-59: AI eval framework
- AI-67: Guided recording experience

## Support & Accounts

- Support email: swingsenseapp@gmail.com
- Apple Developer: jwallvtgc@gmail.com (Team: FLN8CRHTAB)
- EAS / Expo account: jwallvtgc
- Supabase project: qwzkgyyvtqhdeqkandaf
- ASC App ID: 6760627870

## Autonomous Agent Guidelines

1. Read the ticket fully before writing any code
2. Read relevant existing code before making changes
3. Run design system compliance after any frontend component change
4. Run npx tsc --noEmit — zero TypeScript errors before committing
5. Commit with ticket number: AI-XX: description
6. Push to main — backend auto-deploys, frontend requires EAS build
7. Do not expand scope — complete exactly what the ticket asks
8. When in doubt — do less and log an issue
