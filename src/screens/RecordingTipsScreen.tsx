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
          <Ionicons name="chevron-back" size={header.iconSize} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Top half - SVG diagram fills space, no container */}
      <View style={styles.illustrationArea}>
        <Svg width="320" height="180" viewBox="0 0 320 180" style={styles.svgDiagram}>
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

          {/* Phone on stand (left side) */}
          <Rect
            x="40"
            y="70"
            width="24"
            height="40"
            rx="5"
            fill={colors.text.gold}
            stroke={colors.text.gold}
            strokeWidth="2"
          />
          <Rect
            x="44"
            y="74"
            width="16"
            height="26"
            rx="2"
            fill={colors.bg.base}
          />
          {/* Phone stand */}
          <Line
            x1="52"
            y1="110"
            x2="52"
            y2="120"
            stroke={colors.text.gold}
            strokeWidth="3"
          />
          <Line
            x1="46"
            y1="120"
            x2="58"
            y2="120"
            stroke={colors.text.gold}
            strokeWidth="3"
          />

          {/* Dashed arrow with distance label */}
          <Line
            x1="90"
            y1="90"
            x2="220"
            y2="90"
            stroke={colors.text.gold}
            strokeWidth="3"
            strokeDasharray="8,4"
            markerEnd="url(#arrowhead)"
          />
          <SvgText
            x="155"
            y="82"
            fontSize={fontSizes.sectionTitle.toString()}
            fill={colors.text.gold}
            textAnchor="middle"
            fontFamily={typography.body}
            fontWeight="500"
          >
            ~10 feet
          </SvgText>

          {/* Batter silhouette with bat (right side) */}
          {/* Head */}
          <Circle
            cx="260"
            cy="65"
            r="12"
            fill={colors.text.primary}
          />
          {/* Body */}
          <Line
            x1="260"
            y1="77"
            x2="260"
            y2="115"
            stroke={colors.text.primary}
            strokeWidth="6"
          />
          {/* Arms - left arm extended to bat */}
          <Line
            x1="260"
            y1="85"
            x2="240"
            y2="78"
            stroke={colors.text.primary}
            strokeWidth="4"
          />
          {/* Right arm to bat */}
          <Line
            x1="260"
            y1="90"
            x2="245"
            y2="85"
            stroke={colors.text.primary}
            strokeWidth="4"
          />
          {/* Legs */}
          <Line
            x1="260"
            y1="115"
            x2="250"
            y2="140"
            stroke={colors.text.primary}
            strokeWidth="4"
          />
          <Line
            x1="260"
            y1="115"
            x2="270"
            y2="140"
            stroke={colors.text.primary}
            strokeWidth="4"
          />
          {/* Bat */}
          <Rect
            x="230"
            y="65"
            width="8"
            height="28"
            rx="4"
            fill={colors.text.secondary}
          />
        </Svg>

        <Text style={styles.illustrationCaption}>
          SIDE-ANGLE VIEW · FULL BODY VISIBLE
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
    width: header.buttonSize,
    height: header.buttonSize,
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
    marginBottom: spacing.sectionGap,
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
    marginBottom: spacing.sectionGap + spacing.cardGap,
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