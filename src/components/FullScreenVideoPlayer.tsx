import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  camera,
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { KeypointData, PrimaryMechanicalIssue } from '../types';

interface FullScreenVideoPlayerProps {
  visible: boolean;
  onClose: () => void;
  videoUrl: string;
  keypoints?: KeypointData | null;
  primaryIssue?: PrimaryMechanicalIssue | null;
  initialTime?: number;
}

interface ThumbnailData {
  time: number;
  uri: string;
}

export default function FullScreenVideoPlayer({
  visible,
  onClose,
  videoUrl,
  keypoints,
  primaryIssue,
  initialTime = 0,
}: FullScreenVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Generate thumbnails when modal opens
  useEffect(() => {
    if (visible && duration > 0 && !loadingThumbnails && thumbnails.length === 0) {
      generateThumbnails();
    }
  }, [visible, duration, loadingThumbnails, thumbnails.length]);

  const generateThumbnails = async () => {
    setLoadingThumbnails(true);
    const thumbCount = 10;
    const interval = duration / thumbCount;
    const newThumbnails: ThumbnailData[] = [];

    try {
      for (let i = 0; i < thumbCount; i++) {
        const time = i * interval;
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
          time: Math.round(time),
        });
        newThumbnails.push({ time, uri });
      }
      setThumbnails(newThumbnails);
    } catch (error) {
      console.error('[FullScreenVideoPlayer] Error generating thumbnails:', error);
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const newIsPlaying = status.isPlaying;
      const newCurrentTime = status.positionMillis || 0;
      const newDuration = status.durationMillis || 0;

      if (status.didJustFinish) {
        videoRef.current?.setPositionAsync(0);
        setIsPlaying(false);
        return;
      }

      setIsPlaying(prev => prev !== newIsPlaying ? newIsPlaying : prev);
      setCurrentTime(prev => Math.abs(prev - newCurrentTime) > 100 ? newCurrentTime : prev);

      if (newDuration > 0 && duration === 0) {
        setDuration(newDuration);
      }
    }
  }, [duration]);

  const onReadyForDisplay = useCallback((readyStatus: { naturalSize: { width: number; height: number } }) => {
    const { naturalSize } = readyStatus;
    setNaturalSize(naturalSize);

    // Calculate video dimensions to fill full screen area
    const availableHeight = screenHeight - spacing.sectionGap * 8; // Header + scrubber + safe areas

    const aspectRatio = naturalSize.width / naturalSize.height;
    let displayWidth = screenWidth;
    let displayHeight = screenWidth / aspectRatio;

    // If height exceeds available area, scale down to fit
    if (displayHeight > availableHeight) {
      displayHeight = availableHeight;
      displayWidth = displayHeight * aspectRatio;
    }

    setVideoDimensions({ width: displayWidth, height: displayHeight });
  }, [screenWidth, screenHeight]);

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch (error) {
      console.error('[FullScreenVideoPlayer] Playback error:', error);
    }
  };


  const seekToTime = async (time: number) => {
    try {
      await videoRef.current?.setPositionAsync(time);
    } catch (error) {
      console.error('[FullScreenVideoPlayer] Seek error:', error);
    }
  };

  const handleScrubberPress = (position: number) => {
    const time = (position / screenWidth) * duration;
    seekToTime(time);
  };


  const isPortraitVideo = naturalSize.height > naturalSize.width && naturalSize.width > 0;
  const innerVideoWidth = isPortraitVideo
    ? videoDimensions.height * (naturalSize.width / naturalSize.height)
    : videoDimensions.width;
  const innerVideoHeight = videoDimensions.height;

  const currentFrameNumber = keypoints?.frames ?
    Math.floor((currentTime / 1000) * (keypoints.fps || 30)) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header with controls */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Main content area - full screen video */}
        <View style={styles.contentArea}>
          <View style={styles.videoPanel}>
            <View style={[
              styles.videoContainer,
              videoDimensions.width > 0 && {
                width: videoDimensions.width,
                height: videoDimensions.height,
              }
            ]}>
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
                  shouldPlay={true}
                  rate={1.0}
                  positionMillis={initialTime}
                  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                  onReadyForDisplay={onReadyForDisplay}
                />
              </View>

              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <Pressable style={styles.playOverlay} onPress={togglePlayback}>
                  <View style={styles.playButton}>
                    <Ionicons
                      name="play"
                      size={32}
                      color={colors.text.primary}
                    />
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Frame scrubber */}
        <View style={styles.scrubberContainer}>
          {/* Progress bar */}
          <Pressable
            style={styles.progressBar}
            onPress={(event) => {
              const { locationX } = event.nativeEvent;
              handleScrubberPress(locationX);
            }}
          >
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }
                ]}
              />
            </View>
          </Pressable>

          {/* Frame info */}
          <View style={styles.frameInfo}>
            <Text style={styles.frameText}>
              Frame {currentFrameNumber}
            </Text>
            <Text style={styles.timeText}>
              {Math.floor(currentTime / 1000)}s / {Math.floor(duration / 1000)}s
            </Text>
          </View>

          {/* Thumbnail strip */}
          {thumbnails.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailStrip}
              contentContainerStyle={styles.thumbnailContent}
            >
              {thumbnails.map((thumb, index) => (
                <Pressable
                  key={index}
                  style={styles.thumbnail}
                  onPress={() => seekToTime(thumb.time)}
                >
                  <Text style={styles.thumbnailTime}>
                    {Math.floor(thumb.time / 1000)}s
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.splashBase,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.cardGap,
    zIndex: 10,
  },
  closeButton: {
    padding: spacing.iconGap,
  },
  contentArea: {
    flex: 1,
  },
  videoPanel: {
    flex: 1, // Take full available space
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
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
    backgroundColor: camera.headerOverlay,
  },
  playButton: {
    backgroundColor: colors.border.dim,
    borderRadius: radius.circle,
    width: spacing.sectionGap * 4,
    height: spacing.sectionGap * 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrubberContainer: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sectionGap,
    gap: spacing.cardGap,
  },
  progressBar: {
    height: spacing.sectionGap * 2,
    justifyContent: 'center',
  },
  progressTrack: {
    height: spacing.deltaPillInnerGap,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.emerald,
    borderRadius: radius.xs,
  },
  frameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frameText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  timeText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
  },
  thumbnailStrip: {
    maxHeight: spacing.sectionGap * 3,
  },
  thumbnailContent: {
    gap: spacing.iconGap,
    paddingHorizontal: spacing.iconGap,
  },
  thumbnail: {
    width: spacing.sectionGap * 2,
    height: spacing.sectionGap * 3,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xs,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.iconGap / 2,
  },
  thumbnailTime: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    color: colors.text.secondary,
  },
});