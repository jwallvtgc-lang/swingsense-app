import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSizes, fontWeights, spacing, typography } from '../../design-system/tokens';

export type DataRowProps = {
  label: string;
  /** Omit or leave empty when using `showChevron` or label-only rows (e.g. Sign out). */
  value?: string;
  valueWeight?: 'normal' | 'bold';
  last?: boolean;
  onPress?: () => void;
  /** Gold chevron on the right instead of a text value. */
  showChevron?: boolean;
  /** Red label (e.g. destructive actions). */
  labelTone?: 'default' | 'danger';
};

export default function DataRow({
  label,
  value = '',
  valueWeight = 'normal',
  last = false,
  onPress,
  showChevron = false,
  labelTone = 'default',
}: DataRowProps) {
  const hasValue = value.length > 0;
  const showValue = hasValue && !showChevron;
  const valueTypography = [
    styles.value,
    valueWeight === 'bold' ? styles.valueBold : styles.valueNormal,
  ];

  const inner = (
    <View style={styles.row}>
      <Text
        style={[
          styles.label,
          labelTone === 'danger' ? styles.labelDanger : styles.labelDefault,
        ]}
      >
        {label}
      </Text>
      {showChevron ? (
        <View style={styles.chevronTrailing}>
          {hasValue ? (
            <Text style={[...valueTypography, styles.valueBeforeChevron]} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={22} color={colors.text.gold} />
        </View>
      ) : showValue ? (
        <Text style={valueTypography}>{value}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrap, !last && styles.withSeparator]}>
      {onPress != null ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    paddingVertical: spacing.cardSm,
  },
  withSeparator: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.subtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.iconGap,
  },
  chevronTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.iconGap,
  },
  valueBeforeChevron: {
    flex: 0,
    flexShrink: 1,
    textAlign: 'right',
  },
  label: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
  },
  labelDefault: {
    color: colors.text.muted,
  },
  labelDanger: {
    color: colors.text.red,
  },
  pressed: {
    opacity: 0.85,
  },
  value: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSizes.body,
    color: colors.text.primary,
    textAlign: 'right',
  },
  valueNormal: {
    fontFamily: typography.body,
  },
  valueBold: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
  },
});
