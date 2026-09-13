import React, { useState, useCallback, useEffect } from 'react';
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
import { VideoView, useVideoPlayer } from 'expo-video';
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
  // currentTime/duration are tracked internally in milliseconds throughout this component
  // (frame math, time display, progress %); player.currentTime/duration are in seconds, so
  // conversions happen only at the boundary where we read from or write to the player.
  const player = useVideoPlayer(videoUrl, (player) => {
    player.timeUpdateEventInterval = 0.1;
    player.currentTime = initialTime / 1000;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Only play while the fullscreen modal is visible. The component remains mounted while
  // hidden, so starting playback in useVideoPlayer causes audible off-screen autoplay.
  useEffect(() => {
    try {
      if (visible) {
        player.currentTime = initialTime / 1000;
        setCurrentTime(initialTime);
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      console.error('[FullScreenVideoPlayer] visibility playback error:', error);
    }
  }, [visible, player, initialTime]);

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

  useEffect(() => {
    const playingChangeSub = player.addListener('playingChange', (payload) => {
      setIsPlaying(prev => prev !== payload.isPlaying ? payload.isPlaying : prev);
    });

    const timeUpdateSub = player.addListener('timeUpdate', (payload) => {
      const newCurrentTime = payload.currentTime * 1000;
      setCurrentTime(prev => Math.abs(prev - newCurrentTime) > 100 ? newCurrentTime : prev);
    });

    const playToEndSub = player.addListener('playToEnd', () => {
      player.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    });

    const sourceLoadSub = player.addListener('sourceLoad', () => {
      setDuration(prev => (prev === 0 && player.duration > 0) ? player.duration * 1000 : prev);
    });

    return () => {
      playingChangeSub.remove();
      timeUpdateSub.remove();
      playToEndSub.remove();
      sourceLoadSub.remove();
    };
  }, [player]);

  const togglePlayback = () => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('[FullScreenVideoPlayer] Playback error:', error);
    }
  };

  const seekToTime = (time: number) => {
    try {
      player.currentTime = time / 1000;
    } catch (error) {
      console.error('[FullScreenVideoPlayer] Seek error:', error);
    }
  };

  const handleScrubberPress = (position: number) => {
    const time = (position / screenWidth) * duration;
    seekToTime(time);
  };

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
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />

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
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.bg.splashBase,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
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