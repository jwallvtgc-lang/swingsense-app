import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { actionCard, colors, fontSizes, spacing, typography } from '../../design-system/tokens';

export default function DrillVideoPlaceholder() {
  return (
    <View style={styles.container}>
      <Ionicons
        name="play-circle-outline"
        size={actionCard.iconInner * 1.7}
        color={colors.text.muted}
      />
      <Text style={styles.label}>Darian's drill video — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
  },
  label: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.muted,
  },
});