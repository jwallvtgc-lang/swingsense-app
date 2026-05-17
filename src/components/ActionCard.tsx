import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  actionCard,
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

export type ActionCardProps = {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  style?: ViewStyle;
};

export default function ActionCard({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  style,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.35}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={1.35}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    alignSelf: 'stretch',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    minWidth: 0,
    minHeight: 90,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: actionCard.iconSize,
    height: actionCard.iconSize,
    borderRadius: actionCard.iconRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: spacing.pillGap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.drillInstruction * 1.35),
  },
});
