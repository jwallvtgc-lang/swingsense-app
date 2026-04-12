import { supabase } from '../config/supabase';
import { getBackendUrl } from '../config/constants';
import { SwingAnalysis, CoachingOutput, SimilarityBreakdown, Profile } from '../types';
import { trackEvent } from './analytics';
import { uploadSwingVideo } from './storage';

interface AnalysisPipelineResult {
  analysis: SwingAnalysis | null;
  error: Error | null;
}

export async function createAnalysisRecord(
  userId: string,
  videoUrl: string
): Promise<{ id: string; created_at: string; error: Error | null }> {
  const { data, error } = await supabase
    .from('swing_analyses')
    .insert({
      user_id: userId,
      video_url: videoUrl,
      status: 'uploading',
    })
    .select('id, created_at')
    .single();

  if (error) return { id: '', created_at: '', error: new Error(`DB insert failed: ${error.message}`) };
  return { id: data.id, created_at: data.created_at as string, error: null };
}

/** Most recent completed analysis before the current row (by created_at). */
export async function getPreviousCompletedAnalysis(
  userId: string,
  currentCreatedAt: string
): Promise<SwingAnalysis | null> {
  const { data, error } = await supabase
    .from('swing_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .lt('created_at', currentCreatedAt)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[analysis] getPreviousCompletedAnalysis:', error.message);
    return null;
  }
  return (data as SwingAnalysis) ?? null;
}

/** Highest `similarity_score` among other completed analyses (excludes current row). */
export async function getPreviousBestScore(
  userId: string,
  excludeAnalysisId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('swing_analyses')
    .select('similarity_score')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .neq('id', excludeAnalysisId)
    .order('similarity_score', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[analysis] getPreviousBestScore:', error.message);
    return null;
  }
  if (!data) return null;
  return data.similarity_score ?? null;
}

export const SCORE_DELTA_THRESHOLD = 2;

export type ScoreDeltaDirection = 'up' | 'same' | 'down';

export function scoreDeltaDirection(
  current: number | null | undefined,
  previous: number | null | undefined
): ScoreDeltaDirection | null {
  if (current == null || previous == null) return null;
  const d = current - previous;
  if (d > SCORE_DELTA_THRESHOLD) return 'up';
  if (d < -SCORE_DELTA_THRESHOLD) return 'down';
  return 'same';
}

function utcCalendarDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function utcCalendarDayKeyFromNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDays(dayKey: string, deltaDays: number): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function utcDaysBetweenEarlierAndLater(earlierKey: string, laterKey: string): number {
  const a = new Date(`${earlierKey}T12:00:00.000Z`).getTime();
  const b = new Date(`${laterKey}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Streak metrics from completed analysis `created_at` values (ISO strings).
 * Uses UTC calendar days. "Current" streak is only non-zero if the latest swing day is
 * today or yesterday vs UTC (gap ≤ 1 day); otherwise the streak is treated as broken.
 */
export function computeStreak(analysisIsoTimestamps: string[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (analysisIsoTimestamps.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dayKeys = [
    ...new Set(analysisIsoTimestamps.map(utcCalendarDayKey)),
  ].sort();

  let longestStreak = 0;
  let run = 1;
  for (let i = 1; i < dayKeys.length; i++) {
    const prev = dayKeys[i - 1]!;
    const cur = dayKeys[i]!;
    if (utcDaysBetweenEarlierAndLater(prev, cur) === 1) {
      run += 1;
    } else {
      longestStreak = Math.max(longestStreak, run);
      run = 1;
    }
  }
  longestStreak = Math.max(longestStreak, run);

  const todayKey = utcCalendarDayKeyFromNow();
  const lastKey = dayKeys[dayKeys.length - 1]!;
  const gapLatestToToday = utcDaysBetweenEarlierAndLater(lastKey, todayKey);

  let currentStreak = 0;
  if (gapLatestToToday <= 1) {
    const days = new Set(dayKeys);
    let probe = lastKey;
    while (days.has(probe)) {
      currentStreak += 1;
      probe = addUtcDays(probe, -1);
    }
  }

  return { currentStreak, longestStreak };
}

function parseCoachingOutput(raw: unknown): CoachingOutput | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as CoachingOutput;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CoachingOutput;
    } catch {
      return null;
    }
  }
  return null;
}

export async function submitDrillFeedback(params: {
  analysisId: string;
  originalSummary: string;
  originalDrill: string;
  primaryIssueTitle: string;
  primaryIssueDescription: string;
  feedback: 'helped' | 'still_struggling' | 'confused';
  playerProfile: {
    first_name?: string;
    age?: number;
    experience_level?: string;
  };
}): Promise<{
  response_text: string;
  adjusted_drill: string | null;
  encouragement: string;
} | null> {
  try {
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/drill-followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis_id: params.analysisId,
        original_summary: params.originalSummary,
        original_drill: params.originalDrill,
        primary_issue_title: params.primaryIssueTitle,
        primary_issue_description: params.primaryIssueDescription,
        feedback: params.feedback,
        player_profile: params.playerProfile,
      }),
    });
    if (!response.ok) return null;
    return (await response.json()) as {
      response_text: string;
      adjusted_drill: string | null;
      encouragement: string;
    };
  } catch {
    return null;
  }
}

export async function fetchProgressCoach(params: {
  userId: string;
  swings: SwingAnalysis[];
  playerProfile: {
    first_name?: string;
    age?: number;
    experience_level?: string | null;
  };
}): Promise<{
  summary: string;
  most_improved: string | null;
  focus_next: string;
  swings_analyzed: number;
  best_overall: number;
} | null> {
  try {
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/progress-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        swings: params.swings.map((s) => ({
          created_at: s.created_at,
          similarity_breakdown: s.similarity_breakdown,
        })),
        player_profile: params.playerProfile,
      }),
    });
    if (!response.ok) {
      if (__DEV__) {
        const errText = await response.text().catch(() => '');
        console.warn(
          '[fetchProgressCoach] failed:',
          response.status,
          errText.slice(0, 200)
        );
      }
      return null;
    }
    return (await response.json()) as {
      summary: string;
      most_improved: string | null;
      focus_next: string;
      swings_analyzed: number;
      best_overall: number;
    };
  } catch (e) {
    if (__DEV__) {
      console.warn('[fetchProgressCoach] error:', e instanceof Error ? e.message : e);
    }
    return null;
  }
}

export async function startAnalysisPipeline(
  userId: string,
  videoUri: string,
  onStatusChange?: (status: string, message: string) => void,
  profile?: Profile | null
): Promise<AnalysisPipelineResult> {
  try {
    onStatusChange?.('uploading', 'Creating analysis record...');

    const { id: analysisId, created_at: analysisCreatedAt, error: createError } =
      await createAnalysisRecord(userId, 'pending');

    if (createError) {
      return { analysis: null, error: createError };
    }

    const previousAnalysis = await getPreviousCompletedAnalysis(userId, analysisCreatedAt);
    let previous_swing: {
      created_at: string;
      similarity_scores: SimilarityBreakdown | null;
      overall_summary: string;
    } | undefined;
    if (previousAnalysis) {
      const prevCoaching = parseCoachingOutput(previousAnalysis.coaching_output);
      const prevBreakdown =
        previousAnalysis.similarity_breakdown ??
        prevCoaching?.similarity_scores ??
        null;
      previous_swing = {
        created_at: previousAnalysis.created_at,
        similarity_scores: prevBreakdown,
        overall_summary: (prevCoaching?.overall_summary ?? '').slice(0, 800),
      };
    }

    onStatusChange?.('uploading', 'Uploading video...');

    const { url: videoUrl, error: uploadError } = await uploadSwingVideo(
      userId,
      videoUri,
      analysisId
    );

    if (uploadError) {
      await updateAnalysisStatus(analysisId, 'failed');
      return { analysis: null, error: new Error(`Upload failed: ${uploadError.message}`) };
    }

    await supabase
      .from('swing_analyses')
      .update({ video_url: videoUrl, status: 'processing' })
      .eq('id', analysisId);

    onStatusChange?.('processing', 'Extracting body keypoints with MoveNet...');

    const backendUrl = await getBackendUrl();
    const urlPreview = videoUrl.length > 80 ? `${videoUrl.slice(0, 80)}...` : videoUrl;
    console.log(`[Pipeline] Analyzing video analysis_id=${analysisId} url=${urlPreview}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          video_url: videoUrl,
          user_id: userId,
          player_profile: profile
            ? {
                first_name: profile.first_name,
                age: profile.age,
                primary_position: profile.primary_position,
                batting_side: profile.batting_side,
                height_feet: profile.height_feet,
                height_inches: profile.height_inches,
                experience_level: profile.experience_level ?? null,
              }
            : { age: 15 },
          ...(previous_swing ? { previous_swing } : {}),
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      await updateAnalysisStatus(analysisId, 'failed');
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return { analysis: null, error: new Error(`Cannot reach analysis server: ${msg}`) };
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      await updateAnalysisStatus(analysisId, 'failed');
      let message = `Analysis failed (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        const d = errJson?.detail ?? errJson;
        if (typeof d === 'object' && d?.error === 'no_swing_detected' && d?.message) {
          message = d.message;
        } else if (typeof d === 'string') {
          message = d;
        } else if (typeof d === 'object' && d?.message) {
          message = d.message;
        }
      } catch {
        if (errText) message = errText;
      }
      return { analysis: null, error: new Error(message) };
    }

    onStatusChange?.('processing', 'AI coach is reviewing your swing...');

    const result = await response.json();

    const coachingOutput = parseCoachingOutput(result.coaching_output);
    const similarityBreakdown = coachingOutput?.similarity_scores ?? null;

    const { data: updated, error: updateError } = await supabase
      .from('swing_analyses')
      .update({
        keypoint_data: result.keypoint_data,
        coaching_output: coachingOutput,
        bat_speed_mph: coachingOutput?.bat_speed_estimate?.mph ?? null,
        similarity_score: similarityBreakdown?.overall ?? null,
        similarity_breakdown: similarityBreakdown,
        key_frames: result.key_frames ?? null,
        status: 'completed',
      })
      .eq('id', analysisId)
      .select('*')
      .single();

    if (updateError) {
      return { analysis: null, error: updateError as Error };
    }

    trackEvent('swing_analysis_completed', {
      overall_score: similarityBreakdown?.overall ?? null,
      experience_level: profile?.experience_level ?? null,
      primary_issue: coachingOutput?.primary_mechanical_issue?.title ?? null,
    });

    await logAnalysisCompleted(userId, analysisId, coachingOutput);

    onStatusChange?.('completed', 'Analysis complete!');

    return { analysis: updated as SwingAnalysis, error: null };
  } catch (err) {
    return { analysis: null, error: err as Error };
  }
}

export async function pollAnalysisStatus(
  analysisId: string
): Promise<SwingAnalysis | null> {
  const { data } = await supabase
    .from('swing_analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  return data as SwingAnalysis | null;
}

export async function getUserAnalyses(
  userId: string,
  limit = 20
): Promise<SwingAnalysis[]> {
  const { data } = await supabase
    .from('swing_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = (data as SwingAnalysis[]) ?? [];
  if (__DEV__ && rows.length > 0) {
    console.log('[getUserAnalyses] first row (raw JSON):', JSON.stringify(rows[0], null, 2));
  }
  return rows;
}

/** Completed analyses for `userId` with `created_at` in the current local calendar month. */
export async function getCompletedAnalysesCountThisMonth(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const startIso = startOfMonth.toISOString();
  const endIso = endOfMonth.toISOString();

  const { count, error } = await supabase
    .from('swing_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    console.warn('[analysis] getCompletedAnalysesCountThisMonth:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function deleteAnalysis(
  userId: string,
  analysisId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('swing_analyses')
    .delete()
    .eq('id', analysisId)
    .eq('user_id', userId);

  return { error: error ? new Error(error.message) : null };
}

async function updateAnalysisStatus(
  analysisId: string,
  status: 'completed' | 'failed'
) {
  await supabase
    .from('swing_analyses')
    .update({ status })
    .eq('id', analysisId);
}

async function logAnalysisCompleted(
  userId: string,
  analysisId: string,
  coaching: CoachingOutput | null
) {
  const events: Array<{
    user_id: string;
    event_type: string;
    event_data: Record<string, unknown>;
  }> = [
    {
      user_id: userId,
      event_type: 'analysis_completed',
      event_data: {
        analysis_id: analysisId,
        similarity_score: coaching?.similarity_scores?.overall,
      },
    },
  ];

  if (coaching?.bat_speed_estimate?.mph) {
    events.push({
      user_id: userId,
      event_type: 'bat_speed_recorded',
      event_data: {
        analysis_id: analysisId,
        bat_speed_mph: coaching.bat_speed_estimate.mph,
      },
    });
  }

  await supabase.from('activity_log').insert(events);

  try {
    await supabase.rpc('increment_analysis_count', { p_user_id: userId });
  } catch {
    // RPC not set up yet — safe to skip in Phase 0
  }
}
