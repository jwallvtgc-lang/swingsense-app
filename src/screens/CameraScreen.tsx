import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
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
type Route = RouteProp<MainStackParamList, 'Camera'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const cameraRef = useRef<CameraView>(null);

  const [facing] = useState<CameraType>('front'); // Lock to front camera
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
  const autoStartPending = useRef(false);

  // Timer effect for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
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

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={camera.recordButtonSize * 0.8} color={colors.text.muted} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          SwingSense needs camera access to record your swing
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  // Camera flip functionality removed - locked to front camera

  const startCountdown = () => {
    setCountdown(3);
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownTimer.current!);
          setCountdown(null);
          autoStartPending.current = true;
          tryAutoStartRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fireVoiceCues = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });
    } catch (e) {
      console.log('[CameraScreen] Audio session setup failed:', e);
    }

    try {
      await Speech.speak(
        "Step back until your full body is visible in the frame.",
        SPEECH_CONFIG
      );
    } catch (e) {
      console.log('[CameraScreen] Speech cue 1 failed:', e);
    }

    await new Promise(r => setTimeout(r, 2000));

    try {
      await Speech.speak(
        "Take your full swing when you are ready.",
        SPEECH_CONFIG
      );
    } catch (e) {
      console.log('[CameraScreen] Speech cue 2 failed:', e);
    }

    await new Promise(r => setTimeout(r, 500));

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

    startCountdown();
  };

  const handleManualRecord = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setCountdown(null);
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  const tryAutoStartRecording = () => {
    if (isReadyRef.current && autoStartPending.current) {
      autoStartPending.current = false;
      setTimeout(() => {
        startRecording();
      }, 1500);
    }
  };

  const onCameraReady = () => {
    // Add 500ms buffer for real devices to fully initialize
    setTimeout(() => {
      isReadyRef.current = true;
      setIsReadyUI(true);
      tryAutoStartRecording(); // Check if auto-start is pending

      if (cuesHaveFired.current) return;
      cuesHaveFired.current = true;

      setTimeout(fireVoiceCues, 1000);
    }, 500);
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 10,
      });

      if (video) {
        setRecordedVideoUri(video.uri);
      }
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
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const goBack = () => {
    if (isRecording) {
      stopRecording();
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    navigation.goBack();
  };

  const handleRetake = () => {
    setRecordedVideoUri(null);
    // Don't replay audio cues on retake
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

  // Show video review if we have a recorded video
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
        style={styles.camera}
        facing={facing}
        videoQuality="720p"
        onCameraReady={onCameraReady}
      >
        {/* Header Controls */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={goBack}>
            <Ionicons name="close" size={header.iconSize} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Recording Timer (only show while recording) */}
        {isRecording && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {formatTimer(recordingDuration)}
            </Text>
          </View>
        )}

        {/* Recording Instructions (only show when not recording) */}
        {!isRecording && (
          <View style={styles.instructionsOverlay}>
            {countdown !== null ? (
              <Text style={styles.countdownText}>
                {countdown}
              </Text>
            ) : (
              <Text style={styles.instructionsText}>
                Step back until your full body is in frame
              </Text>
            )}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controls}>
          {/* X button bottom left (only when not recording) */}
          {!isRecording && (
            <Pressable style={styles.exitButton} onPress={goBack}>
              <Ionicons name="close" size={bottomTab.iconSize} color={colors.text.primary} />
            </Pressable>
          )}

          {/* Record/Stop button center */}
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

          {/* Spacer for balance */}
          {!isRecording && <View style={styles.spacer} />}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  camera: {
    flex: 1,
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
    zIndex: 1,
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