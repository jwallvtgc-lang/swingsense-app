import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontSizes,
  letterSpacing,
  radius,
  spacing,
} from '../../design-system/tokens';

/** Loaded in App.tsx — maps to `typography.display` (Bebas Neue) in DESIGN_SYSTEM */
const DISPLAY_FONT = 'BebasNeue_400Regular';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
};

export default function PrimaryButton({ label, onPress, icon, loading, disabled }: PrimaryButtonProps) {
  const isDisabled = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.pressable,
        isDisabled && styles.pressableDisabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={colors.text.onGold} />
        ) : (
          <>
            {icon != null ? <View style={styles.iconSlot}>{icon}</View> : null}
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg.gold,
    borderRadius: radius.card,
    paddingVertical: 15,
    paddingHorizontal: spacing.screen,
  },
  pressed: {
    opacity: 0.92,
  },
  pressableDisabled: {
    opacity: 0.72,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
  },
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: colors.text.onGold,
    fontFamily: DISPLAY_FONT,
    fontSize: fontSizes.ctaLabel,
    letterSpacing: letterSpacing.cta,
  },
});
