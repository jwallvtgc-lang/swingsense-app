import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZE, FONTS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { canUserAnalyze } from '../services/subscription';
import type { MainStackParamList } from '../navigation/types';
import BottomTabBar from '../components/BottomTabBar';
import { useMainTabBarNav } from '../navigation/useMainTabBarNav';
import { bottomTab } from '../../design-system/tokens';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Upload'>;

const TIPS = [
  'Film from the side (3rd base or 1st base line)',
  'Full body visible from feet to bat',
  'Good lighting, minimal background movement',
  '5–30 seconds, one swing per clip',
];

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const navigateMainTab = useMainTabBarNav();
  const { user, profile } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const scrollBottomPad = useMemo(
    () => bottomTab.height + insets.bottom + SPACING.xl,
    [insets.bottom]
  );

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
  };

  const clearVideo = () => {
    setSelectedVideo(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.glow} />
          <Text style={styles.greeting}>
            Hey{profile?.first_name ? `, ${profile.first_name}` : ''}
          </Text>
          <Text style={styles.headline}>
            Analyze{'\n'}Your <Text style={styles.headlineAccent}>Swing</Text>
          </Text>
          <Text style={styles.subtext}>
            Upload a side-angle video (5–30 sec, full body visible)
          </Text>
        </View>

        {selectedVideo ? (
          <View style={styles.previewSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                styles.actionCardPrimary,
                pressed && styles.actionCardPressed,
              ]}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="videocam" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>Video selected</Text>
                <Text style={styles.cardDesc}>Ready to analyze</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
              ]}
              onPress={startAnalysis}
            >
              <Ionicons name="flash" size={20} color={COLORS.black} />
              <Text style={styles.ctaButtonText}>Analyze This Swing</Text>
            </Pressable>

            <Pressable onPress={clearVideo} style={styles.changeButton}>
              <Text style={styles.changeButtonText}>Choose Different Video</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionCards}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                styles.actionCardPrimary,
                pressed && styles.actionCardPressed,
              ]}
              onPress={pickVideo}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="cloud-upload-outline" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>Upload from Library</Text>
                <Text style={styles.cardDesc}>Select a swing video from your camera roll</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={recordVideo}
            >
              <View style={[styles.cardIcon, styles.cardIconTeal]}>
                <Ionicons name="camera-outline" size={24} color="#14B8A6" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>Record Now</Text>
                <Text style={styles.cardDesc}>Film your swing with front or back camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </Pressable>
          </View>
        )}

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for best results</Text>
          {TIPS.map((tip, i) => (
            <View key={i} style={styles.tipItem}>
              <View style={styles.tipDot}>
                <Text style={styles.tipDotText}>✓</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomTabBar activeTab="analyze" onTabPress={navigateMainTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 28,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accentGlow,
  },
  greeting: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  headline: {
    fontFamily: FONTS.heading,
    fontSize: 52,
    color: COLORS.text,
    lineHeight: 52 * 0.95,
    marginBottom: 10,
    letterSpacing: 1,
  },
  headlineAccent: {
    color: COLORS.accent,
  },
  subtext: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 20,
    maxWidth: 260,
  },
  actionCards: {
    paddingTop: 28,
    paddingHorizontal: 28,
    gap: 12,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionCardPrimary: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  actionCardPressed: {
    backgroundColor: COLORS.surfaceHover,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconTeal: {
    backgroundColor: 'rgba(20,184,166,0.1)',
    borderColor: 'rgba(20,184,166,0.2)',
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  previewSection: {
    paddingTop: 28,
    paddingHorizontal: 28,
    gap: 12,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
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
  changeButton: {
    alignItems: 'center',
    padding: 12,
  },
  changeButtonText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  tipsSection: {
    marginHorizontal: 28,
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipDotText: {
    fontSize: 10,
    color: COLORS.white,
    fontFamily: FONTS.bodySemiBold,
  },
  tipText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textDim,
    lineHeight: 18,
    flex: 1,
  },
});
