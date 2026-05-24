import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
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
import InAppVideoReview from '../components/InAppVideoReview';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Camera'>;
type Route = RouteProp<MainStackParamList, 'Camera'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();

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

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.text.muted} />
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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
      });

      if (video) {
        setRecordedVideoUri(video.uri);
      }
    } catch (error) {
      console.error('Recording failed:', error);
      Alert.alert('Recording Failed', 'Could not record video. Please try again.');
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
        style={styles.camera}
        facing={facing}
      >
        {/* Header Controls */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={goBack}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
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
            <Text style={styles.instructionsText}>
              Position yourself so your full body is visible
            </Text>
            {facing === 'front' && (
              <Text style={styles.frontCameraNote}>
                Front camera view is mirrored
              </Text>
            )}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controls}>
          {/* X button bottom left (only when not recording) */}
          {!isRecording && (
            <Pressable style={styles.exitButton} onPress={goBack}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </Pressable>
          )}

          {/* Record/Stop button center */}
          <View style={styles.recordingControls}>
            <Pressable
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <View style={styles.stopSquare} />
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
    paddingTop: 60,
    paddingHorizontal: spacing.screen,
    zIndex: 1,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.subCard,
  },
  frontCameraNote: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    color: colors.text.primary,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.cardSm,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.badge,
    marginTop: spacing.iconGap,
  },
  controls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
  },
  exitButton: {
    width: 48,
    height: 48,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.text.primary,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    borderColor: colors.text.red,
  },
  recordDot: {
    width: 24,
    height: 24,
    borderRadius: radius.circle,
    backgroundColor: colors.text.red,
  },
  stopSquare: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    backgroundColor: colors.text.primary,
  },
  spacer: {
    width: 48,
  },
});