import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontSizes,
  fontWeights,
  getScoreColor,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

export type ScoreCardProps = {
  score: number;
  delta: number | null;
  recentScores: number[];
};

export default function ScoreCard({ score, delta, recentScores }: ScoreCardProps) {
  const scoreBandColor = getScoreColor(score);

  const trendText = (() => {
    if (delta === null) return 'your first swing — baseline set';
    if (delta > 0) return `up ${delta} from last session`;
    if (delta < 0) return `down ${Math.abs(delta)} from last session`;
    return 'same as last session';
  })();

  const trendColor = (() => {
    if (delta === null || delta === 0) return colors.text.muted;
    return delta > 0 ? colors.text.green : colors.text.muted;
  })();

  return (
    <View style={styles.container}>
      {/* Score circle */}
      <View style={[styles.scoreCircle, { borderColor: scoreBandColor }]}>
        <Text
          style={[styles.scoreNumber, { color: scoreBandColor }]}
          maxFontSizeMultiplier={1.35}
        >
          {Math.round(score)}
        </Text>
      </View>

      {/* Trend text */}
      <View style={styles.trendContainer}>
        <Text style={[styles.trendText, { color: trendColor }]} maxFontSizeMultiplier={1.35}>
          {trendText}
        </Text>
      </View>

      {/* Mini sparkline */}
      {recentScores.length > 0 && (
        <View style={styles.sparklineContainer}>
          {recentScores.map((sparkScore, index) => {
            const height = Math.max(4, Math.round((sparkScore / 100) * 16)); // Scale 0-100 to 4-16px height
            return (
              <View
                key={index}
                style={[
                  styles.sparklineBar,
                  {
                    height,
                    backgroundColor: colors.core5.bandMid,
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.subCard,
    padding: spacing.cardSm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  scoreCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.circle,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: typography.display,
    fontSize: fontSizes.caption,
    letterSpacing: letterSpacing.tight,
    fontWeight: fontWeights.medium,
  },
  trendContainer: {
    flex: 1,
    marginLeft: spacing.iconGap,
  },
  trendText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: spacing.iconGap,
  },
  sparklineBar: {
    width: 4,
    borderRadius: 1,
  },
});