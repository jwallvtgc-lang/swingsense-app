import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import {
  bottomTab,
  camera,
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
import InAppVideoReview from '../components/InAppVideoReview';
import { SPEECH_CONFIG } from '../utils/speechConfig';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Camera'>;

export default function CameraScreen() {
  const navigation = useNavigation<Nav>();
  const cameraRef = useRef<CameraView>(null);

  const [facing] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isReadyUI, setIsReadyUI] = useState(false);
  const isReadyRef = useRef(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = useMicrophonePermissions();
  const cuesHaveFired = useRef(false);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const retakePending = useRef(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      Speech.stop();
    };
  }, []);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={camera.recordButtonSize * 0.8} color={colors.text.muted} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>SwingSense needs camera access to record your swing</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Continue</Text>
        </Pressable>
      </View>
    );
  }

  const startCountdown = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);

    // Recording begins with the first visible countdown number so the entire
    // 3-2-1 lead-in is captured in the clip.
    setCountdown(3);
    startRecording();

    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const speakAndWait = (text: string) => new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    Speech.speak(text, {
      ...SPEECH_CONFIG,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  });

  const fireVoiceCues = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
    } catch (e) {
      console.log('[CameraScreen] Audio session setup failed:', e);
    }

    if (!audioPermission?.granted) {
      const result = await requestAudioPermission();
      if (!result.granted) {
        Alert.alert(
          'Microphone Required',
          'SwingSense needs microphone access to record your swing. Please enable Camera and Microphone in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    await speakAndWait('Step back until your full body is visible in the frame.');
    await new Promise(r => setTimeout(r, 250));
    await speakAndWait('Take your full swing when you are ready.');
    await new Promise(r => setTimeout(r, 250));
    startCountdown();
  };

  const handleManualRecord = () => {
    Speech.stop();
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
    setTimeout(startRecording, 300);
  };

  const onCameraReady = () => {
    setTimeout(() => {
      isReadyRef.current = true;
      setIsReadyUI(true);

      // Retakes skip the spoken setup and go straight back into the visible
      // countdown/recording flow as soon as the camera preview is ready again.
      if (retakePending.current) {
        retakePending.current = false;
        setTimeout(startCountdown, 500);
        return;
      }

      if (cuesHaveFired.current) return;
      cuesHaveFired.current = true;
      setTimeout(fireVoiceCues, 800);
    }, 400);
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: 6 });
      if (video) setRecordedVideoUri(video.uri);
    } catch (error) {
      console.error('Recording failed:', error);
      const message = __DEV__
        ? `Could not record video.\n\n${error instanceof Error ? error.message : String(error)}`
        : 'Could not record video. Please try again.';
      Alert.alert('Recording Failed', message);
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) cameraRef.current.stopRecording();
  };

  const goBack = () => {
    Speech.stop();
    if (isRecording) stopRecording();
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    navigation.goBack();
  };

  const handleRetake = () => {
    Speech.stop();
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
    retakePending.current = true;
    isReadyRef.current = false;
    setIsReadyUI(false);
    setRecordedVideoUri(null);
  };

  const handleUseVideo = () => {
    if (recordedVideoUri) {
      navigation.replace('Processing', {
        videoUri: recordedVideoUri,
        frontFacing: facing === 'front',
      });
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordedVideoUri) {
    return (
      <InAppVideoReview
        videoUri={recordedVideoUri}
        onRetake={handleRetake}
        onUseVideo={handleUseVideo}
        frontFacing={facing === 'front'}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        ref={cameraRef}
        mode="video"
        style={StyleSheet.absoluteFill}
        facing={facing}
        videoQuality="720p"
        onCameraReady={onCameraReady}
      />

      <View style={styles.overlayRoot} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={goBack}>
            <Ionicons name="close" size={header.iconSize} color={colors.text.primary} />
          </Pressable>
        </View>

        {isRecording && countdown === null && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTimer(recordingDuration)}</Text>
          </View>
        )}

        {countdown !== null ? (
          <View style={styles.instructionsOverlay} pointerEvents="none">
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          </View>
        ) : !isRecording ? (
          <View style={styles.instructionsOverlay} pointerEvents="none">
            <Text style={styles.instructionsText}>Step back until your full body is in frame</Text>
          </View>
        ) : null}

        <View style={styles.controls}>
          {!isRecording && (
            <Pressable style={styles.exitButton} onPress={goBack}>
              <Ionicons name="close" size={bottomTab.iconSize} color={colors.text.primary} />
            </Pressable>
          )}

          <View style={styles.recordingControls}>
            <Pressable
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                !isReadyUI && styles.recordButtonDisabled,
              ]}
              onPress={isRecording ? stopRecording : handleManualRecord}
              disabled={!isReadyUI}
            >
              {isRecording ? (
                <View style={styles.stopSquare} />
              ) : !isReadyUI ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <View style={styles.recordDot} />
              )}
            </Pressable>
          </View>

          {!isRecording && <View style={styles.spacer} />}
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
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screen,
  },
  permissionTitle: {
    fontSize: fontSizes.screenTitle,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginTop: spacing.card,
    marginBottom: spacing.cardGap,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(fontSizes.body * 1.5),
    marginBottom: spacing.sectionGap,
  },
  permissionButton: {
    backgroundColor: colors.bg.gold,
    paddingHorizontal: spacing.cardGap,
    paddingVertical: spacing.card,
    borderRadius: radius.card,
  },
  permissionButtonText: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: header.safeAreaPadding,
    paddingHorizontal: spacing.screen,
  },
  headerButton: {
    width: camera.controlButtonSize,
    height: camera.controlButtonSize,
    borderRadius: radius.circle,
    backgroundColor: camera.headerOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: camera.timerOverlay,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.card,
  },
  timerText: {
    fontSize: fontSizes.body,
    fontFamily: typography.display,
    color: colors.text.primary,
    textAlign: 'center',
  },
  instructionsOverlay: {
    position: 'absolute',
    top: '40%',
    left: spacing.screen,
    right: spacing.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsText: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    textAlign: 'center',
    backgroundColor: camera.overlayBackground,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.subCard,
  },
  countdownBadge: {
    minWidth: 96,
    minHeight: 96,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: fontSizes.heroScore,
    fontFamily: typography.display,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.tight,
  },
  controls: {
    position: 'absolute',
    bottom: bottomTab.height,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
  },
  exitButton: {
    width: camera.controlButtonSize,
    height: camera.controlButtonSize,
    borderRadius: radius.circle,
    backgroundColor: camera.headerOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: camera.recordButtonSize,
    height: camera.recordButtonSize,
    borderRadius: radius.circle,
    backgroundColor: camera.controlBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.text.primary,
  },
  recordButtonActive: {
    backgroundColor: camera.recordingBackground,
    borderColor: colors.text.red,
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordDot: {
    width: camera.recordDotSize,
    height: camera.recordDotSize,
    borderRadius: radius.circle,
    backgroundColor: colors.text.red,
  },
  stopSquare: {
    width: camera.stopSquareSize,
    height: camera.stopSquareSize,
    borderRadius: radius.xs,
    backgroundColor: colors.text.primary,
  },
  spacer: {
    width: camera.controlButtonSize,
  },
});