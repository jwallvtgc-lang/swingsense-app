import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  animation,
  colors,
  fontSizes,
  fontWeights,
  homeHeader,
  letterSpacing,
  spacing,
  splashBrand,
  splashHazeBleed,
  splashHazeFieldSize,
  splashLogoWidth,
  typography,
} from '../../design-system/tokens';

const LOGO_SOURCE = require('../../assets/splash-wordmark.png');

type BrandedSplashProps = {
  onComplete: () => void;
};

/**
 * Diffuse emerald air — gradients + opacity only.
 * Permanent: do not add FeGaussianBlur or other SVG filter blur (iOS whites out).
 */
function AtmosphericEmeraldHaze({ opacity }: { opacity: Animated.Value }) {
  const bleed = splashHazeBleed();
  const field = splashHazeFieldSize();
  const emerald = colors.brand.emerald;
  const { layerB, layerC, layerD } = splashBrand.hazeLayerOpacities;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.hazeLayer, { width: field, height: field, opacity }]}
    >
      <Svg width={field} height={field}>
        <Defs>
          <RadialGradient id="splashHazeA" cx="50%" cy="12%" r="115%">
            <Stop offset="0" stopColor={emerald} stopOpacity="0" />
            <Stop offset="0.35" stopColor={emerald} stopOpacity="0.012" />
            <Stop offset="0.5" stopColor={emerald} stopOpacity="0.028" />
            <Stop offset="0.68" stopColor={emerald} stopOpacity="0.044" />
            <Stop offset="0.88" stopColor={emerald} stopOpacity="0.01" />
            <Stop offset="1" stopColor={emerald} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="splashHazeB" cx="50%" cy="88%" r="112%">
            <Stop offset="0" stopColor={emerald} stopOpacity="0" />
            <Stop offset="0.38" stopColor={emerald} stopOpacity="0.01" />
            <Stop offset="0.55" stopColor={emerald} stopOpacity="0.024" />
            <Stop offset="0.72" stopColor={emerald} stopOpacity="0.04" />
            <Stop offset="1" stopColor={emerald} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="splashHazeC" cx="14%" cy="46%" r="118%">
            <Stop offset="0" stopColor={emerald} stopOpacity="0" />
            <Stop offset="0.42" stopColor={emerald} stopOpacity="0.01" />
            <Stop offset="0.58" stopColor={emerald} stopOpacity="0.022" />
            <Stop offset="0.78" stopColor={emerald} stopOpacity="0.036" />
            <Stop offset="1" stopColor={emerald} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="splashHazeD" cx="86%" cy="50%" r="116%">
            <Stop offset="0" stopColor={emerald} stopOpacity="0" />
            <Stop offset="0.4" stopColor={emerald} stopOpacity="0.008" />
            <Stop offset="0.58" stopColor={emerald} stopOpacity="0.02" />
            <Stop offset="0.76" stopColor={emerald} stopOpacity="0.032" />
            <Stop offset="1" stopColor={emerald} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={-bleed} y={-bleed} width={field} height={field} fill="url(#splashHazeA)" />
        <Rect
          x={-bleed}
          y={-bleed}
          width={field}
          height={field}
          fill="url(#splashHazeB)"
          opacity={layerB}
        />
        <Rect
          x={-bleed}
          y={-bleed}
          width={field}
          height={field}
          fill="url(#splashHazeC)"
          opacity={layerC}
        />
        <Rect
          x={-bleed}
          y={-bleed}
          width={field}
          height={field}
          fill="url(#splashHazeD)"
          opacity={layerD}
        />
      </Svg>
    </Animated.View>
  );
}

