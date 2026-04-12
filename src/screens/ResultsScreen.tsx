import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, FEEDBACK_EMAIL } from '../config/constants';
import {
  getPreviousCompletedAnalysis,
  pollAnalysisStatus,
  scoreDeltaDirection,
} from '../services/analysis';
import type {
  SwingAnalysis,
  CoachingOutput,
  SimilarityBreakdown,
} from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Results'>;
type Route = RouteProp<MainStackParamList, 'Results'>;

function ScoreRing({
  score,
  label,
  size = 80,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const color =
    score >= 75 ? COLORS.green : score >= 50 ? COLORS.accent : COLORS.red;

  return (
    <View style={[scoreStyles.ringColumn, { maxWidth: '100%' }]}>
      <View style={[scoreStyles.ring, { width: size, height: size }]}>
        <View
          style={[
            scoreStyles.ringInner,
            {
              width: size - 8,
              height: size - 8,
              borderRadius: (size - 8) / 2,
              borderColor: color,
            },
          ]}
        >
          <Text
            style={[scoreStyles.scoreValue, { color, fontSize: size * 0.3 }]}
            maxFontSizeMultiplier={1.4}
          >
            {score}
          </Text>
        </View>
      </View>
      <Text
        style={scoreStyles.scoreLabel}
        numberOfLines={2}
        maxFontSizeMultiplier={1.35}
      >
        {label}
      </Text>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  ringColumn: {
    alignItems: 'center',
    width: '100%',
  },
  ring: {
    alignItems: 'center',
  },
  ringInner: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontFamily: FONTS.bodySemiBold,
  },
  scoreLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    marginTop: 6,
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
  },
});

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <View style={cardStyles.cardIcon}>
          <Ionicons name={icon} size={16} color={COLORS.accent} />
        </View>
        <Text style={cardStyles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Parse drill text into numbered steps for display */
function parseDrillSteps(drill: string): Array<{ num: number; text: string }> {
  if (!drill?.trim()) return [];
  const steps: Array<{ num: number; text: string }> = [];
  // Match "Step N –", "Step N:", "Step N -", "N." (backend uses "Step 1 – action. Step 2 – ...")
  const re = /Step\s+(\d+)\s*[–:-]\s*([^]*?)(?=Step\s+\d+\s*[–:-]|$)/gi;
  let m;
  while ((m = re.exec(drill)) !== null) {
    const text = m[2].trim().replace(/\s+/g, ' ');
    if (text) steps.push({ num: parseInt(m[1], 10), text });
  }
  // Fallback: try "1. " or "1) " style
  if (steps.length === 0) {
    const alt = drill.split(/(?=\d+[.)]\s)/).filter(Boolean);
    alt.forEach((part, i) => {
      const t = part.replace(/^\d+[.)]\s*/, '').trim();
      if (t) steps.push({ num: i + 1, text: t.replace(/\s+/g, ' ') });
    });
  }
  if (steps.length === 0) return [{ num: 1, text: drill.trim() }];
  return steps;
}

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

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { analysisId } = route.params;
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [previousAnalysis, setPreviousAnalysis] = useState<SwingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackHelpful, setFeedbackHelpful] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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

  const goToHistory = () => {
    navigation.navigate('MainTabs', { screen: 'History' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable style={styles.backButton} onPress={goToHistory}>
            <Ionicons name="chevron-back" size={22} color={COLORS.accent} />
            <Text style={styles.backLabel}>History</Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable style={styles.backButton} onPress={goToHistory}>
            <Ionicons name="chevron-back" size={22} color={COLORS.accent} />
            <Text style={styles.backLabel}>History</Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Analysis not found</Text>
        </View>
      </View>
    );
  }

  const coaching = analysis.coaching_output as CoachingOutput | null;
  const breakdown = analysis.similarity_breakdown as SimilarityBreakdown | null;
  const prevCoaching = previousAnalysis?.coaching_output as CoachingOutput | null;
  const prevBreakdown =
    previousAnalysis?.similarity_breakdown ??
    prevCoaching?.similarity_scores ??
    null;

  const compareRows = previousAnalysis
    ? COMPARE_KEYS.map(({ key, label }) => {
        let curr: number | null | undefined;
        let prev: number | null | undefined;
        if (key === 'overall') {
          curr =
            analysis.similarity_score ??
            breakdown?.overall ??
            coaching?.similarity_scores?.overall;
          prev =
            previousAnalysis.similarity_score ??
            prevBreakdown?.overall ??
            prevCoaching?.similarity_scores?.overall;
        } else {
          curr = breakdown?.[key];
          prev = prevBreakdown?.[key];
        }
        const dir = scoreDeltaDirection(curr, prev);
        const diff =
          curr != null && prev != null ? Math.round(curr - prev) : null;
        return { key, label, dir, diff };
      }).filter((r) => r.dir != null || r.diff != null)
    : [];

  /** Inner width of SectionCard content: scroll padding + card padding */
  const scrollHorizontalPad = 28;
  const cardHorizontalPad = 20;
  const scoreCardInnerWidth = Math.max(
    260,
    windowWidth - scrollHorizontalPad * 2 - cardHorizontalPad * 2
  );
  const breakdownColWidth = scoreCardInnerWidth / 2;
  const smallRingSize = Math.round(
    Math.min(56, Math.max(42, breakdownColWidth * 0.36))
  );
  const overallRingSize = Math.min(
    100,
    Math.max(76, Math.round(scoreCardInnerWidth * 0.34))
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={goToHistory}>
          <Ionicons name="chevron-back" size={22} color={COLORS.accent} />
          <Text style={styles.backLabel}>History</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Swing Analysis</Text>
        <Text style={styles.heroDate}>
          {new Date(analysis.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* 1. Swing Score */}
      {analysis.similarity_score != null && (
        <SectionCard title="Swing Score" icon="trophy">
          <View style={styles.overallScoreRow}>
            <ScoreRing
              score={analysis.similarity_score}
              label="Overall"
              size={overallRingSize}
            />
          </View>
          {breakdown && (
            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownCell}>
                <ScoreRing
                  score={breakdown.hip_rotation}
                  label="Hip Rotation"
                  size={smallRingSize}
                />
              </View>
              <View style={styles.breakdownCell}>
                <ScoreRing
                  score={breakdown.weight_transfer}
                  label="Weight Transfer"
                  size={smallRingSize}
                />
              </View>
              <View style={styles.breakdownCell}>
                <ScoreRing
                  score={breakdown.bat_path}
                  label="Bat Path"
                  size={smallRingSize}
                />
              </View>
              <View style={styles.breakdownCell}>
                <ScoreRing
                  score={breakdown.contact_point}
                  label="Contact"
                  size={smallRingSize}
                />
              </View>
            </View>
          )}
        </SectionCard>
      )}

      {previousAnalysis && (compareRows.length > 0 || coaching?.vs_last_swing) && (
        <SectionCard title="Compared to your last swing" icon="git-compare-outline">
          <Text style={styles.comparePrevDate}>
            Last swing: {formatPrevSwingDate(previousAnalysis.created_at)}
          </Text>
          {!!coaching?.vs_last_swing?.trim() && (
            <Text style={styles.compareSentence}>{coaching.vs_last_swing.trim()}</Text>
          )}
          {compareRows.length > 0 && (
            <View style={styles.compareDeltas}>
              {compareRows.map(({ key, label, dir, diff }) => {
                const color =
                  dir === 'up'
                    ? COLORS.green
                    : dir === 'down'
                      ? COLORS.red
                      : COLORS.textMuted;
                const arrow =
                  dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
                return (
                  <View key={key} style={styles.compareRow}>
                    <Text style={styles.compareLabel} numberOfLines={1}>
                      {label}
                    </Text>
                    <Text style={[styles.compareDeltaText, { color }]}>
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff}` : '—'}{' '}
                      {arrow}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>
      )}

      {/* 2. Coach's Summary */}
      {coaching?.overall_summary && (
        <SectionCard title="Coach's Summary" icon="chatbubble-ellipses">
          <Text style={styles.tileContentText}>{coaching.overall_summary}</Text>
        </SectionCard>
      )}

      {/* 3. Your Action Plan — drill first (what to do); quick context after (why, compact) */}
      {(coaching?.primary_mechanical_issue || coaching?.drill) && (
        <SectionCard title="Your Action Plan" icon="construct">
          {coaching?.drill && (
            <View style={styles.actionPlanBlockFirst}>
              <Text style={[styles.actionPlanLabel, styles.drillLabel]}>Try this drill</Text>
              <View style={styles.drillSteps}>
                {parseDrillSteps(coaching.drill).map((step) => (
                  <View key={step.num} style={styles.drillStepRow}>
                    <View style={styles.drillStepBullet}>
                      <Text style={styles.drillStepNum}>{step.num}</Text>
                    </View>
                    <Text style={styles.drillStepText}>{step.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {coaching?.primary_mechanical_issue && (
            <View style={[styles.actionPlanBlock, !!coaching?.drill && styles.actionPlanBlockAfterDrill]}>
              <Text style={styles.actionPlanLabelMuted}>Quick context</Text>
              <Text style={styles.actionPlanFixTitleCompact}>{coaching.primary_mechanical_issue.title}</Text>
              {!!coaching.primary_mechanical_issue.description?.trim() && (
                <Text style={styles.actionPlanDescriptionCompact} numberOfLines={4}>
                  {coaching.primary_mechanical_issue.description}
                </Text>
              )}
            </View>
          )}
        </SectionCard>
      )}

      {/* 4. Bat Speed */}
      {analysis.bat_speed_mph != null && (
        <SectionCard title="Bat Speed" icon="speedometer">
          <View style={styles.batSpeedRow}>
            <Text style={styles.batSpeedValue}>
              ~{Math.round(analysis.bat_speed_mph)}
            </Text>
            <Text style={styles.batSpeedUnit}>mph</Text>
          </View>
          <Text style={styles.confidenceLabel}>
            Estimate only — not radar-accurate
          </Text>
          {(() => {
            const r = coaching?.bat_speed_estimate?.reasoning?.trim();
            const isSimple = r && r.length <= 80 && !/frame|F\d|coordinate|projection|velocity|calibrat|barrel|math|normalized|keypoint/i.test(r);
            return isSimple ? (
              <Text style={styles.reasoningText}>{r}</Text>
            ) : null;
          })()}
        </SectionCard>
      )}

      {/* Did this help? */}
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackPrompt}>Did this help?</Text>
        {feedbackHelpful == null ? (
          <View style={styles.thumbsRow}>
            <Pressable
              style={styles.thumbButton}
              onPress={() => setFeedbackHelpful('thumbs_up')}
            >
              <Text style={styles.thumbEmoji}>👍</Text>
            </Pressable>
            <Pressable
              style={styles.thumbButton}
              onPress={() => setFeedbackHelpful('thumbs_down')}
            >
              <Text style={styles.thumbEmoji}>👎</Text>
            </Pressable>
          </View>
        ) : feedbackHelpful === 'thumbs_up' ? (
          <Text style={styles.feedbackThanks}>Thanks!</Text>
        ) : (
          <View style={styles.feedbackNegative}>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Tell us more (optional)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
            <Pressable
              style={styles.sendFeedbackButton}
              onPress={() => {
                const subject = encodeURIComponent('SwingSense Beta Feedback');
                const body = encodeURIComponent(
                  feedbackText.trim()
                    ? feedbackText.trim()
                    : 'What worked? What didn\'t? (Even one word helps.)'
                );
                Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`);
              }}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.black} />
              <Text style={styles.sendFeedbackText}>Send feedback</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.newAnalysisButton, pressed && styles.ctaPressed]}
        onPress={() => navigation.navigate('Upload')}
      >
        <Text style={styles.newAnalysisPlus}>+</Text>
        <Text style={styles.newAnalysisText}>Analyze Another Swing</Text>
      </Pressable>

      <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
  },
  heroSection: {
    marginBottom: 24,
    marginTop: 0,
    paddingTop: 8,
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 48,
    color: COLORS.text,
    letterSpacing: 1,
    lineHeight: 48,
  },
  heroDate: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  comparePrevDate: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  compareSentence: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    lineHeight: 21,
    marginBottom: 12,
  },
  compareDeltas: {
    gap: 8,
    marginTop: 4,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compareLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text,
  },
  compareDeltaText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    minWidth: 56,
    textAlign: 'right',
  },
  overallScoreRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  breakdownCell: {
    width: '50%',
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  batSpeedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  batSpeedValue: {
    fontSize: 48,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  batSpeedUnit: {
    fontSize: 22,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textDim,
  },
  confidenceLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  reasoningText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    marginTop: 8,
    lineHeight: 20,
  },
  actionPlanBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionPlanBlockFirst: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  actionPlanBlockAfterDrill: {
    marginTop: 14,
    paddingTop: 14,
  },
  actionPlanLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  /** De-emphasized label for the mechanical-issue block (below drill) */
  actionPlanLabelMuted: {
    fontSize: 9,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  actionPlanFixTitle: {
    fontSize: 17,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  actionPlanFixTitleCompact: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textDim,
    lineHeight: 20,
    marginBottom: 4,
  },
  actionPlanDescriptionCompact: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  drillLabel: {
    color: COLORS.green,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    lineHeight: 23,
  },
  tileContentText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    lineHeight: 23,
  },
  drillSteps: {
    gap: 8,
  },
  drillStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green,
  },
  drillStepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillStepNum: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.green,
  },
  drillStepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    lineHeight: 23,
  },
  feedbackSection: {
    marginBottom: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  feedbackPrompt: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textDim,
    marginBottom: 8,
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  thumbButton: {
    padding: 8,
  },
  thumbEmoji: {
    fontSize: 32,
  },
  feedbackThanks: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.green,
  },
  feedbackNegative: {
    gap: 16,
  },
  feedbackInput: {
    backgroundColor: COLORS.surfaceHover,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendFeedbackText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  newAnalysisButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  newAnalysisPlus: {
    fontSize: 18,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
  },
  newAnalysisText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  bottomPadding: {
    height: 48,
  },
});
