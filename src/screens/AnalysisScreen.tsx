import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import BackNav from '../components/BackNav';
import DecisionFactors from '../components/DecisionFactors';
import DrillStep from '../components/DrillStep';
import FeedbackRow from '../components/FeedbackRow';
import PrimaryButton from '../components/PrimaryButton';
import ScoreCard from '../components/ScoreCard';
import ScoreRing from '../components/ScoreRing';
import SectionCard from '../components/SectionCard';
import SwingVideoPlayer from '../components/SwingVideoPlayer';
import TabSwitcher from '../components/TabSwitcher';
import { FEEDBACK_EMAIL } from '../config/constants';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { MainStackParamList } from '../navigation/types';
import {
  getAllCompletedAnalyses,
  getPreviousCompletedAnalysis,
  pollAnalysisStatus,
  submitDrillFeedback,
} from '../services/analysis';
import { trackEvent } from '../services/analytics';
import type { CoachingOutput, SwingAnalysis } from '../types';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  getCore5BandColor,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const TAB_RESULTS = 'Results';
const TAB_COACHING = 'Coaching';

/** Path inside bucket `swing-videos` from a full Supabase Storage object or signed URL. */
function swingVideosStoragePathFromUrl(url: string): string | null {
  const marker = '/swing-videos/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let path = url.slice(idx + marker.length);
  const q = path.indexOf('?');
  if (q !== -1) path = path.slice(0, q);
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw slice */
  }
  return path.length > 0 ? path : null;
}

type Nav = NativeStackNavigationProp<MainStackParamList, 'Analysis'>;
type Route = RouteProp<MainStackParamList, 'Analysis'>;

/** Same source order as HistoryScreen `listScore` — coaching overall, then row `similarity_score`. */
function heroOverallScore(a: SwingAnalysis | null): number {
  if (!a) return 0;
  const raw =
    a.coaching_output?.similarity_scores?.overall ?? a.similarity_score ?? 0;
  return Math.round(raw);
}

type ActionPlanDrill = {
  title: string;
  steps: { num: number; text: string }[];
  discomfort?: string;
  successCue?: string;
};

function extractDrillTitle(beforeSteps: string): string {
  const t = beforeSteps.trim();
  if (!t) return '';
  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const endingDrill = sentences.find((s) => /\bDrill\.?$/.test(s.trim()));
  if (endingDrill) return endingDrill.replace(/\.$/, '').trim();
  return sentences[0] ?? t;
}

function parseStepChunk(chunk: string): { num: number; text: string } | null {
  const trimmed = chunk.trim();
  const m = trimmed.match(/^Step\s*(\d+)\s*[—–\-]\s*(.+)$/is);
  if (m) return { num: parseInt(m[1], 10), text: m[2].trim() };
  const m2 = trimmed.match(/^Step\s*(\d+)\s*[\.:]\s*(.+)$/is);
  if (m2) return { num: parseInt(m2[1], 10), text: m2[2].trim() };
  const m3 = trimmed.match(/^Step\s*(\d+)\s+(.+)$/is);
  if (m3) return { num: parseInt(m3[1], 10), text: m3[2].trim() };
  return null;
}

