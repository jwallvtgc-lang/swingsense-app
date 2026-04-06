import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  sectionCard,
  spacing,
  typography,
} from '../../design-system/tokens';

export type SectionCardProps = {
  title?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({ title, icon, headerRight, children }: SectionCardProps) {
  const hasTitle = title != null && title.length > 0;
  const showHeader = hasTitle || icon != null || headerRight != null;

  return (
    <View style={styles.card}>
      {showHeader ? (
        <View style={styles.header}>
          {icon != null ? (
            <View style={styles.iconSlot}>{icon}</View>
          ) : null}
          {hasTitle ? <Text style={styles.title}>{title}</Text> : null}
          {headerRight != null ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
    marginBottom: spacing.iconGap,
  },
  iconSlot: {
    width: sectionCard.iconSlot,
    height: sectionCard.iconSlot,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.sectionTitle,
    color: colors.text.primary,
  },
  headerRight: {
    flexShrink: 0,
  },
});
