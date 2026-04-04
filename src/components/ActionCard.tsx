import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { actionCard, colors, fontSizes, radius, spacing } from '../../design-system/tokens';

const FONT_TITLE = 'Inter_500Medium';
const FONT_SUB = 'Inter_400Regular';

export type ActionCardProps = {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function ActionCard({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.35}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={1.35}>
          {subtitle}
        </Text>
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
  },
  title: {
    fontFamily: FONT_TITLE,
    fontSize: fontSizes.actionCardTitle,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: FONT_SUB,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.drillInstruction * 1.35),
  },
});
