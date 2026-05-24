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
import Svg, { Line, Text as SvgText, Rect, Circle, Defs, Marker, Polygon } from 'react-native-svg';
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

      {/* Top half - SVG diagram with full-bleed dark background */}
      <View style={styles.illustrationArea}>
        <View style={styles.svgDiagram}>
          <Svg width="280" height="120" viewBox="0 0 280 120">
            <Defs>
              <Marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <Polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={colors.text.gold}
                />
              </Marker>
            </Defs>

            {/* Phone icon (simple rectangle) */}
            <Rect
              x="25"
              y="35"
              width="20"
              height="32"
              rx="4"
              fill={colors.text.gold}
              stroke={colors.text.gold}
              strokeWidth="1"
            />
            <Rect
              x="28"
              y="38"
              width="14"
              height="20"
              rx="2"
              fill={colors.bg.base}
            />

            {/* Arrow with distance label */}
            <Line
              x1="70"
              y1="51"
              x2="200"
              y2="51"
              stroke={colors.text.gold}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <SvgText
              x="135"
              y="44"
              fontSize="12"
              fill={colors.text.muted}
              textAnchor="middle"
              fontFamily={typography.body}
            >
              ~10 feet
            </SvgText>

            {/* Player silhouette (simple circle with body) */}
            <Circle
              cx="235"
              cy="42"
              r="8"
              fill={colors.text.muted}
            />
            <Rect
              x="230"
              y="50"
              width="10"
              height="20"
              rx="2"
              fill={colors.text.muted}
            />
          </Svg>
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
              <Ionicons
                name={tip.icon}
                size={24}
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
    backgroundColor: colors.bg.base,
  },
  svgDiagram: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.card,
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
    gap: 20,
    marginBottom: spacing.sectionGap,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.cardGap,
    paddingVertical: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.body,
    color: colors.text.primary,
    lineHeight: Math.round(15 * 1.5),
    marginTop: 2,
  },
  coachingLine: {
    fontSize: 13,
    fontFamily: typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: Math.round(13 * 1.4),
    marginBottom: 32,
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