import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

interface InAppVideoReviewProps {
  videoUri: string;
  onRetake: () => void;
  onUseVideo: () => void;
  frontFacing?: boolean;
}

export default function InAppVideoReview({
  videoUri,
  onRetake,
  onUseVideo,
  frontFacing = false,
}: InAppVideoReviewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Video Preview */}
      <View style={styles.videoContainer}>
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping
          volume={0}
        />

        {frontFacing && (
          <View style={styles.frontCameraNote}>
            <Text style={styles.frontCameraNoteText}>
              Front camera view is mirrored
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.card }]}>
        <Pressable
          style={[styles.button, styles.retakeButton]}
          onPress={onRetake}
        >
          <Ionicons name="refresh" size={20} color={colors.text.primary} />
          <Text style={styles.retakeButtonText}>Retake</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.useButton]}
          onPress={onUseVideo}
        >
          <Ionicons name="checkmark" size={20} color={colors.text.onGold} />
          <Text style={styles.useButtonText}>Use this video</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  frontCameraNote: {
    position: 'absolute',
    top: 60,
    left: spacing.screen,
    right: spacing.screen,
    alignItems: 'center',
  },
  frontCameraNoteText: {
    fontSize: fontSizes.caption,
    fontFamily: typography.body,
    color: colors.text.primary,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.cardSm,
    paddingVertical: spacing.iconGap,
    borderRadius: radius.badge,
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.card,
    gap: spacing.cardGap,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconGap,
    paddingVertical: spacing.card,
    borderRadius: radius.card,
  },
  retakeButton: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  retakeButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    letterSpacing: letterSpacing.cta,
  },
  useButton: {
    backgroundColor: colors.bg.gold,
  },
  useButtonText: {
    fontSize: fontSizes.ctaLabel,
    fontFamily: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.text.onGold,
    letterSpacing: letterSpacing.cta,
  },
});