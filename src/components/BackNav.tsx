import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { colors, fontSizes, spacing, typography } from '../../design-system/tokens';

const CHEVRON_SIZE = 22;

export type BackNavProps = {
  label: string;
  onPress: () => void;
};

export default function BackNav({ label, onPress }: BackNavProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Svg width={CHEVRON_SIZE} height={CHEVRON_SIZE} viewBox="0 0 24 24">
        <Polyline
          points="15 18 9 12 15 6"
          fill="none"
          stroke={colors.text.gold}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    alignSelf: 'flex-start',
    paddingVertical: spacing.pillGap,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.gold,
  },
});
