import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

export type Trend = 'better' | 'same' | 'worse';

export type TrendBadgeProps = {
  trend: Trend;
};

const CONFIG: Record<
  Trend,
  { bg: string; color: string; label: string }
> = {
  better: {
    bg: colors.bg.trendBetter,
    color: colors.text.trendBetter,
    label: '↗ Better',
  },
  same: {
    bg: colors.bg.trendSame,
    color: colors.text.trendSame,
    label: 'Same',
  },
  worse: {
    bg: colors.bg.trendWorse,
    color: colors.text.trendWorse,
    label: '↘ Worse',
  },
};

export default function TrendBadge({ trend }: TrendBadgeProps) {
  const c = CONFIG[trend];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: spacing.pillGap,
    paddingHorizontal: spacing.tabInner,
  },
  text: {
    fontFamily: typography.body,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.micro,
  },
});
