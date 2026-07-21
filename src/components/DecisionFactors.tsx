import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  fontSizes,
  fontWeights,
  getCore5BandColor,
  getScoreColor,
  letterSpacing,
  radius,
  scoreCard,
  scoreRing,
  spacing,
  typography,
} from '../../design-system/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface DecisionFactorsProps {
  stanceScore: number | null;
  loadScore: number | null;
  powerPositionScore: number | null;
  slotScore: number | null;
  balanceAtContactScore: number | null;
  primaryIssue?: string;
  score?: number;
  delta?: number | null;
}

type FactorRow = {
  key: string;
  label: string;
  description: string;
  score: number | null;
};

const FACTORS: Omit<FactorRow, 'score'>[] = [
  {
    key: 'stance',
    label: 'Stance',
    description: 'Setup position, posture and athletic balance',
  },
  {
    key: 'load',
    label: 'Load',
    description: 'Hip and hand load back before the stride',
  },
  {
    key: 'power_position',
    label: 'Power Position',
    description: 'Lower half coiled, stride foot planted, hands back',
  },
  {
    key: 'slot',
    label: 'Slot',
    description: 'Back knee and elbow pressing toward contact',
  },
  {
    key: 'balance',
    label: 'Balance at Contact',
    description: 'Head stability and weight transfer through the ball',
  },
];

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findPrimaryKey(rows: FactorRow[], primaryIssue?: string): string | null {
  if (primaryIssue?.trim()) {
    const p = normalize(primaryIssue);
    // Pass 1 — exact match or prefix match (most specific wins, first row match returned)
    for (const row of rows) {
      const l = normalize(row.label);
      if (p === l || p.startsWith(l) || l.startsWith(p)) {
        return row.key;
      }
    }
    // Pass 2 — whole-label substring (e.g. "Power Position" inside a longer title)
    for (const row of rows) {
      const l = normalize(row.label);
      if (p.includes(l)) {
        return row.key;
      }
    }
  }
  // Fallback — badge goes on the lowest-scoring mechanic with a score
  const withScores = rows.filter((r): r is FactorRow & { score: number } => r.score != null);
  if (withScores.length === 0) return null;
  return withScores.reduce((min, r) => (r.score < min.score ? r : min)).key;
}

function buildSummary(scores: number[]): string {
  let issues = 0;
  let improve = 0;
  for (const s of scores) {
    if (s < 50) issues += 1;
    else if (s < 70) improve += 1;
  }
  const parts: string[] = [];
  if (issues > 0) {
    parts.push(`${issues} issue${issues === 1 ? '' : 's'}`);
  }
  if (improve > 0) {
    parts.push(`${improve} ${improve === 1 ? 'area' : 'areas'} to improve`);
  }
  if (parts.length === 0) {
    return 'Strong across all factors';
  }
  return parts.join(' · ');
}

