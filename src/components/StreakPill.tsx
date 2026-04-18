import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, fontWeights, radius, spacing, typography } from '../../design-system/tokens';

interface StreakPillProps {
  streak: number;
}

export default function StreakPill({ streak }: StreakPillProps) {
  if (streak <= 0) return null;
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>🔥 {streak} day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.goldDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.iconGap,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  text: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.gold,
    fontWeight: fontWeights.medium,
  },
});
