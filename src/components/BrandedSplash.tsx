import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  View,
} from 'react-native';

import {
  animation,
  colors,
  fontSizes,
  fontWeights,
  homeHeader,
  letterSpacing,
  spacing,
  splashBrand,
  typography,
} from '../../design-system/tokens';

const BACKGROUND_SOURCE = require('../../assets/splash-background.png');
const WORDMARK_SOURCE = require('../../assets/splash-wordmark.png');

const AMBER_DOT = '#E8A020';
const LOGO_VW = 0.66;
const LOGO_CENTER_VH = 0.415;

type BrandedSplashProps = {
  onComplete: () => void;
};

export default function BrandedSplash({ onComplete }: BrandedSplashProps) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const logoWidth = Math.min(screenWidth * LOGO_VW, 340);
  const logoHeight = logoWidth * splashBrand.logoAspect;
  const logoTop = screenHeight * LOGO_CENTER_VH - logoHeight / 2;
  const logoLeft = (screenWidth - logoWidth) / 2;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const wordmarkOpacity = useRef(new Animated.Value(1)).current;
  const wordmarkScale = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(8)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dot1Pulse = useRef(new Animated.Value(0.3)).current;
  const dot2Pulse = useRef(new Animated.Value(0.3)).current;
  const dot3Pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Wordmark breathe — opacity + scale, 2s cycle
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 0.92,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkScale, {
            toValue: 1.015,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1.0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkScale, {
            toValue: 1.0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    breathe.start();

    // Tagline entrance at t=200ms — fade + slide up 8px
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Dots container entrance at t=500ms
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered dot pulses starting at t=500ms, 150ms apart
    const makeDotLoop = (dotValue: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
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
            Animated.delay(300),
          ])
        ),
      ]);

    const d1 = makeDotLoop(dot1Pulse, 500);
    const d2 = makeDotLoop(dot2Pulse, 650);
    const d3 = makeDotLoop(dot3Pulse, 800);
    d1.start();
    d2.start();
    d3.start();

    const t = setTimeout(() => {
      onCompleteRef.current();
    }, animation.splashHold);

    return () => {
      clearTimeout(t);
      breathe.stop();
      d1.stop();
      d2.stop();
      d3.stop();
    };
  }, [
    wordmarkOpacity, wordmarkScale,
    taglineOpacity, taglineTranslateY,
    dotsOpacity, dot1Pulse, dot2Pulse, dot3Pulse,
  ]);

  return (
    <ImageBackground source={BACKGROUND_SOURCE} style={styles.root} resizeMode="cover">
      {/* Wordmark absolutely centered at 41.5% of screen height */}
      <Animated.View
        style={[
          styles.wordmark,
          {
            top: logoTop,
            left: logoLeft,
            width: logoWidth,
            height: logoHeight,
            opacity: wordmarkOpacity,
            transform: [{ scale: wordmarkScale }],
          },
        ]}
      >
        <Image
          source={WORDMARK_SOURCE}
          style={{ width: logoWidth, height: logoHeight }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline and dots in a flex column below the wordmark */}
      <View
        style={[
          styles.labelStack,
          { top: logoTop + logoHeight + spacing.splashLogoToTagline },
        ]}
      >
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          {homeHeader.productTagline}
        </Animated.Text>

        <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
          <Animated.View style={[styles.dot, { opacity: dot1Pulse }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Pulse }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Pulse }]} />
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  wordmark: {
    position: 'absolute',
  },
  labelStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    gap: spacing.splashTaglineToDots,
  },
  tagline: {
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.homeTagline,
    letterSpacing: letterSpacing.productTagline,
    textTransform: 'uppercase',
    color: colors.text.splashTagline,
    textAlign: 'center',
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
    backgroundColor: AMBER_DOT,
  },
});
