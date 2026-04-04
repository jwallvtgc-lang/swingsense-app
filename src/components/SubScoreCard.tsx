import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius, spacing } from '../../design-system/tokens';
import ScoreRing from './ScoreRing';

const FONT_BODY = 'Inter_400Regular';

/** Display (Bebas Neue) score inside ring — see ScoreRing `FONT_DISPLAY`. */
const SUB_SCORE_DISPLAY_PX = 26;

export type SubScoreCardProps = {
  score: number;
  label: string;
};

export default function SubScoreCard({ score, label }: SubScoreCardProps) {
  return (
    <View style={styles.card}>
      <ScoreRing
        score={score}
        size="sm"
        smDiameter={44}
        smScoreFontSize={SUB_SCORE_DISPLAY_PX}
        opacity={0.7}
        showLabel={false}
      />
      <View style={styles.textCol}>
        <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1.35}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.subGrid,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.subCard,
    padding: spacing.cardSm,
    minWidth: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONT_BODY,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
});
