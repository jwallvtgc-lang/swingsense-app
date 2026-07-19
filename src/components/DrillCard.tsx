import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DrillCard as DrillCardType, DrillMechanic } from '../types/drill';
import {
  colors,
  drillCardLink,
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


const MECHANIC_LABELS: Record<DrillMechanic, string> = {
  'Stance': 'Stance',
  'Load & Stride': 'Load & Stride',
  'Power Position': 'Power Position',
  'Slot': 'Slot',
  'Balance/Extension': 'Balance/Extension',
  'Multi': 'Multi',
};

// TODO AI-129 Fix 3: video thumbnail background on carousel cards.
// Deferred — expo-video-thumbnails getThumbnailAsync on remote .mov files requires
// downloading video bytes per card with no CDN thumbnail service. Wire up once
// Supabase Storage URLs serve transcoded previews or a thumbnail column is added.
export default function DrillCard({ drill, isRecommended = false, onPress }: DrillCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Row 1: Mechanic badge (left) + "For you" pill (right, slot 1 only) */}
      <View style={styles.row1}>
        <Text style={styles.mechanicText}>{drill.mechanic ? MECHANIC_LABELS[drill.mechanic] : ''}</Text>
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
    opacity: drillCardLink.pressOpacity,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mechanicText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption, // 11px
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: fontSizes.drillTitle, // Spec requirement: bold 16px
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
    fontSize: drillCardLink.fontSize,
    fontWeight: drillCardLink.fontWeight,
    color: drillCardLink.color,
  },
});