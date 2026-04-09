import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import SectionCard from './SectionCard';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const TROPHY_SIZE = 16;

function TrophyIcon({ color }: { color: string }) {
  return (
    <Svg width={TROPHY_SIZE} height={TROPHY_SIZE} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.17c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
      />
    </Svg>
  );
}

export type Props = {
  summary: string;
  mostImproved: string | null;
  focusNext: string;
  swingsAnalyzed: number;
  bestOverall: number;
  onDismiss: () => void;
};

export function ProgressCoachCard({
  summary,
  mostImproved,
  focusNext,
  swingsAnalyzed,
  bestOverall,
  onDismiss,
}: Props) {
  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TrophyIcon color={colors.text.gold} />
          <Text
            style={styles.headerLabel}
            maxFontSizeMultiplier={1.35}
          >
            THIS WEEK
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss progress card"
        >
          <Ionicons name="close" size={22} color={colors.text.muted} />
        </Pressable>
      </View>

      <Text style={styles.summary} maxFontSizeMultiplier={1.35}>
        {summary}
      </Text>

      {mostImproved ? (
        <View style={styles.improvedPill}>
          <Text style={styles.improvedPillText} maxFontSizeMultiplier={1.35}>
            ↑ {mostImproved}
          </Text>
        </View>
      ) : null}

      <View style={styles.focusBlock}>
        <Text style={styles.focusLabel} maxFontSizeMultiplier={1.35}>
          THIS WEEK →
        </Text>
        <Text style={styles.focusBody} maxFontSizeMultiplier={1.35}>
          {focusNext}
        </Text>
      </View>

      <Text style={styles.footer} maxFontSizeMultiplier={1.35}>
        {swingsAnalyzed} swings · Best score: {bestOverall}
      </Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.cardSm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    flex: 1,
    minWidth: 0,
  },
  headerLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    color: colors.text.muted,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },
  summary: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.6),
    marginBottom: spacing.cardSm,
  },
  improvedPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.greenDim,
    borderRadius: radius.pill,
    paddingVertical: spacing.deltaPillPadV,
    paddingHorizontal: spacing.deltaPillPadH,
    marginBottom: spacing.cardSm,
  },
  improvedPillText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.green,
  },
  focusBlock: {
    marginBottom: spacing.cardSm,
  },
  focusLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    color: colors.text.muted,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    marginBottom: spacing.pillGap,
  },
  focusBody: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
  },
  footer: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
});
