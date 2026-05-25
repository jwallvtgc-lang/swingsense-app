import type { ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

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
  const palette = premiumActionCardVariants[variant];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  // Glow pulse animation
  useEffect(() => {
    const createGlowAnimation = () =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.0,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );

    const animation = createGlowAnimation();
    animation.start();

    return () => animation.stop();
  }, [glowAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.scaleWrap, style, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
      >
        <View style={styles.body}>
          <Animated.View
            style={[
              styles.iconWrap,
              {
                backgroundColor: palette.iconBg,
                borderColor: palette.borderColor,
                shadowColor: palette.glowColor,
                shadowOpacity: glowAnim,
              },
            ]}
          >
            {icon}
          </Animated.View>

          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.2}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
              {subtitle}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={premiumActionCard.chevronColor}
            style={styles.chevron}
          />
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
    padding: spacing.card,
    minHeight: 130,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'relative',
  },
  iconWrap: {
    width: 48,
    height: 48,
    marginBottom: spacing.iconGap + 4, // 12px spacing for icon-to-text gap
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
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSizes.drillTitle,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.drillTitle * 1.2),
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSizes.drillInstruction,
    fontWeight: fontWeights.regular,
    color: colors.text.homeMuted,
    lineHeight: Math.round(fontSizes.drillInstruction * 1.35),
    marginTop: spacing.inputGap / 2,
  },
  chevron: {
    position: 'absolute',
    right: spacing.cardSm,
    bottom: spacing.cardSm,
  },
});
