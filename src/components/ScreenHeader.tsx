import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  displayTitleProps,
  fontSizes,
  spacing,
  typography,
} from '../../design-system/tokens';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title} {...displayTitleProps}>
        {title}
      </Text>
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
    fontFamily: typography.displayTitle,
    fontSize: fontSizes.screenTitle,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
});
