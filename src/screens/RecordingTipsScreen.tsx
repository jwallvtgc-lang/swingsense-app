import React from 'react';
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
  startButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
    letterSpacing: letterSpacing.cta,
  },
});