import { StyleSheet, Text, View } from 'react-native';

import { colors, drillStep, fontSizes, spacing, typography } from '../../design-system/tokens';

export type DrillStepProps = {
  step: number;
  text: string;
};

export default function DrillStep({ step, text }: DrillStepProps) {
  return (
    <View style={styles.row}>
      <View style={styles.circle}>
        <Text style={styles.stepNum}>{step}</Text>
      </View>
      <Text style={styles.instruction}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.iconGap,
    alignSelf: 'stretch',
  },
  circle: {
    width: drillStep.circle,
    height: drillStep.circle,
    borderRadius: drillStep.circle / 2,
    backgroundColor: colors.bg.greenRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: typography.display,
    fontSize: fontSizes.body,
    color: colors.text.green,
  },
  instruction: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.drillInstruction * 1.35),
  },
});
