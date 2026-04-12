import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { getPreviousBestScore, startAnalysisPipeline } from '../services/analysis';
import { trackEvent } from '../services/analytics';
import { incrementAnalysisCount } from '../services/subscription';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Processing'>;
type Route = RouteProp<MainStackParamList, 'Processing'>;

const PIPELINE_STEPS = [
  { key: 'uploading', label: 'Uploading video', icon: 'cloud-upload' as const },
  { key: 'extracting', label: 'Extracting body keypoints', icon: 'body' as const },
  { key: 'analyzing', label: 'AI coach reviewing swing', icon: 'analytics' as const },
  { key: 'completed', label: 'Analysis complete!', icon: 'checkmark-circle' as const },
];

export default function ProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, profile } = useAuth();
  const { videoUri } = route.params;

  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing...');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const animateProgress = useCallback((toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const runPipeline = useCallback(async () => {
    if (!user) return;
    setError(null);
    setCurrentStep(0);
    animateProgress(0);
    setStatusMessage('Preparing...');

    try {
      const { analysis, error: pipelineError } = await startAnalysisPipeline(
        user.id,
        videoUri,
        (status, message) => {
          setStatusMessage(message);
          if (status === 'uploading') {
            setCurrentStep(0);
            animateProgress(0.25);
          } else if (status === 'processing') {
            if (message.includes('keypoint')) {
              setCurrentStep(1);
              animateProgress(0.5);
            } else {
              setCurrentStep(2);
              animateProgress(0.75);
            }
          } else if (status === 'completed') {
            setCurrentStep(3);
            animateProgress(1);
          }
        },
        profile
      );

      if (pipelineError) {
        setError(pipelineError.message);
        return;
      }

      if (analysis) {
        await incrementAnalysisCount(user.id);
        const newScore = analysis.similarity_score ?? 0;
        const previousBest = await getPreviousBestScore(user.id, analysis.id);

        const isFirstSwing = previousBest === null;
        const isPersonalBest =
          !isFirstSwing && newScore > 0 && newScore >= previousBest;

        await new Promise<void>((resolve) => setTimeout(resolve, 1200));

        if (isFirstSwing || isPersonalBest) {
          trackEvent('personal_best_achieved', {
            new_score: newScore,
            previous_best: previousBest,
            is_first_swing: isFirstSwing,
          });
          navigation.replace('PersonalBest', {
            analysisId: analysis.id,
            newScore,
            previousBest,
          });
        } else {
          navigation.replace('Analysis', { analysisId: analysis.id });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, videoUri, profile, navigation, animateProgress]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    runPipeline();
  }, [retryKey, runPipeline]);

  if (error) {
    const isNoSwing = /couldn't detect a swing|no swing detected/i.test(error);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.red} />
          <Text style={styles.errorTitle}>
            {isNoSwing ? 'No Swing Detected' : 'Analysis Failed'}
          </Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.errorActions}>
            <Pressable
              style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
              onPress={() => setRetryKey((k) => k + 1)}
            >
              <Ionicons name="refresh" size={20} color={COLORS.black} />
              <Text style={styles.ctaButtonText}>Try Again</Text>
            </Pressable>
            <Text style={styles.retryLink} onPress={() => navigation.goBack()}>
              Choose a different video
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.pulseWrapper}>
        <View style={styles.pulseRingOuter} />
        <View style={styles.pulseRingMid} />
        <Animated.View
          style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
        >
          <Ionicons
            name={PIPELINE_STEPS[currentStep].icon}
            size={42}
            color={COLORS.accent}
          />
        </Animated.View>
      </View>

      <Text style={styles.title}>Analyzing Your Swing</Text>
      <Text style={styles.subtitle}>{statusMessage}</Text>

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.stepList}>
        {PIPELINE_STEPS.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <View key={step.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepIndicator,
                  isDone && styles.stepIndicator_done,
                  isActive && styles.stepIndicator_active,
                  !isDone && !isActive && styles.stepIndicator_pending,
                ]}
              >
                {isDone ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : isActive ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isDone && styles.stepLabel_done,
                  isActive && styles.stepLabel_active,
                  !isDone && !isActive && styles.stepLabel_pending,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.note}>
        This typically takes 30–90 seconds. Hang tight!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -150,
    marginTop: -180,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.accentGlow,
  },
  pulseWrapper: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRingMid: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.1)',
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 36,
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.accent,
    marginBottom: 28,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  stepList: {
    width: '100%',
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator_done: {
    backgroundColor: COLORS.green,
  },
  stepIndicator_active: {
    backgroundColor: COLORS.accentGlow,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  stepIndicator_pending: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepCheck: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
  stepLabel_done: {
    color: COLORS.text,
  },
  stepLabel_active: {
    color: COLORS.accent,
  },
  stepLabel_pending: {
    color: COLORS.textMuted,
  },
  note: {
    marginTop: 28,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  errorTitle: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    color: COLORS.red,
  },
  errorMessage: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorActions: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xl,
    borderRadius: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  retryLink: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
});