/** Splits on Step 1–4 and "When you get it right"; pulls discomfort sentence when present. */
function parseStructuredDrillString(drillRaw: string): ActionPlanDrill | null {
  const raw = drillRaw.trim();
  if (!raw) return null;

  const whenRe = /\bWhen\s+you\s+get\s+it\s+right\b/i;
  const whenIdx = raw.search(whenRe);
  const beforeCue = whenIdx >= 0 ? raw.slice(0, whenIdx).trim() : raw;
  let successCue = '';
  if (whenIdx >= 0) {
    successCue = raw
      .slice(whenIdx)
      .replace(whenRe, '')
      .replace(/^[,:;\s\-–—]+/, '')
      .trim();
  }

  let stepsBlock = beforeCue;
  let discomfort: string | undefined;
  const weirdIdx = beforeCue.search(/\bThis\s+is\s+going\s+to\s+feel\s+weird\b/i);
  if (weirdIdx >= 0) {
    stepsBlock = beforeCue.slice(0, weirdIdx).trim();
    const weirdTail = beforeCue.slice(weirdIdx);
    const oneSentence = weirdTail.match(/^(.+?[.!?])(\s|$)/s);
    discomfort = oneSentence ? oneSentence[1].trim() : weirdTail.trim();
  }

  const rawParts = stepsBlock.split(/\s*(?=\bStep\s*[1-4]\b)/i);
  const titleCandidate = (rawParts[0] ?? '').trim();
  const stepChunks = rawParts.slice(1).map((s) => s.trim()).filter(Boolean);

  const steps: { num: number; text: string }[] = [];
  for (const chunk of stepChunks) {
    const parsed = parseStepChunk(chunk);
    if (parsed) steps.push(parsed);
  }

  if (steps.length === 0) return null;

  const title = extractDrillTitle(titleCandidate);

  return {
    title,
    steps,
    discomfort: discomfort?.trim() || undefined,
    successCue: successCue || undefined,
  };
}

function parseLegacyDrillSteps(c: CoachingOutput | null): string[] {
  if (!c) return [];
  const drillRaw = typeof c.drill === 'string' ? c.drill.trim() : '';
  if (drillRaw.length > 0) {
    let segments = drillRaw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+[\.)]\s*/, '').trim())
      .filter(Boolean);
    if (segments.length <= 1) {
      const single = segments[0] ?? drillRaw;
      const byNumber = single
        .split(/\s*(?=\d+[\.)]\s)/)
        .map((s) => s.replace(/^\d+[\.)]\s*/, '').trim())
        .filter(Boolean);
      if (byNumber.length > 1) {
        segments = byNumber;
      }
    }
    if (segments.length > 0) {
      return segments;
    }
  }
  const legacy = c.drill_recommendations;
  if (legacy != null && legacy.length > 0) {
    return legacy
      .map((d) => {
        const parts = [d.name, d.description, d.how_to].filter(
          (p): p is string => typeof p === 'string' && p.trim().length > 0
        );
        const line = parts.join(' — ');
        return line.length > 0 ? line : (d.targets ?? '');
      })
      .filter((s) => s.length > 0);
  }
  return [];
}

function parseActionPlanDrill(
  c: CoachingOutput | null
):
  | { kind: 'structured'; data: ActionPlanDrill }
  | { kind: 'legacy'; steps: string[] }
  | null {
  if (!c) return null;
  const drillRaw = typeof c.drill === 'string' ? c.drill.trim() : '';
  if (drillRaw.length > 0) {
    const structured = parseStructuredDrillString(drillRaw);
    if (structured) {
      return { kind: 'structured', data: structured };
    }
  }
  const legacySteps = parseLegacyDrillSteps(c);
  if (legacySteps.length > 0) {
    return { kind: 'legacy', steps: legacySteps };
  }
  return null;
}

function deltaIfBoth(
  curr: number | null | undefined,
  prev: number | null | undefined
): number | null {
  if (curr == null || prev == null) return null;
  return Math.round(Number(curr) - Number(prev));
}

const CORE5_COMPARE: Array<{
  key: keyof Pick<
    SwingAnalysis,
    | 'stance_score'
    | 'load_score'
    | 'power_position_score'
    | 'slot_score'
    | 'balance_at_contact_score'
  >;
  label: string;
}> = [
  { key: 'stance_score', label: 'Stance' },
  { key: 'load_score', label: 'Load' },
  { key: 'power_position_score', label: 'Power Position' },
  { key: 'slot_score', label: 'Slot' },
  { key: 'balance_at_contact_score', label: 'Balance at Contact' },
];

function formatPrevSwingDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatAnalysisDate(iso: string | undefined): string {
  if (iso == null) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { analysisId } = route.params;
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_RESULTS);
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [previousAnalysis, setPreviousAnalysis] = useState<SwingAnalysis | null>(null);
  const [allAnalyses, setAllAnalyses] = useState<SwingAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [drillFeedback, setDrillFeedback] = useState<
    'helped' | 'still_struggling' | 'confused' | null
  >(null);
  const [drillResponse, setDrillResponse] = useState<{
    response_text: string;
    adjusted_drill: string | null;
    encouragement: string;
  } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (analysis?.id !== analysisId) {
      setVideoUrl(null);
      return;
    }

    const raw = analysis.video_url?.trim();
    if (!raw) {
      setVideoUrl(null);
      return;
    }

    if (!raw.includes('supabase')) {
      setVideoUrl(raw);
      return;
    }

    setVideoUrl(null);
    let cancelled = false;
    (async () => {
      const path = swingVideosStoragePathFromUrl(raw);
      if (!path) {
        if (!cancelled) setVideoUrl(raw);
        return;
      }
      const { data, error } = await supabase.storage
        .from('swing-videos')
        .createSignedUrl(path, 3600);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        if (__DEV__) {
          console.warn('[AnalysisScreen] createSignedUrl failed:', error?.message);
        }
        setVideoUrl(null);
        return;
      }
      setVideoUrl(data.signedUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId, analysis?.id, analysis?.video_url]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnalysis(null);
    setPreviousAnalysis(null);
    setAllAnalyses([]);

    const load = async () => {
      // Single row from `swing_analyses` by id (see `src/services/analysis.ts`).
      const data = await pollAnalysisStatus(analysisId);
      if (cancelled) return;
      setAnalysis(data);
      setLoading(false);
      if (data?.user_id) {
        const [prev, all] = await Promise.all([
          getPreviousCompletedAnalysis(data.user_id, data.created_at),
          getAllCompletedAnalyses(data.user_id),
        ]);
        if (!cancelled) {
          setPreviousAnalysis(prev);
          setAllAnalyses(all);
        }
      } else {
        setPreviousAnalysis(null);
        setAllAnalyses([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  useEffect(() => {
    setDrillFeedback(null);
    setDrillResponse(null);
    setDrillLoading(false);
  }, [analysisId]);

  const goAnalyzeAnother = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'UploadTab' });
  }, [navigation]);

  const co = analysis?.coaching_output ?? null;

  const heroScore = heroOverallScore(analysis);

  const compareDeltaRows = useMemo(() => {
    if (!previousAnalysis || !analysis) return [];
    const rows: { key: string; label: string; diff: number }[] = [];

    const overallDiff = deltaIfBoth(
      analysis.similarity_score,
      previousAnalysis.similarity_score
    );
    if (overallDiff !== null) {
      rows.push({ key: 'overall', label: 'Overall', diff: overallDiff });
    }

    for (const { key, label } of CORE5_COMPARE) {
      const d = deltaIfBoth(analysis[key], previousAnalysis[key]);
      if (d !== null) {
        rows.push({ key, label, diff: d });
      }
    }

    return rows;
  }, [analysis, previousAnalysis]);

  const showCompareSection =
    previousAnalysis != null &&
    (compareDeltaRows.length > 0 ||
      (co?.vs_last_swing != null && String(co.vs_last_swing).trim().length > 0));

  const coachSummary = co?.overall_summary?.trim() ?? '';
  const keyTitle = co?.primary_mechanical_issue?.title?.trim() ?? '';
  const keyDescription = co?.primary_mechanical_issue?.description?.trim() ?? '';
  const actionPlanDrill = useMemo(() => parseActionPlanDrill(co), [co]);

  // Extract positive observation from overall_summary for "What's working" section
  const positiveObservation = useMemo(() => {
    const sentences = coachSummary.split(/\.(?:\s|$)/);
    const firstSentence = sentences[0]?.trim();
    if (firstSentence && firstSentence.length > 0) {
      return firstSentence.endsWith('.') ? firstSentence : firstSentence + '.';
    }

    // Fallback: find highest-scoring core 5 mechanic
    if (analysis) {
      const mechanicScores = CORE5_COMPARE.map(({ key, label }) => ({
        score: analysis[key],
        name: label,
      }))
        .filter((m): m is { score: number; name: string } => m.score != null)
        .sort((a, b) => b.score - a.score);

      if (mechanicScores.length > 0) {
        const bestMechanic = mechanicScores[0];
        return `${bestMechanic.name} is one of the stronger parts of your swing this session.`;
      }
    }

    return '';
  }, [coachSummary, analysis]);

  // Calculate delta for ScoreCard
  const scoreDelta = useMemo(() => {
    if (!analysis || !previousAnalysis) return null;

    const currentScore = heroOverallScore(analysis);
    const previousScore = heroOverallScore(previousAnalysis);
    return currentScore - previousScore;
  }, [analysis, previousAnalysis]);

  // Calculate recent scores for ScoreCard sparkline (last 3 scores, excluding current)
  const recentScores = useMemo(() => {
    if (!analysis) return [];

    // Filter out the current analysis and get the most recent 3 before it
    return allAnalyses
      .filter(a => a.id !== analysis.id)
      .slice(0, 3) // Take the 3 most recent (already sorted newest first)
      .map(a => heroOverallScore(a));
  }, [analysis, allAnalyses]);

  const handleDrillFeedback = async (
    feedback: 'helped' | 'still_struggling' | 'confused'
  ) => {
    if (drillFeedback || !analysis || !co) return;
    setDrillFeedback(feedback);
    trackEvent('drill_coach_triggered', {
      feedback,
      primary_issue: co.primary_mechanical_issue?.title ?? null,
    });
    setDrillLoading(true);
    const result = await submitDrillFeedback({
      analysisId: analysis.id,
      originalSummary: co.overall_summary ?? '',
      originalDrill: co.drill ?? '',
      primaryIssueTitle: co.primary_mechanical_issue?.title ?? '',
      primaryIssueDescription: co.primary_mechanical_issue?.description ?? '',
      feedback,
      playerProfile: {
        first_name: profile?.first_name,
        age: profile?.age,
        experience_level: profile?.experience_level ?? undefined,
      },
    });
    setDrillLoading(false);
    setDrillResponse(result);
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.text.gold} />
      </View>
    );
  }

  if (analysis == null) {
    return (
      <View style={[styles.screen, styles.centered, styles.missedPad]}>
        <Text style={styles.missedTitle} maxFontSizeMultiplier={1.35}>
          Analysis not found
        </Text>
        <PrimaryButton label="Back to history" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.screen,
            paddingBottom: insets.bottom + spacing.sectionGap * 2,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackNav label="History" onPress={() => navigation.goBack()} />

        <View style={styles.afterBack}>
          <Text style={styles.kicker} {...displayTitleProps} maxFontSizeMultiplier={1.35}>
            SWING ANALYSIS
          </Text>
          <Text style={styles.dateLine} maxFontSizeMultiplier={1.35}>
            {formatAnalysisDate(analysis.created_at)}
          </Text>
        </View>


        <View style={styles.afterSubGrid}>
          <TabSwitcher
            tabs={[TAB_RESULTS, TAB_COACHING]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </View>

        {activeTab === TAB_RESULTS ? (
          <View style={styles.tabPanels}>
            {/* 1. Video player with skeleton overlay */}
            {videoUrl ? (
              <SwingVideoPlayer
                videoUrl={videoUrl}
                keypoints={analysis?.keypoint_data}
                primaryIssue={co?.primary_mechanical_issue?.title}
              />
            ) : null}


            {/* 2. What's working - positive observation card */}
            {positiveObservation.length > 0 && (
              <SectionCard title="WHAT'S WORKING" titleColor={colors.text.green}>
                <Text style={styles.positiveObservation} maxFontSizeMultiplier={1.35}>
                  {positiveObservation}
                </Text>
              </SectionCard>
            )}

            {/* 3. ScoreCard - new compact score display */}
            <ScoreCard
              score={heroScore}
              delta={scoreDelta}
              recentScores={recentScores}
            />

            {/* 4. Mechanic breakdown - after ScoreCard */}
            <View style={styles.decisionFactorsWrap}>
              <DecisionFactors
                stanceScore={analysis?.stance_score ?? null}
                loadScore={analysis?.load_score ?? null}
                powerPositionScore={analysis?.power_position_score ?? null}
                slotScore={analysis?.slot_score ?? null}
                balanceAtContactScore={analysis?.balance_at_contact_score ?? null}
                primaryIssue={co?.primary_mechanical_issue?.title}
              />
            </View>

            {/* 5. Comparison - after mechanic breakdown */}
            {showCompareSection && previousAnalysis ? (
              <SectionCard
                title="Compared to your last swing"
                icon={
                  <Ionicons
                    name="git-compare-outline"
                    size={16}
                    color={colors.text.gold}
                  />
                }
              >
                <Text style={styles.comparePrevDate} maxFontSizeMultiplier={1.35}>
                  Last swing: {formatPrevSwingDate(previousAnalysis.created_at)}
                </Text>
                {!!co?.vs_last_swing?.trim() && (
                  <Text style={styles.compareSentence} maxFontSizeMultiplier={1.35}>
                    {String(co.vs_last_swing).trim()}
                  </Text>
                )}
                {compareDeltaRows.length > 0 ? (
                  <View style={styles.compareMetricGrid}>
                    {compareDeltaRows.map(({ key, label, diff }) => {
                      const isUp = diff > 0;
                      const isDown = diff < 0;
                      const isFlat = diff === 0;
                      const deltaColor = isUp
                        ? colors.text.green
                        : isDown
                          ? colors.text.red
                          : colors.text.muted;
                      const arrow = isUp ? '↑' : isDown ? '↓' : '→';
                      const deltaText = isFlat
                        ? '→'
                        : `${isUp ? '+' : ''}${diff} ${arrow}`;
                      return (
                        <View key={key} style={styles.compareMetricRow}>
                          <Text style={styles.compareMetricLabel} numberOfLines={1}>
                            {label}
                          </Text>
                          <Text
                            style={[styles.compareMetricDelta, { color: deltaColor }]}
                            maxFontSizeMultiplier={1.35}
                          >
                            {deltaText}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </SectionCard>
            ) : null}


            <View style={styles.afterTabContent}>
              <FeedbackRow
                selected={feedback}
                onPositive={() => setFeedback('up')}
                onNegative={() => setFeedback('down')}
              />
              {feedback === 'up' ? (
                <Text style={styles.feedbackThanks} maxFontSizeMultiplier={1.35}>
                  Thanks!
                </Text>
              ) : null}
              {feedback === 'down' ? (
                <View style={styles.feedbackNegative}>
                  <TextInput
                    style={styles.feedbackInput}
                    value={feedbackNote}
                    onChangeText={setFeedbackNote}
                    placeholder="Tell us more (optional)"
                    placeholderTextColor={colors.text.muted}
                    multiline
                    numberOfLines={3}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.sendFeedbackButton,
                      pressed && styles.sendFeedbackButtonPressed,
                    ]}
                    onPress={() => {
                      const subject = encodeURIComponent('SwingSense Beta Feedback');
                      const body = encodeURIComponent(
                        feedbackNote.trim()
                          ? feedbackNote.trim()
                          : "What worked? What didn't? (Even one word helps.)"
                      );
                      Linking.openURL(
                        `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
                      );
                    }}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18} // 16/18px icon sizes — standard small icons
                      color={colors.text.onGold}
                    />
                    <Text style={styles.sendFeedbackText} maxFontSizeMultiplier={1.35}>
                      Send feedback
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.tabPanels}>
            <SectionCard title="Coach Summary">
              {coachSummary.length > 0 ? (
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.35}>
                  {coachSummary}
                </Text>
              ) : (
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.35}>
                  No summary for this analysis.
                </Text>
              )}
            </SectionCard>
            <SectionCard title="Action Plan">
              {actionPlanDrill?.kind === 'structured' ? (
                <View style={styles.drillList}>
                  {actionPlanDrill.data.title.length > 0 ? (
                    <Text style={styles.drillPlanTitle} maxFontSizeMultiplier={1.35}>
                      {actionPlanDrill.data.title}
                    </Text>
                  ) : null}
                  {actionPlanDrill.data.steps.map((s) => (
                    <DrillStep key={`step-${s.num}`} step={s.num} text={s.text} />
                  ))}
                  {actionPlanDrill.data.discomfort ? (
                    <Text style={styles.drillDiscomfort} maxFontSizeMultiplier={1.35}>
                      {actionPlanDrill.data.discomfort}
                    </Text>
                  ) : null}
                  {actionPlanDrill.data.successCue ? (
                    <Text style={styles.drillSuccessCue} maxFontSizeMultiplier={1.35}>
                      {actionPlanDrill.data.successCue}
                    </Text>
                  ) : null}
                </View>
              ) : actionPlanDrill?.kind === 'legacy' ? (
                <View style={styles.drillList}>
                  {actionPlanDrill.steps.map((text, i) => (
                    <DrillStep
                      key={`${i}-${text.slice(0, 24)}`}
                      step={i + 1}
                      text={text}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.35}>
                  No drill steps for this analysis.
                </Text>
              )}
            </SectionCard>

            {/* Drill Coach feedback */}
            <SectionCard>
              {!drillFeedback && (
                <>
                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: fontSizes.caption,
                      color: colors.text.muted,
                      letterSpacing: letterSpacing.cta,
                      textTransform: 'uppercase',
                      marginBottom: spacing.cardSm,
                    }}
                  >
                    Did you try this drill?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.pillGap }}>
                    <Pressable
                      onPress={() => void handleDrillFeedback('helped')}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          backgroundColor: colors.bg.greenDim,
                          borderRadius: radius.pill,
                          paddingVertical: spacing.tabInner,
                          alignItems: 'center',
                        },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body,
                          fontSize: fontSizes.body,
                          color: colors.text.green,
                          fontWeight: fontWeights.medium,
                        }}
                      >
                        It helped
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleDrillFeedback('still_struggling')}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          backgroundColor: colors.bg.surface,
                          borderRadius: radius.pill,
                          paddingVertical: spacing.tabInner,
                          alignItems: 'center',
                        },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body,
                          fontSize: fontSizes.body,
                          color: colors.text.muted,
                          fontWeight: fontWeights.medium,
                        }}
                      >
                        Need more reps
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleDrillFeedback('confused')}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          backgroundColor: colors.bg.surface,
                          borderRadius: radius.pill,
                          paddingVertical: spacing.tabInner,
                          alignItems: 'center',
                        },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body,
                          fontSize: fontSizes.body,
                          color: colors.text.muted,
                          fontWeight: fontWeights.medium,
                        }}
                      >
                        Try another drill
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {drillLoading && <ActivityIndicator color={colors.text.gold} />}

              {drillResponse && !drillLoading && (
                <>
                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: fontSizes.body,
                      color: colors.text.secondary,
                      lineHeight: fontSizes.body * 1.6, // 1.6 line height — readability tuned for coach response text
                      marginBottom: spacing.cardSm,
                    }}
                  >
                    {drillResponse.response_text}
                  </Text>

                  {drillResponse.adjusted_drill ? (
                    <View
                      style={{
                        backgroundColor: colors.bg.base,
                        borderRadius: radius.subCard,
                        padding: spacing.cardSm,
                        marginBottom: spacing.cardSm,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body,
                          fontSize: fontSizes.caption,
                          color: colors.text.green,
                          letterSpacing: letterSpacing.cta,
                          textTransform: 'uppercase',
                          marginBottom: spacing.iconGap,
                        }}
                      >
                        Try this instead
                      </Text>
                      <Text
                        style={{
                          fontFamily: typography.body,
                          fontSize: fontSizes.body,
                          color: colors.text.secondary,
                          lineHeight: fontSizes.body * 1.6, // 1.6 line height — readability tuned for coach response text
                        }}
                      >
                        {drillResponse.adjusted_drill}
                      </Text>
                    </View>
                  ) : null}

                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: fontSizes.caption,
                      color: colors.text.muted,
                      fontStyle: 'italic',
                    }}
                  >
                    {drillResponse.encouragement}
                  </Text>
                </>
              )}
            </SectionCard>
          </View>
        )}

        <View style={styles.cta}>
          <PrimaryButton label="Analyze Another Swing" onPress={goAnalyzeAnother} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  missedPad: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sectionGap,
  },
  missedTitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
  },
  afterBack: {
    marginTop: spacing.cardGap,
    alignSelf: 'stretch',
  },
  kicker: {
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.analysisKicker,
    letterSpacing: letterSpacing.label,
    color: colors.text.primary,
    textTransform: 'uppercase',
  },
  dateLine: {
    marginTop: spacing.pillGap,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
  },
  positiveObservation: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.green,
    lineHeight: Math.round(fontSizes.body * 1.45),
  },
  heroScore: {
    marginTop: spacing.sectionGap,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  decisionFactorsWrap: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
  },
  afterSubGrid: {
    marginTop: spacing.cardGap,
    alignSelf: 'stretch',
  },
  comparePrevDate: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    marginBottom: spacing.pillGap,
  },
  compareSentence: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.45), // 1.45/1.35 line height — readability tuned for this context
    marginBottom: spacing.cardGap,
  },
  compareMetricGrid: {
    marginTop: spacing.cardGap,
    gap: spacing.pillGap,
  },
  compareMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.iconGap,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  compareMetricLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
    flex: 1,
    paddingRight: spacing.pillGap,
  },
  compareMetricDelta: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    minWidth: 56,
    textAlign: 'right',
    flexShrink: 0,
  },
  tabPanels: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  bodyText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.45), // 1.45/1.35 line height — readability tuned for this context
  },
  drillList: {
    gap: spacing.drillGap,
    alignSelf: 'stretch',
  },
  drillPlanTitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.actionCardTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.actionCardTitle * 1.35),
    marginBottom: spacing.iconGap,
  },
  drillDiscomfort: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
    lineHeight: Math.round(fontSizes.body * 1.45),
    marginTop: spacing.cardSm,
  },
  drillSuccessCue: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontStyle: 'italic',
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.45),
    marginTop: spacing.cardSm,
  },
  afterTabContent: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  feedbackThanks: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
  },
  feedbackNegative: {
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  feedbackInput: {
    alignSelf: 'stretch',
    minHeight: 88, // 88px feedback input min height — intentional UX decision
    paddingVertical: spacing.inputGap,
    paddingHorizontal: spacing.inputHorizontal,
    borderRadius: radius.subCard,
    borderWidth: 1, // 1px border — intentional for feedback input
    borderColor: colors.border.dim,
    backgroundColor: colors.bg.input,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
    textAlignVertical: 'top',
  },
  sendFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
    alignSelf: 'stretch',
    paddingVertical: spacing.inputVertical,
    paddingHorizontal: spacing.card,
    borderRadius: radius.card,
    backgroundColor: colors.bg.gold,
  },
  sendFeedbackButtonPressed: {
    opacity: 0.9, // pressed opacity — standard interaction feel
  },
  sendFeedbackText: {
    fontFamily: typography.display,
    fontSize: fontSizes.ctaLabel,
    letterSpacing: letterSpacing.cta,
    color: colors.text.onGold,
  },
  cta: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
  },
});
