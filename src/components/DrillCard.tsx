import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DrillCard as DrillCardType, DrillMechanic } from '../types/drill';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

interface DrillCardProps {
  drill: DrillCardType;
  isRecommended?: boolean;
  onPress: () => void;
}

// Mechanic color mapping based on AI-70 spec
const MECHANIC_COLORS: Record<DrillMechanic, string> = {
  stance: '#4A90D9', // blue
  load: '#F5A623', // orange
  power_position: '#639922', // green
  slot: '#9B59B6', // purple
  balance_at_contact: '#1ABC9C', // teal
};

const MECHANIC_LABELS: Record<DrillMechanic, string> = {
  stance: 'Stance',
  load: 'Load',
  power_position: 'Power Position',
  slot: 'Slot',
  balance_at_contact: 'Balance at Contact',
};

export default function DrillCard({ drill, isRecommended = false, onPress }: DrillCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Row 1: Mechanic badge (left) + "For you" pill (right, slot 1 only) */}
      <View style={styles.row1}>
        <View style={[styles.mechanicBadge, { backgroundColor: MECHANIC_COLORS[drill.mechanic] }]}>
          <Text style={styles.mechanicText}>{MECHANIC_LABELS[drill.mechanic]}</Text>
        </View>
        {isRecommended && (
          <View style={styles.forYouPill}>
            <Text style={styles.forYouText}>For you</Text>
          </View>
        )}
      </View>

      {/* Row 2: Drill title, bold 16px, 2 lines max */}
      <Text style={styles.drillTitle} numberOfLines={2}>
        {drill.title}
      </Text>

      {/* Row 3: Description, 13px muted, single line truncated (MOST IMPORTANT ROW) */}
      <Text style={styles.description} numberOfLines={1}>
        {drill.description}
      </Text>

      {/* Row 4: Experience level badge (left) + "Start drill →" amber text (right) */}
      <View style={styles.row4}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{drill.experience_level}</Text>
        </View>
        <Text style={styles.startDrillText}>Start drill →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    height: 160,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.cardSm, // 12px internal padding
    justifyContent: 'space-between', // Distribute rows evenly
    marginRight: 20, // 20px gap between cards
  },
  cardPressed: {
    opacity: 0.8,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mechanicBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.badge,
  },
  mechanicText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro, // 9px
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  forYouPill: {
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.badge,
  },
  forYouText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro, // 9px
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
  },
  drillTitle: {
    fontFamily: typography.body,
    fontSize: 16, // Spec requirement: bold 16px
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    lineHeight: Math.round(16 * 1.2), // Tight line height for 2 lines max
  },
  description: {
    fontFamily: typography.body,
    fontSize: fontSizes.body, // 13px
    color: colors.text.muted,
    lineHeight: Math.round(fontSizes.body * 1.2), // Single line, tight
  },
  row4: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelBadge: {
    backgroundColor: colors.bg.input,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.badge,
  },
  levelText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro, // 9px
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  startDrillText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro, // 9px
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
  },
});