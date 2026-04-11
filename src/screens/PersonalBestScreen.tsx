import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  scoreRing,
  spacing,
  typography,
} from '../../design-system/tokens';

const AUTO_ADVANCE_MS = 3000; // 3s — long enough to read the score, short enough to feel snappy

/** Ambient halo: 2× large ring diameter, half as corner radius — matches spec proportions via tokens. */
const AMBIENT_SIZE = scoreRing.sizeLg * 2;
const AMBIENT_RADIUS = scoreRing.sizeLg;

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

  const navigatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isFirstSwing = previousBest == null;
  const improvement =
    previousBest != null ? Math.round(newScore - previousBest) : null;

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.body,
          {
            paddingTop: insets.top + spacing.screen,
            paddingHorizontal: spacing.screen,
          },
        ]}
      >
        <Text style={styles.topLabel} maxFontSizeMultiplier={1.35}>
          {isFirstSwing ? 'FIRST SWING' : 'NEW PERSONAL BEST'}
        </Text>

        <View style={styles.hero}>
          <View
            style={[styles.ambientWrap, { width: AMBIENT_SIZE, height: AMBIENT_SIZE }]}
            pointerEvents="none"
          >
            <View style={styles.ambientCircle} />
            <ScoreRing score={Math.round(newScore)} size="lg" />
          </View>
        </View>

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

        {isFirstSwing ? (
          <View style={styles.statSingle}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
                YOUR SCORE
              </Text>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                {Math.round(newScore)}
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
                +{improvement}
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.35}>
                NEW BEST
              </Text>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                {Math.round(newScore)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: spacing.screen,
            paddingBottom: insets.bottom + spacing.screen,
          },
        ]}
      >
        <PrimaryButton label="SEE MY RESULTS" onPress={goToAnalysis} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  body: {
    flex: 1,
    alignItems: 'center',
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
  statSingle: {
    marginTop: spacing.sectionGap,
    alignSelf: 'stretch',
  },
  statRow: {
    marginTop: spacing.sectionGap,
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
  footer: {
    alignSelf: 'stretch',
  },
});
