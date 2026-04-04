import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fontSizes, spacing } from '../../design-system/tokens';
import PrimaryButton from './PrimaryButton';

const FONT_DISPLAY = 'BebasNeue_400Regular';
const FONT_BODY = 'Inter_400Regular';

const ICON = 60;
const VB = 100;

function MutedBaseballIcon() {
  const c = colors.text.muted;

  return (
    <Svg width={ICON} height={ICON} viewBox={`0 0 ${VB} ${VB}`}>
      <Circle cx={50} cy={50} r={32} stroke={c} strokeWidth={2} fill="none" />
      <Path
        d="M 34 36 C 42 44 58 56 66 64"
        stroke={c}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 66 36 C 58 44 42 56 34 64"
        stroke={c}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type EmptyStateProps = {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
};

export default function EmptyState({ title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <MutedBaseballIcon />
      <Text style={styles.title} maxFontSizeMultiplier={1.25}>
        {title}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.35}>
        {body}
      </Text>
      <View style={styles.cta}>
        <PrimaryButton label={ctaLabel} onPress={onCta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.cardGap,
    paddingVertical: spacing.sectionGap,
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.display,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONT_BODY,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.body * 1.45),
    maxWidth: 320,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: spacing.pillGap,
  },
});
