import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { startAnalysisPipeline } from '../services/analysis';
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
        setTimeout(() => {
          navigation.replace('Results', { analysisId: analysis.id });
        }, 1200);
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
          <Ionicons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>
            {isNoSwing ? 'No Swing Detected' : 'Analysis Failed'}
          </Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={() => setRetryKey((k) => k + 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={COLORS.black} />
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
            <Text
              style={styles.retryLink}
              onPress={() => navigation.goBack()}
            >
              Choose a different video
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconCircle,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Ionicons
          name={PIPELINE_STEPS[currentStep].icon}
          size={48}
          color={COLORS.accent}
        />
      </Animated.View>

      <Text style={styles.title}>Analyzing Your Swing</Text>
      <Text style={styles.status}>{statusMessage}</Text>

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

      <View style={styles.stepsContainer}>
        {PIPELINE_STEPS.map((step, index) => (
          <View key={step.key} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                index < currentStep && styles.stepDotCompleted,
                index === currentStep && styles.stepDotActive,
              ]}
            >
              {index < currentStep ? (
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              ) : index === currentStep ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : null}
            </View>
            <Text
              style={[
                styles.stepLabel,
                index <= currentStep && styles.stepLabelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.waitMessage}>
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
    padding: SPACING.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  status: {
    fontSize: FONT_SIZE.md,
    color: COLORS.accent,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceLight,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  stepsContainer: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  stepLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  stepLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  waitMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  errorTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.error,
  },
  errorMessage: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorActions: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 14,
  },
  tryAgainText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.black,
  },
  retryLink: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
