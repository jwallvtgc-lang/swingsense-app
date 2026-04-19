import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  displayTitleProps,
  fontSizes,
  letterSpacing,
  spacing,
  typography,
} from '../../design-system/tokens';

export type WordmarkProps = {
  size?: 'lg' | 'md';
  tagline?: string;
  /** e.g. pass `displayTitleProps` from Auth for Righteous wordmark line. */
  titleTextProps?: typeof displayTitleProps;
};

export default function Wordmark({ size = 'lg', tagline, titleTextProps }: WordmarkProps) {
  const isLg = size === 'lg';
  const wordStyle = isLg ? styles.wordLg : styles.wordMd;

  return (
    <View style={styles.root}>
      <Text style={wordStyle} maxFontSizeMultiplier={1.35} {...(titleTextProps ?? {})}>
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
    fontFamily: typography.display,
    fontSize: fontSizes.displaySm,
    letterSpacing: letterSpacing.wordmarkSm,
    color: colors.text.primary,
  },
  wordMd: {
    fontFamily: typography.display,
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
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    color: colors.text.muted,
    letterSpacing: letterSpacing.tagline,
    textAlign: 'center',
  },
});
