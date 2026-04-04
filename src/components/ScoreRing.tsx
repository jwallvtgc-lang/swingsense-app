import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import {
  colors,
  fontSizes,
  getScoreColor,
  scoreRing,
} from '../../design-system/tokens';

const FONT_DISPLAY = 'BebasNeue_400Regular';
const FONT_MICRO = 'Inter_400Regular';

export type ScoreRingProps = {
  score: number;
  size?: 'lg' | 'sm';
  showLabel?: boolean;
  opacity?: number;
  /** Sm ring outer diameter; default `scoreRing.sizeSm` (e.g. SubScoreCard uses 44). */
  smDiameter?: number;
  /** Sm center score font size; default `fontSizes.listScore`. */
  smScoreFontSize?: number;
};

export default function ScoreRing({
  score,
  size = 'lg',
  showLabel = true,
  opacity = 1,
  smDiameter,
  smScoreFontSize,
}: ScoreRingProps) {
  const isLg = size === 'lg';
  const strokeWidth = isLg ? scoreRing.strokeLg : scoreRing.strokeSm;
  const diameter = isLg ? scoreRing.sizeLg : (smDiameter ?? scoreRing.sizeSm);
  const r = isLg
    ? scoreRing.radiusLg
    : smDiameter != null
      ? Math.max(8, Math.round((diameter - strokeWidth) / 2))
      : scoreRing.radiusSm;
  const cx = diameter / 2;
  const cy = diameter / 2;

  const clamped = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * r;
  const filled = (clamped / 100) * circumference;
  const dashArray = `${filled} ${circumference}`;
  const accent = getScoreColor(score);

  return (
    <View style={[styles.wrap, { width: diameter, height: diameter }]}>
      <Svg width={diameter} height={diameter}>
        <G transform={`rotate(-90 ${cx} ${cy})`}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={scoreRing.trackColor}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            opacity={opacity}
          />
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text
          style={[
            styles.scoreNum,
            isLg
              ? styles.scoreNumLg
              : [
                  styles.scoreNumSm,
                  smScoreFontSize != null && {
                    fontSize: smScoreFontSize,
                    lineHeight: Math.round(smScoreFontSize * 1.05),
                  },
                ],
            { color: accent },
          ]}
          maxFontSizeMultiplier={1.35}
        >
          {Math.round(score)}
        </Text>
        {isLg && showLabel ? (
          <Text style={styles.suffix} maxFontSizeMultiplier={1.35}>
            /100
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontFamily: FONT_DISPLAY,
    textAlign: 'center',
  },
  scoreNumLg: {
    fontSize: fontSizes.heroScore,
    lineHeight: Math.round(fontSizes.heroScore * 1.05),
  },
  scoreNumSm: {
    fontSize: fontSizes.listScore,
    lineHeight: Math.round(fontSizes.listScore * 1.05),
  },
  suffix: {
    marginTop: 2,
    fontFamily: FONT_MICRO,
    fontSize: fontSizes.micro,
    color: colors.text.muted,
  },
});
