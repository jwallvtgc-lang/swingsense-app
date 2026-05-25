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
  bottomTab,
  colors,
  fontSizes,
  fontWeights,
  header,
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
    text: 'Position your phone on a stable object with the screen facing you',
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
          <Ionicons name="chevron-back" size={header.iconSize} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View>
          <Text style={styles.instructionsHeader}>BEFORE YOU RECORD</Text>

          <View style={styles.tipsList}>
            {RECORDING_TIPS.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons
                  name={tip.icon}
                  size={bottomTab.iconSize}
                  color={colors.text.gold}
                />
                <Text style={styles.tipText}>
                  {tip.text}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.coachingLine}>
            You'll hear voice prompts to guide your setup
          </Text>
        </View>

        <View style={styles.footer}>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
  },
  footer: {
    paddingBottom: 32,
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
    gap: spacing.sectionGap,
    marginBottom: spacing.sectionGap,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.cardGap,
    paddingVertical: spacing.pillGap,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.actionCardTitle,
    fontFamily: typography.body,
    color: colors.text.primary,
    lineHeight: Math.round(fontSizes.actionCardTitle * 1.5),
    marginTop: spacing.pillGap / 3,
  },
  coachingLine: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.body * 1.4),
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