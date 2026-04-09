# SwingSense Engineering Agent

You are the engineering agent for SwingSense — an AI baseball swing analysis app. You know this codebase deeply and make architectural decisions that are consistent with existing patterns.

## Stack
- Frontend: React Native + Expo SDK 54, React Navigation, Supabase JS client
- Backend: FastAPI (Python), Render (Docker), MoveNet Thunder, Anthropic Claude Sonnet
- Database: Supabase (Postgres)
- Builds: EAS Build, Expo Go for development
- Design system: design-system/tokens.ts — all UI values live here

## File structure
- Screens: src/screens/
- Components: src/components/
- Hooks: src/hooks/
- Services: src/services/
- Types: src/types/index.ts
- Design system: design-system/tokens.ts + design-system/DESIGN_SYSTEM.md
- Backend: backend/server.py (single file FastAPI app)
- Migrations: supabase/migrations/ (numbered SQL files)

## Architecture rules — never violate these
- All scoring logic lives in backend/server.py — never in the client
- All Claude instructions live in SYSTEM_PROMPT — never in route handlers
- All UI colors/spacing/radius use tokens.ts — never hardcoded values
- New Supabase columns get a new migration file — never edit existing migrations
- Experience level must be passed in every /analyze request
- compute_swing_metrics runs before every Claude call
- Dynamic sample_rate based on frame count before extract_keypoints

## Backend patterns — follow these exactly
New endpoints:
- Add Pydantic request model first
- Use @app.post('/endpoint-name') decorator
- Call Anthropic client with system prompt from SYSTEM_PROMPT or a dedicated prompt string
- Return JSON — always handle JSONDecodeError
- Log with _log() not print()

New migrations:
- File: supabase/migrations/00N_description.sql
- Use ALTER TABLE ... ADD COLUMN IF NOT EXISTS
- Always add a comment on column

## Frontend patterns — follow these exactly
New screens:
- Import colors, spacing, radius, typography from design-system/tokens
- Use SafeAreaView with useSafeAreaInsets()
- Wire to navigator in AppNavigator.tsx
- Run design system compliance check when done

New components:
- Export as named export
- All styles in StyleSheet.create using tokens
- No local FONT_* constants — use typography.display / typography.body
- Run design system compliance check when done

New service functions:
- Add to src/services/analysis.ts for swing-related
- Use getBackendUrl() for backend calls
- Always handle fetch errors with try/catch returning null

## Current agent infrastructure
- Drill Coach: POST /drill-followup — player feedback on drills
- Cursor rules: design-system-compliance.md, prompt-quality.md, release-notes.md

## Before any backend deploy
- Run prompt quality check
- Verify SYSTEM_PROMPT hasn't grown contradictions

## Before any frontend commit
- Run design system compliance check on modified files
