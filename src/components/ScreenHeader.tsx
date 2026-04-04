import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, spacing } from '../../design-system/tokens';

const FONT_DISPLAY = 'BebasNeue_400Regular';
const FONT_BODY = 'Inter_400Regular';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {subtitle != null && subtitle.length > 0 ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.iconGap,
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontSizes.screenTitle,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: FONT_BODY,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
});
