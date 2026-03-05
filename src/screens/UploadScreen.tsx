import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZE } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { canUserAnalyze } from '../services/subscription';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Upload'>;

export default function UploadScreen() {
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const checkQuota = async (): Promise<boolean> => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to analyze swings.');
      return false;
    }
    try {
      const result = await canUserAnalyze(user.id);
      if (!result.allowed) {
        Alert.alert('Limit Reached', result.reason ?? 'Upgrade to continue.');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Quota] Check failed, allowing anyway:', err);
      return true;
    }
  };

  const ICLOUD_ERROR_MSG =
    'This video may be in iCloud and not fully downloaded. Try again (ensure Wi‑Fi), or use a video saved on this device.';

  const pickVideo = async () => {
    try {
      const ok = await checkQuota();
      if (!ok) return;

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow full access to your photo library in Settings > SwingSense > Photos.',
        );
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
        // Use HighestQuality on iOS to avoid PHPhotosErrorDomain 3164 with iCloud videos.
        // Passthrough fails for iCloud assets; HighestQuality transcodes and can download.
        ...(Platform.OS === 'ios' && {
          videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
        }),
      };

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.type !== 'video') {
          Alert.alert('Video required', 'Please select a video, not a photo.');
          return;
        }
        setSelectedVideo(asset.uri);
        setThumbnail(asset.uri);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UploadScreen] pickVideo error:', msg);

      const isICloudError =
        msg.includes('PHPhotosErrorDomain') ||
        msg.includes('3164') ||
        msg.includes('network request failed');

      if (isICloudError && Platform.OS === 'ios') {
        Alert.alert(
          'Video in iCloud',
          ICLOUD_ERROR_MSG,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: pickVideo },
          ]
        );
      } else {
        Alert.alert(
          'Could not load video',
          isICloudError ? ICLOUD_ERROR_MSG : msg
        );
      }
    }
  };

  const recordVideo = async () => {
    try {
      const ok = await checkQuota();
      if (!ok) return;

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to record.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 30,
        videoQuality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedVideo(asset.uri);
        setThumbnail(asset.uri);
      }
    } catch (err) {
      console.error('[UploadScreen] recordVideo error:', err);
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  const startAnalysis = () => {
    if (!selectedVideo) return;
    navigation.navigate('Processing', { videoUri: selectedVideo });
    setSelectedVideo(null);
    setThumbnail(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hey{profile?.first_name ? `, ${profile.first_name}` : ''}
        </Text>
        <Text style={styles.headerTitle}>Analyze Your Swing</Text>
        <Text style={styles.headerSub}>
          Upload a side-angle video of your swing (5-30 seconds, full body visible)
        </Text>
      </View>

      {selectedVideo ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewBox}>
            <Ionicons name="videocam" size={48} color={COLORS.accent} />
            <Text style={styles.previewText}>Video selected</Text>
            <Text style={styles.previewSubtext}>Ready to analyze</Text>
          </View>

          <TouchableOpacity style={styles.analyzeButton} onPress={startAnalysis}>
            <Ionicons name="flash" size={22} color={COLORS.black} />
            <Text style={styles.analyzeButtonText}>Analyze This Swing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => {
              setSelectedVideo(null);
              setThumbnail(null);
            }}
          >
            <Text style={styles.changeButtonText}>Choose Different Video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.uploadOptions}>
          <TouchableOpacity style={styles.uploadCard} onPress={pickVideo}>
            <View style={styles.uploadIconContainer}>
              <Ionicons name="cloud-upload-outline" size={40} color={COLORS.accent} />
            </View>
            <View style={styles.uploadCardTextContainer}>
              <Text style={styles.uploadCardTitle}>Upload from Library</Text>
              <Text style={styles.uploadCardSub}>
                Select a swing video from your camera roll
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadCard} onPress={recordVideo}>
            <View style={styles.uploadIconContainer}>
              <Ionicons name="camera-outline" size={40} color={COLORS.primaryLight} />
            </View>
            <View style={styles.uploadCardTextContainer}>
              <Text style={styles.uploadCardTitle}>Record Now</Text>
              <Text style={styles.uploadCardSub}>
                Film your swing with front or back camera
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Tips for best results</Text>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.tipText}>Film from the side (3rd base or 1st base line)</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.tipText}>Full body visible from feet to bat</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.tipText}>Good lighting, minimal background movement</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.tipText}>5–30 seconds, one swing per clip</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  uploadOptions: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  uploadCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTextContainer: {
    flex: 1,
  },
  uploadCardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  uploadCardSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  previewContainer: {
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  previewBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  previewText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  analyzeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  analyzeButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.black,
  },
  changeButton: {
    alignItems: 'center',
    padding: SPACING.sm,
  },
  changeButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  tips: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  tipsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    flex: 1,
  },
});
