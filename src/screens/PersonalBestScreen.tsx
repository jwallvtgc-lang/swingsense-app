import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import ScoreRing from '../components/ScoreRing';
import type { MainStackParamList } from '../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

const AUTO_ADVANCE_MS = 3000; // 3s — long enough to read the score, short enough to feel snappy

/** Ambient halo behind ScoreRing — reduced so it does not dominate the layout. */
const AMBIENT_SIZE = 240;
const AMBIENT_RADIUS = 120;

const SCORE_COUNT_MS = 1000;
const COUNT_TICK_MS = 16;
const FADE_IN_DELAY_MS = 800;
const FADE_IN_DURATION_MS = 400;
const RING_SPRING_FRICTION = 7;
const RING_SPRING_TENSION = 42;

export type Params = {
  analysisId: string;
  newScore: number;
  previousBest: number | null;
};

type Nav = NativeStackNavigationProp<MainStackParamList, 'PersonalBest'>;
type Route = RouteProp<MainStackParamList, 'PersonalBest'>;

export default function PersonalBestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { analysisId, newScore, previousBest } = route.params;

  const [displayedScore, setDisplayedScore] = useState(0);

  const ringScale = useRef(new Animated.Value(0.7)).current;
  const headlineFade = useRef(new Animated.Value(0)).current;
  const statsFade = useRef(new Animated.Value(0)).current;

  const navigatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToAnalysis = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    navigation.replace('Analysis', { analysisId });
  }, [navigation, analysisId]);

  useEffect(() => {
    timerRef.current = setTimeout(goToAnalysis, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [goToAnalysis]);

  const targetScore = Math.round(newScore);

  useEffect(() => {
    setDisplayedScore(0);
    const start = Date.now();
    countIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / SCORE_COUNT_MS);
      setDisplayedScore(Math.round(targetScore * t));
      if (t >= 1 && countIntervalRef.current != null) {
        clearInterval(countIntervalRef.current);
        countIntervalRef.current = null;
      }
    }, COUNT_TICK_MS);
    return () => {
      if (countIntervalRef.current != null) {
        clearInterval(countIntervalRef.current);
        countIntervalRef.current = null;
      }
    };
  }, [targetScore]);

  useEffect(() => {
    ringScale.setValue(0.7);
    Animated.spring(ringScale, {
      toValue: 1,
      friction: RING_SPRING_FRICTION,
      tension: RING_SPRING_TENSION,
      useNativeDriver: true,
    }).start();

    headlineFade.setValue(0);
    statsFade.setValue(0);
    Animated.timing(headlineFade, {
      toValue: 1,
      duration: FADE_IN_DURATION_MS,
      delay: FADE_IN_DELAY_MS,
      useNativeDriver: true,
    }).start();
    Animated.timing(statsFade, {
      toValue: 1,
      duration: FADE_IN_DURATION_MS,
      delay: FADE_IN_DELAY_MS,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entrance animations run once on mount
  }, []);

  const isFirstSwing = previousBest == null;
  const improvementShown =
    previousBest != null
      ? Math.max(0, Math.round(displayedScore - previousBest))
      : null;

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.outer,
          {
            paddingTop: insets.top,
            paddingHorizontal: spacing.screen,
          },
        ]}
      >
        <View style={styles.spaceBetween}>
          <View style={styles.topSection}>
            <Text style={styles.topLabel} maxFontSizeMultiplier={1.35}>
              {isFirstSwing ? 'FIRST SWING' : 'NEW PERSONAL BEST'}
            </Text>

            <Animated.View
              style={[styles.hero, { transform: [{ scale: ringScale }] }]}
            >
              <View
                style={[styles.ambientWrap, { width: AMBIENT_SIZE, height: AMBIENT_SIZE }]}
                pointerEvents="none"
              >
                <View style={styles.ambientCircle} />
                <ScoreRing score={displayedScore} size="lg" />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: headlineFade }}>
              <Text style={styles.headline} maxFontSizeMultiplier={1.25}>
                {isFirstSwing ? 'WELCOME TO SWINGSENSE' : 'YOUR BEST SWING YET'}
              </Text>

              {isFirstSwing ? (
                <Text style={styles.subtext} maxFontSizeMultiplier={1.35}>
                  Here is your baseline score
                </Text>
              ) : (
                <Text style={styles.subtextRow} maxFontSizeMultiplier={1.35}>
                  <Text style={styles.subtextSecondary}>Previous best: </Text>
                  <Text style={styles.subtextMuted}>{previousBest}</Text>
                </Text>
              )}
            </Animated.View>
          </View>

          <View
            style={[
              styles.bottomSection,
              { paddingBottom: insets.bottom + spacing.screen },
            ]}
          >
            <Animated.View style={[styles.statsWrap, { opacity: statsFade }]}>
              {isFirstSwing ? (
                <View style={styles.statSingle}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
                      YOUR SCORE
                    </Text>
                    <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                      {displayedScore}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.statRow}>
                  <View style={[styles.statCard, styles.statCardHalf]}>
                    <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
                      IMPROVEMENT
                    </Text>
                    <Text style={styles.statValueGreen} maxFontSizeMultiplier={1.25}>
                      +{improvementShown}
                    </Text>
                  </View>
                  <View style={[styles.statCard, styles.statCardHalf]}>
                    <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
                      NEW BEST
                    </Text>
                    <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                      {displayedScore}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>

            <PrimaryButton label="SEE MY RESULTS" onPress={goToAnalysis} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  outer: {
    flex: 1,
  },
  spaceBetween: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  topLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    letterSpacing: letterSpacing.tagline,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  hero: {
    marginTop: spacing.sectionGap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientCircle: {
    position: 'absolute',
    width: AMBIENT_SIZE,
    height: AMBIENT_SIZE,
    borderRadius: AMBIENT_RADIUS,
    backgroundColor: colors.bg.gold,
    opacity: 0.06,
  },
  headline: {
    marginTop: spacing.sectionGap,
    fontFamily: typography.display,
    fontSize: fontSizes.subScore,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.tight,
  },
  subtext: {
    marginTop: spacing.cardGap,
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  subtextRow: {
    marginTop: spacing.cardGap,
    textAlign: 'center',
  },
  subtextSecondary: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
  },
  subtextMuted: {
    fontFamily: typography.body,
    fontSize: fontSizes.body,
    color: colors.text.muted,
  },
  bottomSection: {
    alignSelf: 'stretch',
  },
  statsWrap: {
    marginBottom: spacing.cardGap,
  },
  statSingle: {
    alignSelf: 'stretch',
  },
  statRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.subGrid,
  },
  statCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.subCard,
    padding: spacing.card,
    alignItems: 'center',
  },
  statCardHalf: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.muted,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    marginBottom: spacing.pillGap,
  },
  statValue: {
    fontFamily: typography.display,
    fontSize: fontSizes.subScore,
    color: colors.text.primary,
    letterSpacing: letterSpacing.tight,
  },
  statValueGreen: {
    fontFamily: typography.display,
    fontSize: fontSizes.subScore,
    color: colors.text.green,
    letterSpacing: letterSpacing.tight,
  },
});
