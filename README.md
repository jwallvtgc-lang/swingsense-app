# SwingSense

AI-powered baseball swing analysis app. Upload a swing video, MoveNet Thunder extracts body keypoints, Claude analyzes mechanics, and you get personalized coaching feedback.

## Architecture

```
Mobile App (React Native / Expo)
  ├── Auth (Supabase)
  ├── Upload / Camera → Supabase Storage
  ├── Processing screen → calls Backend API
  └── Results screen ← reads from Supabase DB

Backend API (Python / FastAPI)
  ├── Downloads video from Supabase Storage
  ├── MoveNet Thunder → extracts 17 keypoints per frame
  ├── Claude API → structured coaching analysis
  └── Returns JSON results to mobile app

Supabase
  ├── Auth (email/password)
  ├── Database (profiles, swing_analyses, subscriptions, activity_log)
  └── Storage (swing-videos bucket)
```

## Quick Start

### 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema migration in the SQL editor: `supabase/migrations/001_phase0_schema.sql`
3. Copy your project URL and anon key

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Start the Backend API

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY
python server.py
```

The backend starts on `http://localhost:8000`. It downloads the MoveNet Thunder model on first run.

### 4. Start the Mobile App

```bash
npm start
```

Scan the QR code with Expo Go (iOS/Android) or press `a` for Android / `i` for iOS simulator.

## Project Structure

```
├── App.tsx                     # Root component
├── src/
│   ├── config/
│   │   ├── supabase.ts         # Supabase client
│   │   └── constants.ts        # Colors, spacing, tier limits
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state + profile management
│   ├── navigation/
│   │   ├── AppNavigator.tsx     # Auth → Onboarding → Main flow
│   │   └── types.ts            # Navigation param types
│   ├── screens/
│   │   ├── AuthScreen.tsx       # Sign in / Sign up
│   │   ├── OnboardingScreen.tsx # Player profile setup
│   │   ├── UploadScreen.tsx     # Video upload or camera capture
│   │   ├── ProcessingScreen.tsx # Pipeline progress display
│   │   ├── ResultsScreen.tsx    # Coaching feedback display
│   │   ├── HistoryScreen.tsx    # Past analyses list
│   │   └── ProfileScreen.tsx    # Player profile + settings
│   ├── services/
│   │   ├── analysis.ts         # Analysis pipeline orchestration
│   │   ├── storage.ts          # Supabase Storage upload
│   │   └── subscription.ts     # Free tier quota tracking
│   └── types/
│       └── index.ts            # TypeScript types for all data models
├── supabase/
│   └── migrations/
│       └── 001_phase0_schema.sql  # Full database schema
├── backend/
│   ├── server.py               # FastAPI analysis pipeline server
│   ├── requirements.txt
│   └── .env.example
└── .env.example
```

## Phase 0 Scope

- **Auth**: Email/password via Supabase with player profile onboarding
- **Upload**: Camera roll selection or in-app recording
- **Processing**: MoveNet Thunder keypoint extraction + Claude coaching analysis
- **Results**: Swing score (0-100 with category breakdown), bat speed estimate, mechanical observations, priority fixes, drill recommendations
- **History**: Past analyses with scores
- **Subscription**: Free tier (2/month) tracking — Pro tier via RevenueCat in Phase 1

## Database Tables

**Phase 0 (active):** profiles, swing_analyses, subscriptions, activity_log

**Placeholder (future-proofing):** teams, team_members, drills, user_drills, achievements, user_achievements, user_stats, feedback
