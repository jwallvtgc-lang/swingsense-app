import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import FullScreenVideoPlayer from './FullScreenVideoPlayer';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { KeypointData, PrimaryMechanicalIssue } from '../types';

interface SwingVideoPlayerProps {
  videoUrl: string;
  keypoints?: KeypointData | null;
  primaryIssue?: PrimaryMechanicalIssue | null;
}

export default function SwingVideoPlayer({
  videoUrl,
  keypoints,
  primaryIssue,
}: SwingVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

  // Generate thumbnail for static display
  useEffect(() => {
    const generateThumbnail = async () => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
          time: 0, // First frame
        });
        setThumbnailUri(uri);
      } catch (error) {
        console.error('[SwingVideoPlayer] Error generating thumbnail:', error);
      }
    };

    generateThumbnail();
  }, [videoUrl]);


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
  }, []);


  const openFullScreen = useCallback(() => {
    setFullScreenVisible(true);
  }, []);

  const closeFullScreen = useCallback(() => {
    setFullScreenVisible(false);
  }, []);


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
          {/* Hidden video for dimensions only */}
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.hiddenVideo}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            isLooping={false}
            shouldPlay={false}
            rate={1.0}
            onReadyForDisplay={onReadyForDisplay}
          />

          {/* Static thumbnail display */}
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.video}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.video} />
          )}
        </View>

        {/* Play Overlay - Always visible for thumbnail */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons
              name="play"
              size={24}
              color={colors.text.primary}
            />
          </View>
        </View>
      </Pressable>


      {/* Full Screen Video Modal */}
      <FullScreenVideoPlayer
        visible={fullScreenVisible}
        onClose={closeFullScreen}
        videoUrl={videoUrl}
        keypoints={keypoints}
        primaryIssue={primaryIssue}
        initialTime={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  hiddenVideo: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
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
});