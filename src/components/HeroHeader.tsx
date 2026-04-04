import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, letterSpacing, spacing } from '../../design-system/tokens';

const FONT_DISPLAY = 'BebasNeue_400Regular';
const FONT_BODY = 'Inter_400Regular';

export type HeroHeaderProps = {
  greeting: string;
  headline: string;
  accentWord: string;
};

function HeadlineText({ headline, accentWord }: Pick<HeroHeaderProps, 'headline' | 'accentWord'>) {
  const idx = headline.indexOf(accentWord);
  const baseStyle = styles.headline;

  if (accentWord.length === 0 || idx < 0) {
    return (
      <Text style={baseStyle} maxFontSizeMultiplier={1.25}>
        {headline}
      </Text>
    );
  }

  const before = headline.slice(0, idx);
  const after = headline.slice(idx + accentWord.length);

  return (
    <Text style={baseStyle} maxFontSizeMultiplier={1.25}>
      {before}
      <Text style={styles.headlineAccent}>{accentWord}</Text>
      {after}
    </Text>
  );
}

export default function HeroHeader({ greeting, headline, accentWord }: HeroHeaderProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.greeting} maxFontSizeMultiplier={1.35}>
        {greeting}
      </Text>
      <HeadlineText headline={headline} accentWord={accentWord} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: spacing.iconGap,
  },
  greeting: {
    fontFamily: FONT_BODY,
    fontSize: fontSizes.label,
    color: colors.text.greeting,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.headline,
    lineHeight: fontSizes.headline,
    color: colors.text.primary,
  },
  headlineAccent: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.headline,
    lineHeight: fontSizes.headline,
    color: colors.text.gold,
  },
});
