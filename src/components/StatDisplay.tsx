import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, spacing, typography } from '../../design-system/tokens';

export type StatDisplayProps = {
  value: string;
  unit: string;
  disclaimer?: string;
  description?: string;
};

export default function StatDisplay({
  value,
  unit,
  disclaimer,
  description,
}: StatDisplayProps) {
  return (
    <View style={styles.root}>
      <View style={styles.valueRow}>
        <Text style={styles.value} maxFontSizeMultiplier={1.35}>
          {value}
        </Text>
        <Text style={styles.unit} maxFontSizeMultiplier={1.35}>
          {unit}
        </Text>
      </View>
      {disclaimer != null && disclaimer.length > 0 ? (
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.35}>
          {disclaimer}
        </Text>
      ) : null}
      {description != null && description.length > 0 ? (
        <Text style={styles.description} maxFontSizeMultiplier={1.35}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: spacing.iconGap,
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.pillGap,
  },
  value: {
    fontFamily: typography.display,
    fontSize: fontSizes.batSpeed,
    color: colors.text.gold,
    lineHeight: Math.round(fontSizes.batSpeed * 1.05),
  },
  unit: {
    fontFamily: typography.body,
    fontSize: fontSizes.sectionTitle,
    color: colors.text.muted,
  },
  disclaimer: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.hint,
    lineHeight: Math.round(fontSizes.caption * 1.35),
  },
  description: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
});
