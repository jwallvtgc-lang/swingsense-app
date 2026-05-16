import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { useAuth } from '../contexts/AuthContext';
import { canUserAnalyze } from '../services/subscription';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

  const recordVideo = useCallback(async (cameraType: 'front' | 'back' = 'front'): Promise<string | null> => {
    console.log('[AI-67] recordVideo called with cameraType:', cameraType);
    try {
      const ok = await checkQuota();
      if (!ok) return null;

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to record.');
        return null;
      }

      if (isExpoGo) {
        Alert.alert(
          'Camera Not Available',
          'Camera recording requires a production build. Please use the TestFlight version to test recording.',
          [{ text: 'OK' }]
        );
        return null;
      }

      try {
        console.log('[AI-67] launching camera...');
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          quality: 1,
          videoMaxDuration: 8,
        });
        console.log('[AI-67] camera result:', result.canceled ? 'canceled' : 'success');

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          console.log('[AI-67] video recorded successfully:', asset.uri);
          return asset.uri;
        }
        return null;
      } catch (cameraErr) {
        console.error('[useVideoPicker] camera launch error:', cameraErr);
        const errorMsg = cameraErr instanceof Error ? cameraErr.message : String(cameraErr);

        if (errorMsg.includes('expo-go') || errorMsg.includes('ExpoGo')) {
          Alert.alert(
            'Camera Error',
            'Camera recording has issues in Expo Go. For full functionality, please use a development build or TestFlight version.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Camera Error',
            `Could not open camera: ${errorMsg}. Please check camera permissions and try again.`,
            [{ text: 'OK' }]
          );
        }
        return null;
      }
    } catch (err) {
      console.error('[useVideoPicker] recordVideo error:', err);
      Alert.alert('Error', 'Could not open camera. Please try again.');
      return null;
    }
  }, [checkQuota]);

  return { pickFromLibrary, recordVideo };
}
