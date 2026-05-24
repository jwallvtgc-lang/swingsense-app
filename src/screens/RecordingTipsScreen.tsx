import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { MainStackParamList } from '../navigation/types';
import { SPEECH_CONFIG } from '../utils/speechConfig';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const RECORDING_TIPS = [
  {
    icon: 'camera-outline' as const,
    text: 'Position your phone at side angle, about 10 feet away',
  },
  {
    icon: 'body-outline' as const,
    text: 'Step back until your full body is visible from head to toe',
  },
  {
    icon: 'baseball-outline' as const,
    text: 'Take your natural swing when you hear the verbal cue',
  },
];

export default function RecordingTipsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartRecording = async () => {
    if (isStarting) return;

    setIsStarting(true);

    try {
      // Fire voice cues sequence
      await Speech.speak(
        'Step back until your full body is visible in the frame.',
        SPEECH_CONFIG
      );

      // Wait for first cue to finish, then continue sequence
      await new Promise(resolve => setTimeout(resolve, 2000));

      await Speech.speak(
        'Film from the side, about 10 feet away.',
        SPEECH_CONFIG
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      await Speech.speak(
        'Take your full swing when you are ready.',
        SPEECH_CONFIG
      );

      // Navigate to camera screen after voice cues
      navigation.navigate('Camera');
    } catch (error) {
      console.error('[RecordingTipsScreen] Voice cue error:', error);
      // Still navigate even if speech fails
      navigation.navigate('Camera');
    } finally {
      setIsStarting(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Top half - Illustration area */}
      <View style={styles.illustrationArea}>
        <View style={styles.cameraIllustration}>
          <View style={styles.phoneIcon}>
            <Ionicons name="phone-portrait" size={40} color={colors.text.gold} />
          </View>
          <View style={styles.arrowLine} />
          <View style={styles.playerIcon}>
            <Ionicons name="person" size={32} color={colors.text.primary} />
          </View>
        </View>
        <Text style={styles.illustrationCaption}>
          Side-angle view, full body visible
        </Text>
      </View>

      {/* Bottom half - Instructions */}
      <View style={styles.instructionsArea}>
        <Text style={styles.instructionsHeader}>BEFORE YOU RECORD</Text>

        <View style={styles.tipsList}>
          {RECORDING_TIPS.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons
                  name={tip.icon}
                  size={24}
                  color={colors.text.gold}
                />
              </View>
              <Text style={styles.tipText}>
                {tip.text}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.coachingLine}>
          You'll hear voice prompts to guide your setup
        </Text>

        <Pressable
          style={[
            styles.startButton,
            isStarting && styles.startButtonDisabled,
          ]}
          onPress={handleStartRecording}
          disabled={isStarting}
        >
          <Text style={styles.startButtonText}>
            {isStarting ? 'Starting...' : 'Start Recording →'}
          </Text>
        </Pressable>
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
    width: 44,
    height: 44,
    borderRadius: radius.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.bg.surface,
    marginHorizontal: spacing.screen,
    marginVertical: spacing.cardGap,
    borderRadius: radius.card,
  },
  cameraIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sectionGap,
    marginBottom: spacing.card,
  },
  phoneIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.text.muted,
    position: 'relative',
  },
  playerIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCaption: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.tight,
  },
  instructionsArea: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sectionGap,
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
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.cardGap,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.badge,
    backgroundColor: colors.bg.goldDim,
    borderWidth: 1,
    borderColor: colors.text.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.body * 1.5),
  },
  coachingLine: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.caption * 1.4),
    marginBottom: spacing.sectionGap,
  },
  startButton: {
    backgroundColor: colors.bg.gold,
    borderRadius: radius.card,
    padding: spacing.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
    letterSpacing: letterSpacing.cta,
  },
});