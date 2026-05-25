import React, { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import SkeletonOverlay from './SkeletonOverlay';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { KeypointData } from '../types';

interface SwingVideoPlayerProps {
  videoUrl: string;
  keypoints?: KeypointData | null;
  primaryIssue?: string | null;
}

export default function SwingVideoPlayer({
  videoUrl,
  keypoints,
  primaryIssue,
}: SwingVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const newIsPlaying = status.isPlaying;
      const newCurrentTime = status.positionMillis || 0;

      // Only update state if values actually changed to prevent unnecessary re-renders
      setIsPlaying(prev => prev !== newIsPlaying ? newIsPlaying : prev);
      setCurrentTime(prev => Math.abs(prev - newCurrentTime) > 100 ? newCurrentTime : prev); // 100ms threshold
    }
  }, []);

  const onReadyForDisplay = useCallback((readyStatus: { naturalSize: { width: number; height: number } }) => {
    const { naturalSize } = readyStatus;

    // Calculate display dimensions maintaining aspect ratio
    const screenWidth = Dimensions.get('window').width - spacing.screen * 2;
    const maxHeight = 200;

    let displayWidth = screenWidth;
    let displayHeight = (naturalSize.height / naturalSize.width) * screenWidth;

    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = (naturalSize.width / naturalSize.height) * maxHeight;
    }

    setVideoDimensions({ width: displayWidth, height: displayHeight });
  }, []);

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch (error) {
      // Ignore play/pause errors
    }
  };

  const toggleSkeleton = () => {
    setShowSkeleton(!showSkeleton);
  };

  const hasKeypoints = keypoints?.frames && keypoints.frames.length > 0;

  return (
    <View style={styles.container}>
      {/* Video Player Container */}
      <View style={[
        styles.videoContainer,
        videoDimensions.width > 0 && {
          width: videoDimensions.width,
          height: videoDimensions.height,
        }
      ]}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          isLooping={false}
          shouldPlay={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onReadyForDisplay={onReadyForDisplay}
        />

        {/* Skeleton Overlay */}
        {showSkeleton && hasKeypoints && videoDimensions.width > 0 && (
          <SkeletonOverlay
            frames={keypoints.frames}
            primaryIssue={primaryIssue}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
            currentTime={currentTime}
            fps={keypoints.fps}
          />
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <Pressable style={styles.playOverlay} onPress={togglePlayback}>
            <View style={styles.playButton}>
              <Ionicons
                name="play"
                size={24}
                color={colors.text.primary}
              />
            </View>
          </Pressable>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Skeleton Toggle Button */}
        {hasKeypoints && (
          <Pressable
            style={[
              styles.skeletonButton,
              showSkeleton && styles.skeletonButtonActive,
            ]}
            onPress={toggleSkeleton}
          >
            <Ionicons
              name="body-outline"
              size={16}
              color={showSkeleton ? colors.text.onGold : colors.text.secondary}
            />
            <Text
              style={[
                styles.skeletonButtonText,
                showSkeleton && styles.skeletonButtonTextActive,
              ]}
            >
              Show skeleton
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.cardGap,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.bg.surface,
    aspectRatio: 16 / 9,
    maxHeight: 200,
    alignSelf: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.circle,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.iconGap,
  },
  skeletonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap / 2,
    paddingVertical: spacing.iconGap,
    paddingHorizontal: spacing.cardSm,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  skeletonButtonActive: {
    backgroundColor: colors.bg.gold,
    borderColor: colors.bg.gold,
  },
  skeletonButtonText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  skeletonButtonTextActive: {
    color: colors.text.onGold,
  },
});