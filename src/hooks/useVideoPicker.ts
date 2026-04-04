import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../contexts/AuthContext';
import { canUserAnalyze } from '../services/subscription';

const ICLOUD_ERROR_MSG =
  'This video may be in iCloud and not fully downloaded. Try again (ensure Wi‑Fi), or use a video saved on this device.';

export function useVideoPicker() {
  const { user } = useAuth();

  const checkQuota = useCallback(async (): Promise<boolean> => {
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
  }, [user]);

  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    const tryPick = async (): Promise<string | null> => {
      try {
        const ok = await checkQuota();
        if (!ok) return null;

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission needed',
            'Please allow full access to your photo library in Settings > SwingSense > Photos.',
          );
          return null;
        }

        const pickerOptions: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['videos'],
          allowsEditing: false,
          quality: 1,
          ...(Platform.OS === 'ios' && {
            videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
          }),
        };

        const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          if (asset.type !== 'video') {
            Alert.alert('Video required', 'Please select a video, not a photo.');
            return null;
          }
          return asset.uri;
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useVideoPicker] pickFromLibrary error:', msg);

        const isICloudError =
          msg.includes('PHPhotosErrorDomain') ||
          msg.includes('3164') ||
          msg.includes('network request failed');

        if (isICloudError && Platform.OS === 'ios') {
          Alert.alert('Video in iCloud', ICLOUD_ERROR_MSG, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: () => void tryPick() },
          ]);
        } else {
          Alert.alert(
            'Could not load video',
            isICloudError ? ICLOUD_ERROR_MSG : msg,
          );
        }
        return null;
      }
    };

    return tryPick();
  }, [checkQuota]);

  const recordVideo = useCallback(async (): Promise<string | null> => {
    try {
      const ok = await checkQuota();
      if (!ok) return null;

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to record.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 30,
        videoQuality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return asset.uri;
      }
      return null;
    } catch (err) {
      console.error('[useVideoPicker] recordVideo error:', err);
      Alert.alert('Error', 'Could not open camera. Please try again.');
      return null;
    }
  }, [checkQuota]);

  return { pickFromLibrary, recordVideo };
}
