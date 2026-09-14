import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  header,
  letterSpacing,
  premiumActionCardVariants,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'RecordingTips'>;

/** Icon circle diameter — spec calls for an exact 34px tinted circle. */
const TIP_ICON_SIZE = 34;
/** Step-dot diameter, matching the small-dot convention used in BrandedSplash. */
const STEP_DOT_SIZE = 6;
const STEP_DOT_COUNT = 4;

const RECORDING_TIPS = [
  {
    icon: 'camera-outline' as const,
    text: 'Position your phone on a stable object with the screen facing you',
    variant: 'gold' as const,
  },
  {
    icon: 'body-outline' as const,
    text: 'Step back until your full body is visible from head to toe',
    variant: 'gold' as const,
  },
  {
    icon: 'baseball-outline' as const,
    text: 'Take your natural swing when you hear the verbal cue',
    variant: 'emerald' as const,
  },
];

export default function RecordingTipsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const stepIndex = route.params?.stepIndex ?? 0;

  const handleStartRecording = () => {
    navigation.navigate('Camera');
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={header.iconSize} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.instructionsHeader}>BEFORE YOU RECORD</Text>

        <View style={styles.tipsList}>
          {RECORDING_TIPS.map((tip, index) => {
            const palette = premiumActionCardVariants[tip.variant];
            const iconColor = tip.variant === 'emerald' ? colors.brand.emerald : colors.text.gold;
            return (
              <View key={index} style={styles.tipCard}>
                <View style={[styles.tipIconCircle, { backgroundColor: palette.iconBg }]}>
                  <Ionicons name={tip.icon} size={bottomTab.iconSize} color={iconColor} />
                </View>
                <Text style={styles.tipText}>
                  {tip.text}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.coachingLineRow}>
          <Ionicons name="volume-medium-outline" size={fontSizes.body} color={colors.text.muted} />
          <Text style={styles.coachingLine}>
            You'll hear voice prompts to guide your setup
          </Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.stepDots}>
          {Array.from({ length: STEP_DOT_COUNT }).map((_, index) => (
            <View
              key={index}
              style={[styles.stepDot, index === stepIndex && styles.stepDotActive]}
            />
          ))}
        </View>

        <View style={{ paddingBottom: Math.max(insets.bottom, spacing.sectionGap) }}>
          <Pressable
            style={styles.startButton}
            onPress={handleStartRecording}
          >
            <Text style={styles.startButtonText}>
              Start Recording →
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.card,
    paddingBottom: spacing.iconGap,
  },
  backButton: {
    width: header.buttonSize,
    height: header.buttonSize,
    borderRadius: radius.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  spacer: {
    flex: 1,
  },
  instructionsHeader: {
    fontSize: fontSizes.label,
    fontFamily: typography.body,
    fontWeight: fontWeights.bold,
    color: colors.text.muted,
    textAlign: 'center',
    letterSpacing: letterSpacing.label,
    marginBottom: spacing.sectionGap,
  },
  tipsList: {
    gap: spacing.cardGap,
    marginBottom: spacing.sectionGap,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardGap,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.subCard,
    padding: spacing.inputVertical,
  },
  tipIconCircle: {
    width: TIP_ICON_SIZE,
    height: TIP_ICON_SIZE,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.actionCardTitle,
    fontFamily: typography.body,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.actionCardTitle * 1.5),
  },
  coachingLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
  },
  coachingLine: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.body * 1.4),
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
    marginBottom: spacing.sectionGap,
  },
  stepDot: {
    width: STEP_DOT_SIZE,
    height: STEP_DOT_SIZE,
    borderRadius: radius.circle,
    backgroundColor: colors.text.muted,
  },
  stepDotActive: {
    backgroundColor: colors.bg.gold,
  },
  startButton: {
    backgroundColor: colors.bg.gold,
    borderRadius: radius.card,
    padding: spacing.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
    letterSpacing: letterSpacing.cta,
  },
});
