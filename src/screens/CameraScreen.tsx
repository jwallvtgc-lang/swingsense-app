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
    if (permission?.granted && !hasPlayedAudioCue) {
      setTimeout(() => {
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
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 24,
    zIndex: 1,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTypeIndicator: {
    position: 'absolute',
    top: 120,
    left: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cameraTypeText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.white,
  },
  instructionsOverlay: {
    position: 'absolute',
    top: '40%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  frontCameraNote: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
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
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    borderColor: '#dc2626',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInnerActive: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.white,
  },
});