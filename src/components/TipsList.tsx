import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, letterSpacing, spacing, typography } from '../../design-system/tokens';

export type TipsListProps = {
  label: string;
  children: ReactNode;
};

export default function TipsList({ label, children }: TipsListProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.label} maxFontSizeMultiplier={1.35}>
        {label}
      </Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: spacing.cardSm,
  },
  label: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.label,
    letterSpacing: letterSpacing.label,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  list: {
    alignSelf: 'stretch',
    gap: spacing.tipRowGap,
  },
});
