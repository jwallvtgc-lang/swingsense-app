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
            <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {subtitle}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={premiumActionCard.chevronColor}
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
    paddingHorizontal: 12,
    paddingVertical: 0,
    minHeight: 80,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    marginRight: 10,
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
    gap: premiumActionCard.titleSubtitleGap,
  },
  title: {
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: Math.round(15 * 1.2),
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: fontWeights.regular,
    color: colors.text.homeMuted,
    lineHeight: Math.round(12 * 1.35),
    marginTop: premiumActionCard.titleSubtitleGap,
  },
});
