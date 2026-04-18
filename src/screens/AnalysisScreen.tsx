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
import { Video, ResizeMode } from 'expo-av';

import BackNav from '../components/BackNav';
import DrillStep from '../components/DrillStep';
import FeedbackRow from '../components/FeedbackRow';
import PrimaryButton from '../components/PrimaryButton';
import ScoreRing from '../components/ScoreRing';
import SectionCard from '../components/SectionCard';
import StatDisplay from '../components/StatDisplay';
import SubScoreCard from '../components/SubScoreCard';
import TabSwitcher from '../components/TabSwitcher';
import { FEEDBACK_EMAIL } from '../config/constants';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { MainStackParamList } from '../navigation/types';
import {
  getPreviousCompletedAnalysis,
  pollAnalysisStatus,
  submitDrillFeedback,
} from '../services/analysis';
import { trackEvent } from '../services/analytics';
import type { CoachingOutput, SimilarityBreakdown, SwingAnalysis } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
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

function similarityScoresForRow(a: SwingAnalysis | null): SimilarityBreakdown | null {
  if (!a) return null;
  const co = a.coaching_output;
  return co?.similarity_scores ?? a.similarity_breakdown ?? null;
}

/** Same source order as HistoryScreen `listScore` — coaching overall, then row `similarity_score`. */
function heroOverallScore(a: SwingAnalysis | null): number {
  if (!a) return 0;
  const raw =
    a.coaching_output?.similarity_scores?.overall ?? a.similarity_score ?? 0;
  return Math.round(raw);
}

