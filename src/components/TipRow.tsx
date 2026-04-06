import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors, fontSizes, spacing, tipRow, typography } from '../../design-system/tokens';

const SIZE = tipRow.bullet;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2;

export type TipRowProps = {
  text: string;
};

export default function TipRow({ text }: TipRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.bulletWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={CX} cy={CY} r={R} fill={colors.bg.green} />
          <Polyline
            points={`${SIZE * 0.28},${SIZE * 0.52} ${SIZE * 0.42},${SIZE * 0.66} ${SIZE * 0.72},${SIZE * 0.36}`}
            fill="none"
            stroke={colors.text.primary}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={styles.copy}>{text}</Text>
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
  bulletWrap: {
    width: SIZE,
    height: SIZE,
  },
  copy: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.secondary,
    lineHeight: Math.round(fontSizes.drillInstruction * 1.35),
  },
});
