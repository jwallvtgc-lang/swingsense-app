import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Drill, DrillMechanic } from '../data/drills';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

interface DrillCardProps {
  drill: Drill;
  isRecommended?: boolean;
  onPress: () => void;
}

const MECHANIC_COLORS: Record<DrillMechanic, string> = {
  stance: '#639922',
  load: '#5B4FE8',
  power_position: '#EF9F27',
  slot: '#E24B4A',
  balance_at_contact: '#1D9E75',
  full_swing: colors.text.gold,
};

const MECHANIC_LABELS: Record<DrillMechanic, string> = {
  stance: 'Stance',
  load: 'Load',
  power_position: 'Power Position',
  slot: 'Slot',
  balance_at_contact: 'Balance',
  full_swing: 'Full Swing',
};

export default function DrillCard({ drill, isRecommended = false, onPress }: DrillCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.colorBar, { backgroundColor: MECHANIC_COLORS[drill.mechanic] }]} />

      {isRecommended && (
        <View style={styles.recommendedPill}>
          <Text style={styles.recommendedText}>For you</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.drillName} numberOfLines={2}>
          {drill.name}
        </Text>

        <View style={[styles.mechanicBadge, { backgroundColor: MECHANIC_COLORS[drill.mechanic] }]}>
          <Text style={styles.mechanicText}>{MECHANIC_LABELS[drill.mechanic]}</Text>
        </View>

        <Text style={styles.levelText}>{drill.level}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 152,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginRight: spacing.cardGap,
  },
  cardPressed: {
    opacity: 0.92,
  },
  colorBar: {
    height: 3,
    width: '100%',
  },
  recommendedPill: {
    position: 'absolute',
    top: spacing.iconGap,
    right: spacing.iconGap,
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
    borderRadius: radius.badge,
    paddingHorizontal: spacing.pillGap,
    paddingVertical: 2,
    zIndex: 1,
  },
  recommendedText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
  },
  content: {
    padding: spacing.cardSm,
    gap: spacing.iconGap,
  },
  drillName: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.body * 1.3),
  },
  mechanicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.pillGap,
    paddingVertical: 2,
    borderRadius: radius.badge,
  },
  mechanicText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  levelText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
  },
});