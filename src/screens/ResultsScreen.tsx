import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
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

  useEffect(() => {
    const fetchAnalysis = async () => {
      const data = await pollAnalysisStatus(analysisId);
      setAnalysis(data);
      setLoading(false);
    };
    fetchAnalysis();
  }, [analysisId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Analysis not found</Text>
      </View>
    );
  }

  const coaching = analysis.coaching_output as CoachingOutput | null;
  const breakdown = analysis.similarity_breakdown as SimilarityBreakdown | null;

  return (
    <ScrollView
      style={styles.container}
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

      {/* Overall Score */}
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

      {/* Bat Speed */}
      {analysis.bat_speed_mph != null && (
        <SectionCard title="Bat Speed" icon="speedometer">
          <View style={styles.batSpeedRow}>
            <Text style={styles.batSpeedValue}>
              {Math.round(analysis.bat_speed_mph)}
            </Text>
            <Text style={styles.batSpeedUnit}>mph</Text>
          </View>
          {coaching?.bat_speed_estimate?.confidence && (
            <Text style={styles.confidenceLabel}>
              Confidence: {coaching.bat_speed_estimate.confidence}
            </Text>
          )}
          {coaching?.bat_speed_estimate?.reasoning && (
            <Text style={styles.reasoningText}>
              {coaching.bat_speed_estimate.reasoning}
            </Text>
          )}
        </SectionCard>
      )}

      {/* Observations */}
      {coaching?.observations && coaching.observations.length > 0 && (
        <SectionCard title="Mechanical Observations" icon="eye">
          {coaching.observations.map((obs, i) => (
            <View key={i} style={styles.observationItem}>
              <View style={styles.observationHeader}>
                <View
                  style={[
                    styles.obsBadge,
                    obs.type === 'strength'
                      ? styles.obsBadgeStrength
                      : styles.obsBadgeImprovement,
                  ]}
                >
                  <Text style={styles.obsBadgeText}>
                    {obs.type === 'strength' ? 'Strength' : 'Work On'}
                  </Text>
                </View>
                {obs.frame_range && (
                  <Text style={styles.frameRange}>{obs.frame_range}</Text>
                )}
              </View>
              <Text style={styles.obsTitle}>{obs.title}</Text>
              <Text style={styles.obsDescription}>{obs.description}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Priority Fixes */}
      {coaching?.priority_fixes && coaching.priority_fixes.length > 0 && (
        <SectionCard title="Priority Fixes" icon="build">
          {coaching.priority_fixes.map((fix, i) => (
            <View key={i} style={styles.fixItem}>
              <View style={styles.fixNumber}>
                <Text style={styles.fixNumberText}>{i + 1}</Text>
              </View>
              <View style={styles.fixContent}>
                <Text style={styles.fixTitle}>{fix.title}</Text>
                <Text style={styles.fixDescription}>{fix.description}</Text>
                {fix.what_it_should_look_like && (
                  <View style={styles.idealBox}>
                    <Text style={styles.idealLabel}>What it should look like:</Text>
                    <Text style={styles.idealText}>
                      {fix.what_it_should_look_like}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Drill Recommendations */}
      {coaching?.drill_recommendations &&
        coaching.drill_recommendations.length > 0 && (
          <SectionCard title="Recommended Drills" icon="fitness">
            {coaching.drill_recommendations.map((drill, i) => (
              <View key={i} style={styles.drillItem}>
                <Text style={styles.drillName}>{drill.name}</Text>
                <Text style={styles.drillTargets}>Targets: {drill.targets}</Text>
                <Text style={styles.drillDescription}>{drill.description}</Text>
                {drill.how_to && (
                  <View style={styles.howToBox}>
                    <Text style={styles.howToLabel}>How to do it:</Text>
                    <Text style={styles.howToText}>{drill.how_to}</Text>
                  </View>
                )}
              </View>
            ))}
          </SectionCard>
        )}

      {/* Overall Summary */}
      {coaching?.overall_summary && (
        <SectionCard title="Coach's Summary" icon="chatbubble-ellipses">
          <Text style={styles.summaryText}>{coaching.overall_summary}</Text>
        </SectionCard>
      )}

      <TouchableOpacity
        style={styles.newAnalysisButton}
        onPress={() => navigation.navigate('Upload')}
      >
        <Ionicons name="add-circle" size={22} color={COLORS.black} />
        <Text style={styles.newAnalysisText}>Analyze Another Swing</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  observationItem: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  obsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  obsBadgeStrength: {
    backgroundColor: COLORS.success + '30',
  },
  obsBadgeImprovement: {
    backgroundColor: COLORS.warning + '30',
  },
  obsBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.text,
  },
  frameRange: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  obsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  obsDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  fixItem: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  fixNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixNumberText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLORS.white,
  },
  fixContent: {
    flex: 1,
  },
  fixTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  fixDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  idealBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryLight,
  },
  idealLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginBottom: 4,
  },
  idealText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  drillItem: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  drillName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  drillTargets: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  drillDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  howToBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  howToLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  howToText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  summaryText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
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
