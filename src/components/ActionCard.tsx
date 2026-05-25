import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  actionCard,
  colors,
  fontSizes,
  fontWeights,
  premiumActionCard,
  premiumActionCardVariants,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

export type ActionCardVariant = keyof typeof premiumActionCardVariants;

export type ActionCardProps = {
  icon: ReactNode;
  variant: ActionCardVariant;
  title: string;
  subtitle: string;
  onPress: () => void;
  style?: ViewStyle;
  compact?: boolean;
};

export default function ActionCard({
  icon,
  variant,
  title,
  subtitle,
  onPress,
  style,
  compact = false,
}: ActionCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(premiumActionCard.glowPulseMin)).current;
  const palette = premiumActionCardVariants[variant];

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: premiumActionCard.glowPulseMax,
          duration: premiumActionCard.glowCycleMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: premiumActionCard.glowPulseMin,
          duration: premiumActionCard.glowCycleMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glow]);

  const animateScale = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: premiumActionCard.pressMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const glowShadowOpacity = glow.interpolate({
    inputRange: [premiumActionCard.glowPulseMin, premiumActionCard.glowPulseMax],
    outputRange: [
      premiumActionCard.glowShadowOpacityMin,
      premiumActionCard.glowShadowOpacityMax,
    ],
  });

  return (
    <Animated.View style={[styles.scaleWrap, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateScale(premiumActionCard.pressScale)}
        onPressOut={() => animateScale(1)}
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
      >
        <View style={[styles.body, compact && styles.bodyCompact]}>
          <View style={[styles.iconColumn, compact && styles.iconColumnCompact]}>
            <Animated.View
              style={[
                styles.iconWrap,
                compact && styles.iconWrapCompact,
                {
                  backgroundColor: palette.iconBg,
                  borderColor: palette.borderColor,
                  shadowColor: palette.glowColor,
                  shadowOpacity: glowShadowOpacity,
                },
              ]}
            >
              {icon}
            </Animated.View>
          </View>

          <View style={styles.textRow}>
            <View style={[styles.textBlock, compact && styles.textBlockCompact]}>
              <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {title}
              </Text>
              <Text style={[styles.subtitle, compact && styles.subtitleCompact]} maxFontSizeMultiplier={1.2}>
                {subtitle}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={compact ? actionCard.iconInner * 0.64 : premiumActionCard.chevronSize}
              color={premiumActionCard.chevronColor}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scaleWrap: {
    alignSelf: 'stretch',
    minWidth: 0,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg.premiumActionCard,
    borderRadius: radius.premiumActionCard,
    borderWidth: 1,
    borderColor: colors.border.premiumActionCard,
    paddingHorizontal: premiumActionCard.padH,
    paddingVertical: premiumActionCard.padV,
    minHeight: premiumActionCard.minHeight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow.default,
        shadowOffset: premiumActionCard.shadowIos.offset,
        shadowOpacity: premiumActionCard.shadowIos.opacity,
        shadowRadius: premiumActionCard.shadowIos.radius,
      },
      android: {
        elevation: premiumActionCard.elevation,
      },
      default: {},
    }),
  },
  cardPressed: {
    borderColor: colors.border.premiumActionCardPressed,
    backgroundColor: colors.bg.premiumActionCardPressed,
    ...Platform.select({
      ios: {
        shadowOpacity: premiumActionCard.shadowIosPressed.opacity,
        shadowRadius: premiumActionCard.shadowIosPressed.radius,
        shadowOffset: premiumActionCard.shadowIosPressed.offset,
      },
      android: {
        elevation: premiumActionCard.elevationPressed,
      },
      default: {},
    }),
  },
  body: {
    flex: 1,
    minHeight: premiumActionCard.bodyMinHeight,
    justifyContent: 'center',
  },
  iconColumn: {
    marginTop: premiumActionCard.iconColumnMarginTop,
    marginBottom: premiumActionCard.iconTitleGap,
    alignSelf: 'flex-start',
  },
  iconWrap: {
    width: premiumActionCard.iconSlot,
    height: premiumActionCard.iconSlot,
    borderRadius: premiumActionCard.iconRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: premiumActionCard.iconGlowShadowRadius,
      },
      android: {
        elevation: premiumActionCard.iconElevation,
      },
      default: {},
    }),
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: premiumActionCard.textRowGap,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    maxWidth: premiumActionCard.textBlockMaxWidth,
    gap: premiumActionCard.titleSubtitleGap,
    marginTop: premiumActionCard.textBlockMarginTop,
  },
  title: {
    fontFamily: typography.body,
    fontWeight: premiumActionCard.titleFontWeight,
    fontSize: fontSizes.premiumActionCardTitle,
    color: colors.text.primary,
    lineHeight: Math.round(
      fontSizes.premiumActionCardTitle * premiumActionCard.titleLineHeightRatio
    ),
  },
  subtitle: {
    fontFamily: typography.body,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.premiumActionCardSubtitle,
    color: colors.text.homeMuted,
    lineHeight: Math.round(
      fontSizes.premiumActionCardSubtitle * premiumActionCard.subtitleLineHeightRatio
    ),
  },
  // Compact variant styles
  cardCompact: {
    minHeight: premiumActionCard.minHeight * 0.58, // ~80px from 138px
    paddingVertical: spacing.cardSm,
    paddingHorizontal: spacing.card,
  },
  bodyCompact: {
    minHeight: premiumActionCard.bodyMinHeight * 0.58, // ~56px from 96px
  },
  iconColumnCompact: {
    marginTop: 0,
    marginBottom: spacing.pillGap,
  },
  iconWrapCompact: {
    width: premiumActionCard.iconSlot * 0.67, // ~36px from 54px
    height: premiumActionCard.iconSlot * 0.67,
  },
  textBlockCompact: {
    gap: spacing.deltaPillInnerGap / 2, // 2px - half of deltaPillInnerGap (4px)
    marginTop: 0,
  },
  titleCompact: {
    fontSize: fontSizes.actionCardTitle,
    lineHeight: Math.round(fontSizes.actionCardTitle * 1.2),
  },
  subtitleCompact: {
    fontSize: fontSizes.drillInstruction,
    lineHeight: Math.round(fontSizes.drillInstruction * 1.35),
  },
});