function parseDrillSteps(c: CoachingOutput | null): string[] {
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

type CompareMetricRow = {
  key: keyof SimilarityBreakdown;
  label: string;
  diff: number;
};

type AllCompareRow = {
  key: keyof SimilarityBreakdown;
  label: string;
  curr: number | null;
  prev: number | null;
  diff: number | null;
};

const COMPARE_KEYS: Array<{
  key: keyof SimilarityBreakdown;
  label: string;
}> = [
  { key: 'overall', label: 'Overall' },
  { key: 'hip_rotation', label: 'Hip rotation' },
  { key: 'weight_transfer', label: 'Weight transfer' },
  { key: 'bat_path', label: 'Bat path' },
  { key: 'contact_point', label: 'Contact' },
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
  const videoRef = useRef<Video>(null);
  const [activeTab, setActiveTab] = useState(TAB_RESULTS);
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [previousAnalysis, setPreviousAnalysis] = useState<SwingAnalysis | null>(null);
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

    const load = async () => {
      // Single row from `swing_analyses` by id (see `src/services/analysis.ts`).
      const data = await pollAnalysisStatus(analysisId);
      if (cancelled) return;
      setAnalysis(data);
      setLoading(false);
      if (data?.user_id) {
        const prev = await getPreviousCompletedAnalysis(data.user_id, data.created_at);
        if (!cancelled) setPreviousAnalysis(prev);
      } else {
        setPreviousAnalysis(null);
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
  const currScores = similarityScoresForRow(analysis);

  const heroScore = heroOverallScore(analysis);

  const hip = Math.round(currScores?.hip_rotation ?? 0);
  const weight = Math.round(currScores?.weight_transfer ?? 0);
  const batPath = Math.round(currScores?.bat_path ?? 0);
  const contact = Math.round(currScores?.contact_point ?? 0);

  const allCompareRows = useMemo((): AllCompareRow[] => {
    if (!previousAnalysis || !analysis) return [];

    const prevCoaching = previousAnalysis.coaching_output;
    const prevBreakdown =
      previousAnalysis.similarity_breakdown ??
      prevCoaching?.similarity_scores ??
      null;

    return COMPARE_KEYS.map(({ key, label }) => {
      let curr: number | null | undefined;
      let prev: number | null | undefined;
      if (key === 'overall') {
        curr =
          analysis.similarity_score ??
          currScores?.overall ??
          co?.similarity_scores?.overall;
        prev =
          previousAnalysis.similarity_score ??
          prevBreakdown?.overall ??
          prevCoaching?.similarity_scores?.overall;
      } else {
        curr = currScores?.[key];
        prev = prevBreakdown?.[key];
      }
      const currNorm = curr ?? null;
      const prevNorm = prev ?? null;
      const diff =
        currNorm != null && prevNorm != null
          ? Math.round(currNorm - prevNorm)
          : null;
      return {
        key,
        label,
        curr: currNorm,
        prev: prevNorm,
        diff,
      };
    });
  }, [analysis, previousAnalysis, currScores, co]);

  const compareRows = useMemo(
    () =>
      allCompareRows
        .filter((r) => r.diff != null && r.diff !== 0)
        .map(({ key, label, diff }) => ({ key, label, diff: diff! })),
    [allCompareRows]
  ) as CompareMetricRow[];

  const showCompareSection =
    previousAnalysis != null &&
    (compareRows.length > 0 ||
      (co?.vs_last_swing != null && String(co.vs_last_swing).trim().length > 0));

  const coachSummary = co?.overall_summary?.trim() ?? '';
  const keyTitle = co?.primary_mechanical_issue?.title?.trim() ?? '';
  const keyDescription = co?.primary_mechanical_issue?.description?.trim() ?? '';
  const drillSteps = useMemo(() => parseDrillSteps(co), [co]);

  const batMph =
    co?.bat_speed_estimate?.mph != null
      ? Math.round(co.bat_speed_estimate.mph)
      : analysis?.bat_speed_mph != null
        ? Math.round(analysis.bat_speed_mph)
        : null;

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
          <Text style={styles.kicker} maxFontSizeMultiplier={1.35}>
            SWING ANALYSIS
          </Text>
          <Text style={styles.dateLine} maxFontSizeMultiplier={1.35}>
            {formatAnalysisDate(analysis.created_at)}
          </Text>
        </View>

        <View style={styles.heroScore}>
          <ScoreRing score={heroScore} size="lg" showLabel />
        </View>

        <View style={styles.subGrid}>
          <View style={styles.subRow}>
            <SubScoreCard score={hip} label="Hip Rotation" />
            <SubScoreCard score={weight} label="Weight Transfer" />
          </View>
          <View style={styles.subRow}>
            <SubScoreCard score={batPath} label="Bat Path" />
            <SubScoreCard score={contact} label="Contact" />
          </View>
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
            {videoUrl ? (
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls={true}
                  isLooping={false}
                  shouldPlay={false}
                />
              </View>
            ) : null}
            {(keyTitle.length > 0 || keyDescription.length > 0) && (
              <SectionCard title="Quick Context">
                {keyTitle.length > 0 ? (
                  <Text style={styles.contextIssueTitle} maxFontSizeMultiplier={1.35}>
                    {keyTitle}
                  </Text>
                ) : null}
                {keyDescription.length > 0 ? (
                  <Text
                    style={[styles.bodyText, keyTitle.length > 0 && styles.contextIssueBody]}
                    maxFontSizeMultiplier={1.35}
                  >
                    {keyDescription}
                  </Text>
                ) : null}
              </SectionCard>
            )}
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
                <View style={styles.compareMetricGrid}>
                  {allCompareRows.map(({ key, label, curr, prev, diff }) => {
                    const isUp = diff != null && diff > 0;
                    const isDown = diff != null && diff < 0;
                    const isFlat = diff === 0 || diff == null;
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
                        <View style={styles.compareMetricScores}>
                          <Text style={styles.compareMetricPrev}>
                            {prev != null ? Math.round(prev) : '—'}
                          </Text>
                          <Text style={styles.compareMetricArrow}>→</Text>
                          <Text style={styles.compareMetricCurr}>
                            {curr != null ? Math.round(curr) : '—'}
                          </Text>
                          <Text style={[styles.compareMetricDelta, { color: deltaColor }]}>
                            {deltaText}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>
            ) : null}
            <SectionCard>
              <StatDisplay
                value={batMph != null ? `~${batMph}` : '—'}
                unit="mph"
                disclaimer="Estimate only — not radar-accurate"
              />
            </SectionCard>

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
              {drillSteps.length > 0 ? (
                <View style={styles.drillList}>
                  {drillSteps.map((text, i) => (
                    <DrillStep key={`${i}-${text.slice(0, 24)}`} step={i + 1} text={text} />
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
                        Still struggling
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
                        Confused
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
    fontFamily: typography.display,
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
  videoContainer: {
    marginTop: spacing.cardGap,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.bg.surface,
    aspectRatio: 9 / 16,
    maxHeight: 320,
    alignSelf: 'center',
    width: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  heroScore: {
    marginTop: spacing.sectionGap,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  subGrid: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
    gap: spacing.subGrid,
  },
  subRow: {
    flexDirection: 'row',
    gap: spacing.subGrid,
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
  },
  compareMetricScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  compareMetricPrev: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.text.muted,
    minWidth: 24,
    textAlign: 'right',
  },
  compareMetricArrow: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
  },
  compareMetricCurr: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    minWidth: 24,
    textAlign: 'right',
  },
  compareMetricDelta: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    minWidth: 44,
    textAlign: 'right',
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
  contextIssueTitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.actionCardTitle,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.actionCardTitle * 1.35), // 1.45/1.35 line height — readability tuned for this context
  },
  contextIssueBody: {
    marginTop: spacing.pillGap,
  },
  drillList: {
    gap: spacing.drillGap,
    alignSelf: 'stretch',
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
