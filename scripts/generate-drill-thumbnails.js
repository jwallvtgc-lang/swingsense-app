// Generates a video-frame thumbnail for each drill and writes it back as
// drills.thumbnail_url. One-time / manually re-triggered admin script — not
// part of the running app. Re-run whenever drills are added or a video changes.
//
// Requires:
//   - ffmpeg on PATH (not an npm dependency — this script shells out to it)
//   - SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS for the storage upload + DB write)
//
// Per-drill failures (bad frame extraction, failed upload, failed DB write) are logged and
// skipped — the run continues to the next drill, it does not abort. Only pre-flight failures
// (can't list/create the bucket, can't fetch the drill list at all) stop the whole run.
//
// Usage:
//   node scripts/generate-drill-thumbnails.js                        # only drills missing a thumbnail_url
//   node scripts/generate-drill-thumbnails.js --force                # regenerate for every drill with a video
//   node scripts/generate-drill-thumbnails.js --dry-run               # log what would happen, no writes/uploads
//   node scripts/generate-drill-thumbnails.js --drill-id=<uuid>       # process a single drill only
//   node scripts/generate-drill-thumbnails.js --dry-run --drill-id=<uuid>   # combine freely

const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

try { require('dotenv').config(); } catch (_) {}

const SUPABASE_URL = 'https://qwzkgyyvtqhdeqkandaf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'drill_thumbnails';
const DEFAULT_TIMESTAMP_SECONDS = 1.5;
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const DRILL_ID = (process.argv.find((a) => a.startsWith('--drill-id=')) ?? '').split('=')[1] || null;

// Per-drill override when the default timestamp doesn't land on a clean frame
// (e.g. mid-blink, bat obscuring the body). Key by drill name (matches scripts/seed-drills.js).
const TIMESTAMP_OVERRIDES = {
  // 'Framebyframe': 2.5,
};

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set in your environment.');
  console.error('Add it to .env and run again.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function assertFfmpegAvailable() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch (_) {
    console.error('Error: ffmpeg is not installed or not on PATH.');
    console.error('Install it first (e.g. `brew install ffmpeg`) and run again.');
    process.exit(1);
  }
}

async function ensureBucketExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Failed to list storage buckets: ${error.message}`);

  if (buckets.some((b) => b.name === BUCKET)) return;

  if (DRY_RUN) {
    console.log(`[dry-run] Bucket "${BUCKET}" not found — would create it (public).`);
    return;
  }

  console.log(`Bucket "${BUCKET}" not found — creating it (public)...`);
  const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (createError) throw new Error(`Failed to create bucket "${BUCKET}": ${createError.message}`);
}

/** Extracts one frame from a remote video URL straight to a local JPEG — ffmpeg reads the
 * HTTPS source directly, no separate download step needed. */
function extractFrame(videoUrl, timestampSeconds, outPath) {
  execFileSync('ffmpeg', [
    '-y',
    '-ss', String(timestampSeconds),
    '-i', videoUrl,
    '-frames:v', '1',
    '-q:v', '3',
    outPath,
  ], { stdio: 'ignore' });
}

async function processDrill(drill) {
  if (!drill.video_url) {
    console.log(`  skip (no video_url): ${drill.name}`);
    return { status: 'skipped' };
  }

  if (!FORCE && drill.thumbnail_url) {
    console.log(`  skip (already has thumbnail_url): ${drill.name}`);
    return { status: 'skipped' };
  }

  const timestamp = TIMESTAMP_OVERRIDES[drill.name] ?? DEFAULT_TIMESTAMP_SECONDS;

  if (DRY_RUN) {
    console.log(`  [dry-run] would extract frame @ ${timestamp}s and upload/write for: ${drill.name}`);
    return { status: 'generated' };
  }

  const tmpPath = path.join(os.tmpdir(), `drill-thumb-${drill.id}.jpg`);

  try {
    extractFrame(drill.video_url, timestamp, tmpPath);
  } catch (err) {
    console.error(`  FAILED to extract frame for "${drill.name}" (${drill.video_url}): ${err.message}`);
    return { status: 'error' };
  }

  const fileBuffer = fs.readFileSync(tmpPath);
  const storagePath = `${drill.id}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType: 'image/jpeg', upsert: true });

  fs.unlinkSync(tmpPath);

  if (uploadError) {
    console.error(`  FAILED to upload thumbnail for "${drill.name}": ${uploadError.message}`);
    return { status: 'error' };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const thumbnailUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from('drills')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', drill.id);

  if (updateError) {
    console.error(`  FAILED to write thumbnail_url for "${drill.name}": ${updateError.message}`);
    return { status: 'error' };
  }

  console.log(`  ✓ ${drill.name} → ${thumbnailUrl}`);
  return { status: 'generated' };
}

async function main() {
  if (!DRY_RUN) assertFfmpegAvailable();
  await ensureBucketExists();

  let query = supabase.from('drills').select('id, name, video_url, thumbnail_url').order('name');
  if (DRILL_ID) query = query.eq('id', DRILL_ID);

  const { data: drills, error } = await query;

  if (error) {
    console.error('Failed to fetch drills:', error.message);
    process.exit(1);
  }

  if (DRILL_ID && drills.length === 0) {
    console.error(`No drill found with id "${DRILL_ID}".`);
    process.exit(1);
  }

  const mode = [DRY_RUN && 'dry-run', FORCE && 'force', DRILL_ID && `drill-id=${DRILL_ID}`]
    .filter(Boolean)
    .join(', ');
  console.log(`Processing ${drills.length} drill${drills.length === 1 ? '' : 's'}${mode ? ` (${mode})` : ''}...`);

  const counts = { generated: 0, skipped: 0, error: 0 };
  for (const drill of drills) {
    const { status } = await processDrill(drill);
    counts[status] += 1;
  }

  const generatedLabel = DRY_RUN ? 'Would generate' : 'Generated';
  console.log(
    `\nDone. ${generatedLabel}: ${counts.generated}, skipped: ${counts.skipped}, failed: ${counts.error}.`
  );
  if (counts.error > 0) process.exitCode = 1;
}

main();
