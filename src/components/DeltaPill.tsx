import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius, spacing } from '../../design-system/tokens';

const FONT_LABEL = 'Inter_400Regular';
const FONT_DELTA = 'Inter_600SemiBold';

export type DeltaPillProps = {
  label: string;
  delta: number;
  direction: 'up' | 'down' | 'same';
  /** Default 1; use a higher value when the label is a full sentence (e.g. vs_last_swing). */
  labelNumberOfLines?: number;
};

function formatDelta(delta: number, direction: DeltaPillProps['direction']): string {
  if (direction === 'up') {
    return `+${Math.abs(delta)}↑`;
  }
  if (direction === 'down') {
    return `-${Math.abs(delta)}↓`;
  }
  return String(delta);
}

export default function DeltaPill({
  label,
  delta,
  direction,
  labelNumberOfLines = 1,
}: DeltaPillProps) {
  return (
    <View style={styles.pill}>
      <Text
        style={styles.label}
        numberOfLines={labelNumberOfLines}
        maxFontSizeMultiplier={1.35}
      >
        {label}
      </Text>
      <Text style={styles.delta} maxFontSizeMultiplier={1.35}>
        {formatDelta(delta, direction)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.deltaPillInnerGap,
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.greenDim,
    borderRadius: radius.pill,
    paddingVertical: spacing.deltaPillPadV,
    paddingHorizontal: spacing.deltaPillPadH,
  },
  label: {
    fontFamily: FONT_LABEL,
    fontSize: fontSizes.label,
    color: colors.text.muted,
  },
  delta: {
    fontFamily: FONT_DELTA,
    fontSize: fontSizes.caption,
    color: colors.text.green,
  },
});
