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
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, FONTS } from '../config/constants';
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

type Nav = NativeStackNavigationProp<MainStackParamList, 'Camera'>;
type Route = RouteProp<MainStackParamList, 'Camera'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasPlayedAudioCue, setHasPlayedAudioCue] = useState(false);

  useEffect(() => {
    // Play audio cue once per session
    console.log(`[CameraScreen] Audio cue check: permission=${permission?.granted}, hasPlayedAudioCue=${hasPlayedAudioCue}`);
    if (permission?.granted && !hasPlayedAudioCue) {
      console.log('[CameraScreen] Starting audio cue in 1 second...');
      setTimeout(() => {
        console.log('[CameraScreen] Playing audio cue');
        Speech.speak(
          'Make sure your full body is visible from head to toe, then record your swing.',
          {
            language: 'en',
            pitch: 1,
            rate: 0.9,
          }
        );
        setHasPlayedAudioCue(true);
      }, 1000);
    }
  }, [permission?.granted, hasPlayedAudioCue]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
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
        // Navigate to processing with video URI and front-facing flag
        navigation.replace('Processing', {
          videoUri: video.uri,
          frontFacing: facing === 'front',
        });
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
            <Ionicons name="close" size={28} color={COLORS.white} />
          </Pressable>

          <Pressable style={styles.headerButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={28} color={COLORS.white} />
          </Pressable>
        </View>

        {/* Camera Type Indicator */}
        <View style={styles.cameraTypeIndicator}>
          <Text style={styles.cameraTypeText}>
            {facing === 'front' ? 'Front Camera' : 'Back Camera'}
          </Text>
        </View>

        {/* Recording Instructions */}
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

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <View style={styles.recordingControls}>
            <Pressable
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isRecording && false} // Allow stopping
            >
              <View style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonInnerActive,
              ]}>
                <Ionicons
                  name={isRecording ? "stop" : "videocam"}
                  size={32}
                  color={isRecording ? COLORS.white : COLORS.accent}
                />
              </View>
            </Pressable>
          </View>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording...</Text>
            </View>
          )}
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
    justifyContent: 'space-between',
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
  cameraTypeIndicator: {
    position: 'absolute',
    top: 120,
    left: spacing.screen,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.cardSm,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.subCard,
  },
  cameraTypeText: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    color: colors.text.primary,
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
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.text.primary,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    borderColor: colors.text.red,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: radius.circle,
    backgroundColor: colors.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInnerActive: {
    backgroundColor: colors.text.red,
    borderRadius: radius.badge,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.card,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.cardSm,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.subCard,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.text.red,
    marginRight: spacing.iconGap,
  },
  recordingText: {
    fontSize: fontSizes.body,
    fontFamily: typography.body,
    color: colors.text.primary,
  },
});