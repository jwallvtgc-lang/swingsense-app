# Render Backend Troubleshooting

When the analysis endpoint returns **500 Internal Server Error**, check these in order.

## 1. Render Logs

In Render Dashboard → your service → **Logs**, look for:

- `[Startup] ANTHROPIC_API_KEY=NOT SET` → Set the key in Render Environment
- `[Startup] FATAL: Neither tflite_runtime nor tensorflow` → Build/dependency issue
- `[Analyze] Error: ...` → The actual exception (download, keypoints, or Claude)
- `MemoryError` or `Killed` → Out of memory (see #4)

## 2. ANTHROPIC_API_KEY

**Required.** Set in Render:

1. Dashboard → swingsense-api → **Environment**
2. Add `ANTHROPIC_API_KEY` with your Anthropic API key
3. Redeploy

Without it, `/analyze` returns 500 with "ANTHROPIC_API_KEY not configured".

## 3. Supabase Video URL

The backend downloads the video via a **signed URL** from Supabase Storage. No backend env vars needed for that. If download fails:

- Check that the signed URL is valid (1-hour expiry)
- Ensure the storage bucket allows public/signed access
- Logs will show `[Analyze] Video download failed: ...`

## 4. Memory (512MB vs 1GB+)

MoveNet + OpenCV + video processing can use **~600MB–1GB RAM**. Render free tier (512MB) often crashes.

**Fix:** Use **Starter** plan ($7/mo, 512MB → 512MB default but more reliable) or **Standard** for 2GB. In `render.yaml`, `plan: starter` is already set.

If you see `Killed` or `MemoryError` in logs, upgrade the plan.

## 5. Request Timeout

Analysis can take 30–90 seconds. Render free tier has a **30s** request timeout; paid plans allow longer.

**Fix:** Upgrade plan, or consider moving analysis to a background job (worker + Redis) for very long runs.

## 6. Health Check

`GET /health` should return `{"status":"ok","model_loaded":true}`. If `model_loaded` is false, MoveNet failed to load (often memory or missing deps).

## Quick Checklist

- [ ] `ANTHROPIC_API_KEY` set in Render Environment
- [ ] Plan is Starter or higher (not free)
- [ ] Logs show `[Startup] MoveNet loaded successfully`
- [ ] Logs show `[Startup] ANTHROPIC_API_KEY=set`
- [ ] Video URL from frontend is a valid Supabase signed URL
