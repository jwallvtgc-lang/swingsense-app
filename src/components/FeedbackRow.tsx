import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colors, feedback, fontSizes, radius, spacing, typography } from '../../design-system/tokens';

const ICON = 18;
const VB = 24;

function ThumbUp({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox={`0 0 ${VB} ${VB}`} fill="none">
      <Path
        d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11v-4h4v-5h-4V9h-4z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ThumbDown({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox={`0 0 ${VB} ${VB}`} fill="none">
      <G transform="rotate(180 12 12)">
        <Path
          d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11v-4h4v-5h-4V9h-4z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

export type FeedbackRowProps = {
  onPositive: () => void;
  onNegative: () => void;
  /** Highlight the chosen thumb (gold); the other stays muted. */
  selected?: 'up' | 'down' | null;
};

export default function FeedbackRow({
  onPositive,
  onNegative,
  selected = null,
}: FeedbackRowProps) {
  const upColor = selected === 'up' ? colors.text.gold : colors.text.muted;
  const downColor = selected === 'down' ? colors.text.gold : colors.text.muted;
  const locked = selected != null;

  return (
    <View style={styles.row}>
      <Text style={styles.prompt} maxFontSizeMultiplier={1.35}>
        Did this help?
      </Text>
      <View style={styles.buttons}>
        <Pressable
          onPress={onPositive}
          disabled={locked}
          style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
          accessibilityLabel="Thumbs up"
          accessibilityState={{ selected: selected === 'up', disabled: locked }}
        >
          <ThumbUp color={upColor} />
        </Pressable>
        <Pressable
          onPress={onNegative}
          disabled={locked}
          style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
          accessibilityLabel="Thumbs down"
          accessibilityState={{ selected: selected === 'down', disabled: locked }}
        >
          <ThumbDown color={downColor} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.iconGap,
    alignSelf: 'stretch',
  },
  prompt: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    color: colors.text.muted,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  circleBtn: {
    width: feedback.iconButton,
    height: feedback.iconButton,
    borderRadius: radius.circle,
    borderWidth: 1,
    borderColor: colors.border.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnPressed: {
    opacity: 0.75,
  },
});
