import { StyleSheet, Text, View } from 'react-native';

import StreakPill from './StreakPill';
import {
  colors,
  displayTitleProps,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
  typography,
} from '../../design-system/tokens';

export type AnalyzeHeaderProps = {
  greeting: string;
  streak?: number;
};

export default function AnalyzeHeader({ greeting, streak = 0 }: AnalyzeHeaderProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>
        {greeting}
      </Text>
      <Text
        style={[
          styles.wordmark,
          streak > 0 ? styles.wordmarkAboveStreak : styles.wordmarkAboveContent,
        ]}
      >
        <Text style={styles.wordmarkSwing} {...displayTitleProps}>
          Swing
        </Text>
        <Text style={styles.wordmarkSense} {...displayTitleProps}>
          Sense
        </Text>
      </Text>
      {streak > 0 ? (
        <View style={styles.streakPillWrap}>
          <StreakPill streak={streak} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  greeting: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.homeGreeting,
    color: colors.text.homeGreeting,
    marginBottom: spacing.homeGreetingBelow,
  },
  wordmark: {
    marginBottom: spacing.homeWordmarkBelow,
  },
  wordmarkAboveStreak: {
    marginBottom: spacing.homeTaglineBelow,
  },
  wordmarkAboveContent: {
    marginBottom: spacing.homeTaglineBelowContent,
  },
  wordmarkSwing: {
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.wordmark,
    color: colors.text.primary,
    letterSpacing: letterSpacing.wordmarkTight,
  },
  wordmarkSense: {
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.wordmark,
    color: colors.text.gold,
    letterSpacing: letterSpacing.wordmarkTight,
  },
  streakPillWrap: {
    marginBottom: spacing.homeStreakBelow,
  },
});
