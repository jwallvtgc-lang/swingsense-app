import React, { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import SkeletonOverlay from './SkeletonOverlay';
import FullScreenVideoPlayer from './FullScreenVideoPlayer';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import { getVideoRect } from '../utils/skeletonUtils';
import type { KeypointData } from '../types';

interface SwingVideoPlayerProps {
  videoUrl: string;
  keypoints?: KeypointData | null;
}

export default function SwingVideoPlayer({
  videoUrl,
  keypoints,
}: SwingVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const newIsPlaying = status.isPlaying;
      const newCurrentTime = status.positionMillis || 0;

      // BUG 2 FIX: Handle video finishing to enable replay
      if (status.didJustFinish) {
        videoRef.current?.setPositionAsync(0);
        setIsPlaying(false);
        return;
      }

      // Only update state if values actually changed to prevent unnecessary re-renders
      setIsPlaying(prev => prev !== newIsPlaying ? newIsPlaying : prev);
      setCurrentTime(prev => Math.abs(prev - newCurrentTime) > 100 ? newCurrentTime : prev); // 100ms threshold
    }
  }, []);

  const onReadyForDisplay = useCallback((readyStatus: { naturalSize: { width: number; height: number } }) => {
    const { naturalSize } = readyStatus;

    // Store natural size for skeleton overlay
    setNaturalSize(naturalSize);

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
    console.log('[SwingVideoPlayer] naturalSize:', naturalSize.width, naturalSize.height);
    console.log('[SwingVideoPlayer] videoDimensions:', displayWidth.toFixed(1), displayHeight.toFixed(1));
    const rect = getVideoRect(
      displayWidth,
      displayHeight,
      naturalSize.width,
      naturalSize.height
    );
    console.log(
      '[SwingVideoPlayer] videoRect:',
      rect.x.toFixed(1),
      rect.y.toFixed(1),
      rect.width.toFixed(1),
      rect.height.toFixed(1)
    );
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

  const toggleSkeleton = useCallback(() => {
    setShowSkeleton(prev => !prev);
  }, []);

  const openFullScreen = useCallback(async () => {
    // Pause the inline video when opening full screen
    try {
      await videoRef.current?.pauseAsync();
    } catch (error) {
      // Ignore pause errors
    }
    setFullScreenVisible(true);
  }, []);

  const closeFullScreen = useCallback(() => {
    setFullScreenVisible(false);
  }, []);

  const hasKeypoints = keypoints?.frames && keypoints.frames.length > 0;

  const isPortraitVideo =
    naturalSize.height > naturalSize.width && naturalSize.width > 0;
  const innerVideoWidth = isPortraitVideo
    ? videoDimensions.height * (naturalSize.width / naturalSize.height)
    : videoDimensions.width;
  const innerVideoHeight = videoDimensions.height;

  return (
    <View style={styles.container}>
      {/* Video Player Container */}
      <Pressable
        style={[
          styles.videoContainer,
          videoDimensions.width > 0 && {
            width: videoDimensions.width,
            height: videoDimensions.height,
          }
        ]}
        onPress={openFullScreen}
      >
        <View
          style={[
            styles.videoInner,
            videoDimensions.width > 0 && {
              width: innerVideoWidth,
              height: innerVideoHeight,
            },
            isPortraitVideo && styles.videoInnerPortrait,
          ]}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            isLooping={false}
            shouldPlay={false}
            rate={1.0}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            onReadyForDisplay={onReadyForDisplay}
          />

          {showSkeleton &&
            hasKeypoints &&
            videoDimensions.width > 0 &&
            naturalSize.width > 0 && (
              <SkeletonOverlay
                frames={keypoints.frames}
                containerWidth={innerVideoWidth}
                containerHeight={innerVideoHeight}
                currentTime={currentTime}
                fps={keypoints.fps}
              />
            )}
        </View>

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
      </Pressable>

      {/* Controls */}
      <View style={styles.controls}>
        {hasKeypoints && (
          <Pressable style={styles.skeletonButton} onPress={toggleSkeleton}>
            <Ionicons
              name="body-outline"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.skeletonButtonText}>
              {showSkeleton ? 'Hide skeleton' : 'Show skeleton'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Full Screen Video Modal */}
      <FullScreenVideoPlayer
        visible={fullScreenVisible}
        onClose={closeFullScreen}
        videoUrl={videoUrl}
        keypoints={keypoints}
        initialTime={currentTime}
        initialShowSkeleton={showSkeleton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.cardGap,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.bg.surface,
    aspectRatio: 16 / 9,
    maxHeight: 200,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInner: {
    position: 'relative',
    overflow: 'hidden',
  },
  videoInnerPortrait: {
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
  skeletonButtonText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
});