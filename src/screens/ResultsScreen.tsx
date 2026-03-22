import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE } from '../config/constants';
import { pollAnalysisStatus } from '../services/analysis';
import type { SwingAnalysis, CoachingOutput, SimilarityBreakdown } from '../types';
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
    score >= 75 ? COLORS.success : score >= 50 ? COLORS.accent : COLORS.error;

  return (
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
        <Text style={[scoreStyles.scoreValue, { color, fontSize: size * 0.3 }]}>
          {score}
        </Text>
      </View>
      <Text style={scoreStyles.scoreLabel}>{label}</Text>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  ring: {
    alignItems: 'center',
  },
  ringInner: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    width: 90,
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
        <Ionicons name={icon} size={20} color={COLORS.accent} />
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

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
});

export default function ResultsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { analysisId } = route.params;

  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackHelpful, setFeedbackHelpful] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    const fetchAnalysis = async () => {
      const data = await pollAnalysisStatus(analysisId);
      setAnalysis(data);
      setLoading(false);
    };
    fetchAnalysis();
  }, [analysisId]);

  const goToHistory = () => {
    navigation.navigate('MainTabs', { screen: 'History' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goToHistory} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={COLORS.accent} />
            <Text style={styles.backLabel}>History</Text>
          </TouchableOpacity>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goToHistory} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={COLORS.accent} />
            <Text style={styles.backLabel}>History</Text>
          </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goToHistory} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.accent} />
          <Text style={styles.backLabel}>History</Text>
        </TouchableOpacity>
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
              size={100}
            />
          </View>
          {breakdown && (
            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownCell}>
                <ScoreRing score={breakdown.hip_rotation} label="Hip Rotation" size={56} />
              </View>
              <View style={styles.breakdownCell}>
                <ScoreRing score={breakdown.weight_transfer} label="Weight Transfer" size={56} />
              </View>
              <View style={styles.breakdownCell}>
                <ScoreRing score={breakdown.bat_path} label="Bat Path" size={56} />
              </View>
              <View style={styles.breakdownCell}>
                <ScoreRing score={breakdown.contact_point} label="Contact" size={56} />
              </View>
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

      {/* 3. Your Action Plan */}
      {(coaching?.primary_mechanical_issue || coaching?.drill) && (
        <SectionCard title="Your Action Plan" icon="construct">
          {coaching?.primary_mechanical_issue && (
            <View style={styles.actionPlanBlock}>
              <Text style={styles.actionPlanLabel}>Focus on</Text>
              <Text style={styles.actionPlanFixTitle}>{coaching.primary_mechanical_issue.title}</Text>
              <Text style={styles.tileContentText}>{coaching.primary_mechanical_issue.description}</Text>
            </View>
          )}
          {coaching?.drill && (
            <View style={[styles.actionPlanBlock, !coaching?.primary_mechanical_issue && styles.actionPlanBlockFirst]}>
              <Text style={styles.actionPlanLabel}>Try this drill</Text>
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
            <TouchableOpacity
              style={styles.thumbButton}
              onPress={() => setFeedbackHelpful('thumbs_up')}
            >
              <Text style={styles.thumbEmoji}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.thumbButton}
              onPress={() => setFeedbackHelpful('thumbs_down')}
            >
              <Text style={styles.thumbEmoji}>👎</Text>
            </TouchableOpacity>
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
            <TouchableOpacity
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
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.newAnalysisButton}
        onPress={() => navigation.navigate('Upload')}
      >
        <Ionicons name="add-circle" size={22} color={COLORS.black} />
        <Text style={styles.newAnalysisText}>Analyze Another Swing</Text>
      </TouchableOpacity>

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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  heroSection: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  heroDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  overallScoreRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  breakdownCell: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  batSpeedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  batSpeedValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.accent,
  },
  batSpeedUnit: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confidenceLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textTransform: 'capitalize',
  },
  reasoningText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  actionPlanBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  actionPlanBlockFirst: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  actionPlanLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionPlanFixTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  summaryText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  tileContentText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  drillSteps: {
    gap: SPACING.sm,
  },
  drillStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingLeft: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  drillStepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillStepNum: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.accent,
  },
  drillStepText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  feedbackSection: {
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  feedbackPrompt: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  thumbButton: {
    padding: SPACING.sm,
  },
  thumbEmoji: {
    fontSize: 32,
  },
  feedbackThanks: {
    fontSize: FONT_SIZE.md,
    color: COLORS.success,
    fontWeight: '600',
  },
  feedbackNegative: {
    gap: SPACING.md,
  },
  feedbackInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    marginTop: SPACING.sm,
  },
  sendFeedbackText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.black,
  },
  newAnalysisButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  newAnalysisText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.black,
  },
  bottomPadding: {
    height: SPACING.xxl,
  },
});
