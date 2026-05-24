import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

export type SmallScoreBadgeProps = {
  score: number;
  deltaText?: string;
};

export default function SmallScoreBadge({ score, deltaText }: SmallScoreBadgeProps) {

  return (
    <View style={styles.container}>
      <View style={[styles.scoreBadge, { borderColor: colors.text.muted }]}>
        <Text
          style={[styles.scoreNumber, { color: colors.text.muted }]}
          maxFontSizeMultiplier={1.35}
        >
          {Math.round(score)}
        </Text>
      </View>
      {deltaText && (
        <Text style={styles.deltaText} maxFontSizeMultiplier={1.35}>
          {deltaText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  scoreBadge: {
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
  },
  deltaText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    fontWeight: fontWeights.regular,
  },
});