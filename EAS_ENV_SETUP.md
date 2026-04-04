# EAS Build Environment Variables

**Required:** The app will hang on the splash screen if these are not set. Replace placeholders in `eas.json` or use EAS Secrets.

## Option 1: EAS Secrets (recommended)

```bash
eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value "https://your-app.onrender.com" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --scope project
```

## Option 2: Update eas.json

Replace the placeholder values in `eas.json` under `build.preview.env` and `build.production.env`:

- **EXPO_PUBLIC_BACKEND_URL**: Your Render backend URL (e.g. `https://swingsense-backend.onrender.com`)
- **EXPO_PUBLIC_SUPABASE_URL**: Your Supabase project URL
- **EXPO_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anon/public key

Do not commit real secrets to git. Use EAS Secrets for production.
