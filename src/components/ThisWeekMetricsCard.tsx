import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import SectionCard from './SectionCard';
import type { SwingAnalysis } from '../types';
import { getISOWeek, getOverallScore, getThisWeekBounds, getLastWeekBounds } from '../utils/weekHelpers';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

export type Props = {
  swings: SwingAnalysis[];
};



const DAYS_IN_WEEK = 7;

export function ThisWeekMetricsCard({ swings }: Props) {
  const { thisWeekSwings, lastWeekSwings } = useMemo(() => {
    const now = new Date();
    const thisWeek = getThisWeekBounds(now);
    const lastWeek = getLastWeekBounds(now);

    const thisWeekSwings = swings.filter((swing) => {
      const swingDate = new Date(swing.created_at);
      return swingDate >= thisWeek.start && swingDate <= thisWeek.end;
    });

    const lastWeekSwings = swings.filter((swing) => {
      const swingDate = new Date(swing.created_at);
      return swingDate >= lastWeek.start && swingDate <= lastWeek.end;
    });

    return { thisWeekSwings, lastWeekSwings };
  }, [swings]);

  const { avgScore, delta, bestScore, dailySwings } = useMemo(() => {
    if (thisWeekSwings.length === 0) {
      return {
        avgScore: 0,
        delta: '—',
        bestScore: 0,
        dailySwings: new Array(DAYS_IN_WEEK).fill(false),
      };
    }

    const thisWeekScores = thisWeekSwings.map(getOverallScore);
    const avgScore = Math.round(thisWeekScores.reduce((sum, score) => sum + score, 0) / thisWeekScores.length);
    const bestScore = Math.max(...thisWeekScores);

    // Calculate delta vs last week
    let delta = '—';
    if (lastWeekSwings.length > 0) {
      const lastWeekScores = lastWeekSwings.map(getOverallScore);
      const lastWeekAvg = lastWeekScores.reduce((sum, score) => sum + score, 0) / lastWeekScores.length;
      const diff = Math.round(avgScore - lastWeekAvg);

      if (diff > 0) {
        delta = `↑ +${diff} pts`;
      } else if (diff < 0) {
        delta = `↓ ${diff} pts`;
      } else {
        delta = '—';
      }
    }

    // Calculate daily swings for bar chart (Mon-Sun)
    const dailySwings: boolean[] = new Array(DAYS_IN_WEEK).fill(false);

    for (const swing of thisWeekSwings) {
      const swingDate = new Date(swing.created_at);
      const dayIndex = (swingDate.getDay() + 6) % 7; // Monday = 0
      dailySwings[dayIndex] = true;
    }

    return { avgScore, delta, bestScore, dailySwings };
  }, [thisWeekSwings, lastWeekSwings]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  if (thisWeekSwings.length === 0) {
    return (
      <SectionCard>
        <Text style={styles.headerLabel} maxFontSizeMultiplier={1.35}>
          THIS WEEK
        </Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.35}>
            No swings this week yet
          </Text>
        </View>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <Text style={styles.headerLabel} maxFontSizeMultiplier={1.35}>
        THIS WEEK
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statColumn}>
          <Text style={styles.statValue} maxFontSizeMultiplier={1.35}>
            {avgScore}
          </Text>
          <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
            Avg Score
          </Text>
        </View>

        <View style={styles.statColumn}>
          <Text style={styles.statValue} maxFontSizeMultiplier={1.35}>
            {delta}
          </Text>
          <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
            vs last week
          </Text>
        </View>

        <View style={styles.statColumn}>
          <Text style={styles.statValue} maxFontSizeMultiplier={1.35}>
            {bestScore}
          </Text>
          <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
            Best Score
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {dailySwings.map((hasSwings, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: hasSwings ? colors.brand.emerald : colors.bg.surface },
                ]}
              />
              <Text style={styles.dayLabel} maxFontSizeMultiplier={1.35}>
                {dayLabels[index]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    color: colors.text.green,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    marginBottom: spacing.cardSm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.cardSm,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barContainer: {
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: 20,
    height: 24,
    borderRadius: 3,
  },
  dayLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.cardSm,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
    textAlign: 'center',
  },
});