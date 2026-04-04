import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, letterSpacing, spacing } from '../../design-system/tokens';

const FONT_DISPLAY = 'BebasNeue_400Regular';
const FONT_BODY = 'Inter_400Regular';

export type WordmarkProps = {
  size?: 'lg' | 'md';
  tagline?: string;
};

export default function Wordmark({ size = 'lg', tagline }: WordmarkProps) {
  const isLg = size === 'lg';
  const wordStyle = isLg ? styles.wordLg : styles.wordMd;

  return (
    <View style={styles.root}>
      <Text style={wordStyle} maxFontSizeMultiplier={1.35}>
        <Text style={styles.swing}>SWING</Text>
        <Text style={styles.sense}>SENSE</Text>
      </Text>
      {tagline != null && tagline.length > 0 ? (
        <Text style={styles.tagline} maxFontSizeMultiplier={1.35}>
          {tagline.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  wordLg: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.displaySm,
    letterSpacing: letterSpacing.wordmarkSm,
    color: colors.text.primary,
  },
  wordMd: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.display,
    letterSpacing: letterSpacing.wordmark,
    color: colors.text.primary,
  },
  swing: {
    color: colors.text.primary,
  },
  sense: {
    color: colors.text.gold,
  },
  tagline: {
    marginTop: spacing.pillGap,
    fontFamily: FONT_BODY,
    fontSize: fontSizes.micro,
    color: colors.text.muted,
    letterSpacing: letterSpacing.tagline,
    textAlign: 'center',
  },
});
