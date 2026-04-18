import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import DeleteButton from './DeleteButton';
import ScoreRing from './ScoreRing';
import TrendBadge from './TrendBadge';

export type SwingListItemProps = {
  score: number;
  date: string;
  trend: 'better' | 'same' | 'worse';
  insight: string;
  topDelta?: { label: string; direction: 'up' | 'down' | 'flat' } | null;
  onPress: () => void;
  onDelete: () => void;
};

export default function SwingListItem({
  score,
  date,
  trend,
  insight,
  topDelta,
  onPress,
  onDelete,
}: SwingListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <ScoreRing score={score} size="sm" opacity={0.7} showLabel={false} />
      <View style={styles.middle}>
        <View style={styles.topRow}>
          <Text style={styles.date} numberOfLines={1} maxFontSizeMultiplier={1.35}>
            {date}
          </Text>
          <TrendBadge trend={trend} />
        </View>
        <Text
          style={styles.insight}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.35}
        >
          {insight}
        </Text>
        {topDelta && topDelta.direction !== 'flat' ? (
          <View style={styles.deltaRow}>
            <Text
              style={[
                styles.deltaText,
                {
                  color:
                    topDelta.direction === 'up' ? colors.text.green : colors.text.red,
                },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              {topDelta.direction === 'up' ? '↑' : '↓'} {topDelta.label}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <DeleteButton onConfirm={onDelete} />
        <Ionicons
          name="chevron-forward"
          size={22} // 22px chevron — standard icon size, no token needed
          color={colors.text.muted}
        />
      </View>
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
    opacity: 0.92, // 0.92 pressed opacity — standard interaction feel
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: spacing.pillGap,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.pillGap,
  },
  date: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
    flexShrink: 1,
  },
  insight: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deltaText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.pillGap,
  },
});
