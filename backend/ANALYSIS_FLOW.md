# Video Analysis Flow — Per-Video Independence

This document traces the flow to confirm each video is analyzed independently.

## 1. Frontend: Upload → URL Sent to Backend

1. **Create record**: `createAnalysisRecord(userId, 'pending')` inserts a new row in `swing_analyses` with a unique `id` (UUID).
2. **Upload**: `uploadSwingVideo(userId, videoUri, analysisId)` uploads to Supabase Storage at path `{userId}/{analysisId}.{ext}`. Each analysis gets a unique path because `analysisId` is a new UUID.
3. **Signed URL**: `createSignedUrl(storagePath, 3600)` returns a URL for that specific object. The URL includes a signature and is unique per upload.
4. **Backend call**: `fetch(backendUrl/analyze, { analysis_id, video_url, ... })` sends the signed URL. Each analysis sends a different `video_url` because each has a different `analysisId` in the storage path.

**Logging**: `[Pipeline] Analyzing video analysis_id=X url=...` in the app console.

## 2. Backend: Download → MoveNet → Claude

1. **Receive**: Each `/analyze` request gets `analysis_id` and `video_url` in the body.
2. **Download**: `httpx.get(request.video_url)` downloads the video. No cache — we fetch from the provided URL every time.
3. **Temp file**: Content is written to a new temp file (`NamedTemporaryFile`). Each request gets a new temp path.
4. **MoveNet**: `extract_keypoints(tmp_path)` runs the TFLite interpreter on the downloaded file. The interpreter (model) is shared, but the input (video frames) is different each time.
5. **Claude**: `analyze_with_claude(keypoint_data, profile, analysis_id)` sends the keypoint data. No caching — each request gets a fresh API call.

**Logging**: `[Analyze] Analyzing video analysis_id=X url_hash=Y url=...` in Render logs. Different videos → different `url_hash`.

## 3. No Caching

- **Redis**: Not used.
- **In-memory cache**: None. No results are cached by URL or analysis_id.
- **Reuse**: Each request downloads the video, extracts keypoints, and calls Claude independently.

## 4. Verifying Independence

1. **Render logs**: Look for `[Analyze] Analyzing video analysis_id=... url_hash=...`. Different videos should show different `url_hash` values.
2. **App console**: Look for `[Pipeline] Analyzing video analysis_id=...`. Each run should have a different `analysis_id`.
3. **Claude prompt**: The prompt now includes `Analysis ID: {id}` and instructs Claude to base feedback solely on the provided keypoint data.

## 5. Why Scores Might Look Similar

If scores are similar across different videos, possible causes:

- **Similar swings**: Same player with similar mechanics will produce similar keypoint patterns.
- **Claude calibration**: The model may tend toward certain score ranges. The system prompt was updated to emphasize analyzing only the provided data.
- **Keypoint similarity**: If videos are from the same angle and similar body positions, keypoints can be close, leading to similar scores.
