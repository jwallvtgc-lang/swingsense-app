import { supabase } from '../config/supabase';
import { getBackendUrl } from '../config/constants';
import { SwingAnalysis, CoachingOutput, SimilarityBreakdown, Profile } from '../types';
import { uploadSwingVideo } from './storage';

interface AnalysisPipelineResult {
  analysis: SwingAnalysis | null;
  error: Error | null;
}

export async function createAnalysisRecord(
  userId: string,
  videoUrl: string
): Promise<{ id: string; error: Error | null }> {
  const { data, error } = await supabase
    .from('swing_analyses')
    .insert({
      user_id: userId,
      video_url: videoUrl,
      status: 'uploading',
    })
    .select('id')
    .single();

  if (error) return { id: '', error: new Error(`DB insert failed: ${error.message}`) };
  return { id: data.id, error: null };
}

export async function startAnalysisPipeline(
  userId: string,
  videoUri: string,
  onStatusChange?: (status: string, message: string) => void,
  profile?: Profile | null
): Promise<AnalysisPipelineResult> {
  try {
    onStatusChange?.('uploading', 'Creating analysis record...');

    const { id: analysisId, error: createError } = await createAnalysisRecord(
      userId,
      'pending'
    );

    if (createError) {
      return { analysis: null, error: createError };
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
          player_profile: profile ? {
            first_name: profile.first_name,
            age: profile.age,
            primary_position: profile.primary_position,
            batting_side: profile.batting_side,
            height_feet: profile.height_feet,
            height_inches: profile.height_inches,
          } : undefined,
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
      return { analysis: null, error: new Error(`Analysis failed (${response.status}): ${errText}`) };
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

  return (data as SwingAnalysis[]) ?? [];
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
