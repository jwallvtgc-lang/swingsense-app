import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fontSizes, spacing, typography } from '../../design-system/tokens';

const ICON = 14;

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type EditButtonProps = {
  onPress: () => void;
};

export default function EditButton({ onPress }: EditButtonProps) {
  const gold = colors.text.gold;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Edit"
    >
      <PencilIcon color={gold} />
      <Text style={[styles.label, { color: gold }]} maxFontSizeMultiplier={1.35}>
        Edit
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.pillGap,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
  },
});