function LoadingDots() {
  const dot1Pulse = useRef(new Animated.Value(0.3)).current;
  const dot2Pulse = useRef(new Animated.Value(0.3)).current;
  const dot3Pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createDotAnimation = (dotValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotValue, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotValue, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(300), // Delay before next cycle
        ])
      );
    };

    const dot1Animation = createDotAnimation(dot1Pulse, 0);
    const dot2Animation = createDotAnimation(dot2Pulse, 150);
    const dot3Animation = createDotAnimation(dot3Pulse, 300);

    dot1Animation.start();
    dot2Animation.start();
    dot3Animation.start();

    return () => {
      dot1Animation.stop();
      dot2Animation.stop();
      dot3Animation.stop();
    };
  }, [dot1Pulse, dot2Pulse, dot3Pulse]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, styles.dotAnimated, { opacity: dot1Pulse }]} />
      <Animated.View style={[styles.dot, styles.dotAnimated, { opacity: dot2Pulse }]} />
      <Animated.View style={[styles.dot, styles.dotAnimated, { opacity: dot3Pulse }]} />
    </View>
  );
}

/**
 * Splash aligned with the Analyze / home visual environment — black base, subtle top tint.
 */
export default function BrandedSplash({ onComplete }: BrandedSplashProps) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = Dimensions.get('window');
  const logoWidth = splashLogoWidth(viewportWidth);
  const logoHeight = logoWidth * splashBrand.logoAspect;
  const hazeField = splashHazeFieldSize();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const hazeOpacity = useRef(new Animated.Value(splashBrand.hazeOpacityMin)).current;

  useEffect(() => {
    const holdMs = animation.splashHold;

    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: splashBrand.logoEntranceMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const hazeBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(hazeOpacity, {
          toValue: splashBrand.hazeOpacityMax,
          duration: splashBrand.glowCycleMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(hazeOpacity, {
          toValue: splashBrand.hazeOpacityMin,
          duration: splashBrand.glowCycleMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    hazeBreath.start();

    const t = setTimeout(() => {
      onCompleteRef.current();
    }, holdMs);

    return () => {
      clearTimeout(t);
      hazeBreath.stop();
    };
  }, [logoOpacity, hazeOpacity]);

  return (
    <LinearGradient
      colors={[...splashBrand.bgStops]}
      locations={[...splashBrand.bgLocations]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <View
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + spacing.sectionGap * 2,
          },
        ]}
      >
        <View style={styles.heroBlock}>
          <View style={styles.heroVisual}>
            <View style={[styles.hazeAnchor, { width: hazeField, height: hazeField }]}>
              <AtmosphericEmeraldHaze opacity={hazeOpacity} />
            </View>
            <View style={[styles.logoStage, { width: logoWidth, height: logoHeight }]}>
              <Animated.Image
                source={LOGO_SOURCE}
                resizeMode="contain"
                style={[
                  styles.logo,
                  {
                    width: logoWidth,
                    height: logoHeight,
                    opacity: logoOpacity,
                  },
                ]}
              />
            </View>
          </View>

          <Animated.Text style={[styles.tagline, { opacity: logoOpacity }]}>
            {homeHeader.productTagline}
          </Animated.Text>

          <Animated.View style={{ opacity: logoOpacity }}>
            <LoadingDots />
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
  },
  heroBlock: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingBottom: spacing.sectionGap * 3,
    overflow: 'visible',
  },
  heroVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    overflow: 'visible',
  },
  hazeAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoStage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  hazeLayer: {
    position: 'absolute',
    alignSelf: 'center',
  },
  logo: {
    zIndex: 2,
  },
  tagline: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.homeTagline,
    letterSpacing: letterSpacing.productTagline,
    textTransform: 'uppercase',
    color: colors.text.splashTagline,
    textAlign: 'center',
    marginBottom: spacing.splashTaglineToDots,
    paddingHorizontal: spacing.card,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: splashBrand.dotGap,
  },
  dot: {
    width: splashBrand.dotSize,
    height: splashBrand.dotSize,
    borderRadius: splashBrand.dotSize / 2,
  },
  dotAnimated: {
    backgroundColor: colors.brand.emerald,
  },
  dotOuter: {
    backgroundColor: colors.text.muted,
  },
  dotCenter: {
    backgroundColor: colors.brand.emerald,
  },
});