export default function DecisionFactors({
  stanceScore,
  loadScore,
  powerPositionScore,
  slotScore,
  balanceAtContactScore,
  primaryIssue,
  score,
  delta,
}: DecisionFactorsProps) {
  const [expanded, setExpanded] = useState(false);

  const rows: FactorRow[] = useMemo(
    () => [
      { ...FACTORS[0], score: stanceScore },
      { ...FACTORS[1], score: loadScore },
      { ...FACTORS[2], score: powerPositionScore },
      { ...FACTORS[3], score: slotScore },
      { ...FACTORS[4], score: balanceAtContactScore },
    ],
    [stanceScore, loadScore, powerPositionScore, slotScore, balanceAtContactScore]
  );

  const numericScores = useMemo(
    () => rows.map((r) => r.score).filter((s): s is number => s != null),
    [rows]
  );

  const primaryKey = useMemo(() => findPrimaryKey(rows, primaryIssue), [rows, primaryIssue]);

  if (numericScores.length === 0) {
    return null;
  }

  const summary = buildSummary(numericScores);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const scoreBandColor = score != null ? getScoreColor(score) : colors.text.muted;

  const trendText = (() => {
    if (score == null) return '';
    if (delta == null) return '1st swing';
    if (delta > 0) return `+${delta} from last`;
    if (delta < 0) return `${delta} from last`;
    return 'no change';
  })();

  const trendColor = (() => {
    if (delta == null || delta === 0) return colors.text.muted;
    return delta > 0 ? colors.text.green : colors.text.muted;
  })();

  return (
    <View style={styles.card}>
      {/* Top: score circle (left) + pips + summary (right) */}
      <View style={styles.mergedTop}>
        {score != null && (
          <View style={styles.scoreColumn}>
            <View style={[styles.scoreCircle, { borderColor: scoreBandColor }]}>
              <Text
                style={[styles.scoreNumber, { color: scoreBandColor }]}
                maxFontSizeMultiplier={1.35}
              >
                {Math.round(score)}
              </Text>
            </View>
            <Text
              style={[styles.trendText, { color: trendColor }]}
              maxFontSizeMultiplier={1.35}
            >
              {trendText}
            </Text>
          </View>
        )}
        <View style={styles.factorsColumn}>
          <View style={styles.pipRow}>
            {rows.map((r) => (
              <View
                key={r.key}
                style={[
                  styles.pip,
                  {
                    backgroundColor:
                      r.score != null ? getCore5BandColor(r.score) : colors.text.hint,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      </View>

      {/* Expand toggle */}
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.expandRow, pressed && styles.expandRowPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? 'Collapse decision factors' : 'Expand decision factors'
        }
      >
        <Text style={styles.hintText}>See what drove this score</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.text.muted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.expanded}>
          {rows.map((row) => {
            const hasScore = row.score != null;
            const scoreVal = row.score ?? 0;
            const isPrimary = row.key === primaryKey;

            return (
              <View key={row.key} style={styles.factorBlock}>
                <View style={styles.factorTitleRow}>
                  <View style={styles.factorTitleLeft}>
                    <Text style={styles.factorName}>{row.label}</Text>
                    {isPrimary ? (
                      <View style={styles.primaryTag}>
                        <Text style={styles.primaryTagText}>Primary issue</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.factorScore}>{hasScore ? row.score : '—'}</Text>
                </View>
                <View style={styles.barTrack}>
                  {hasScore ? (
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(100, Math.max(0, scoreVal))}%`,
                          backgroundColor: getCore5BandColor(scoreVal),
                        },
                      ]}
                    />
                  ) : null}
                </View>
                <Text style={styles.factorDesc}>{row.description}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
  },
  mergedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.iconGap,
  },
  scoreColumn: {
    alignItems: 'center',
    gap: spacing.pillGap,
  },
  scoreCircle: {
    width: scoreCard.circleSize,
    height: scoreCard.circleSize,
    borderRadius: radius.circle,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: typography.display,
    fontSize: fontSizes.caption,
    letterSpacing: letterSpacing.tight,
  },
  trendText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    textAlign: 'center',
  },
  factorsColumn: {
    alignItems: 'flex-end',
    gap: spacing.iconGap,
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.pillGap,
  },
  pip: {
    width: spacing.subGrid,
    height: spacing.subGrid,
    borderRadius: radius.circle,
  },
  summaryText: {
    fontFamily: typography.body,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textAlign: 'right',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.iconGap,
  },
  expandRowPressed: {
    opacity: 0.92,
  },
  hintText: {
    fontFamily: typography.body,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
  expanded: {
    marginTop: spacing.cardGap,
    gap: spacing.cardGap,
  },
  factorBlock: {
    gap: spacing.pillGap,
  },
  factorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.pillGap,
    flexWrap: 'wrap',
  },
  factorTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.pillGap,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  factorName: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.body,
    color: colors.text.primary,
  },
  primaryTag: {
    paddingHorizontal: spacing.pillGap,
    paddingVertical: 2,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
  },
  primaryTagText: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.micro,
    letterSpacing: letterSpacing.label,
    color: colors.text.gold,
    textTransform: 'uppercase',
  },
  factorScore: {
    fontFamily: typography.display,
    fontSize: fontSizes.listScore,
    color: colors.text.primary,
    letterSpacing: letterSpacing.tight,
    minWidth: 36,
    textAlign: 'right',
  },
  barTrack: {
    height: spacing.pillGap,
    borderRadius: radius.xs,
    backgroundColor: scoreRing.trackColor,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  factorDesc: {
    fontFamily: typography.body,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
