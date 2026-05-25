import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import {
  SKELETON_CONNECTIONS,
  MECHANIC_JOINTS,
  MECHANIC_DISPLAY_NAMES,
  mapKeypointToPixel,
  getFrameForTime,
  isValidFrame,
  getVideoRect,
} from '../utils/skeletonUtils';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
  typography,
} from '../../design-system/tokens';

interface SkeletonOverlayProps {
  frames: Array<{
    frame_number: number;
    timestamp_ms: number;
    keypoints: Record<string, { x: number; y: number; confidence: number }>;
  }>;
  primaryIssue?: string | null;
  containerWidth: number;
  containerHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  currentTime: number; // in milliseconds
  fps: number;
}

// Functional skeleton colors (not design tokens per CLAUDE.md)
const SKELETON_COLORS = {
  neutral: '#444',
  connection: '#555',
  red: '#E24B4A',
  amber: '#F5A623',
};

export default function SkeletonOverlay({
  frames,
  primaryIssue,
  containerWidth,
  containerHeight,
  naturalWidth,
  naturalHeight,
  currentTime,
  fps,
}: SkeletonOverlayProps) {
  // Memoize joint highlighting sets
  const { redJoints, amberJoints } = useMemo(() => {
    const mechanicJoints = primaryIssue ? MECHANIC_JOINTS[primaryIssue] : null;
    return {
      redJoints: new Set(mechanicJoints?.red || []),
      amberJoints: new Set(mechanicJoints?.amber || []),
    };
  }, [primaryIssue]);

  // Memoize video rect and current frame with pixel coordinates
  const { currentFrame, pixelKeypoints, videoRect } = useMemo(() => {
    const frame = getFrameForTime(frames, currentTime, fps);

    if (!isValidFrame(frame)) {
      return { currentFrame: null, pixelKeypoints: {}, videoRect: null };
    }

    const videoRect = getVideoRect(containerWidth, containerHeight, naturalWidth, naturalHeight);

    const pixels: Record<string, { x: number; y: number; confidence: number }> = {};
    if (frame?.keypoints) {
      for (const [jointName, keypoint] of Object.entries(frame.keypoints)) {
        if (keypoint.confidence > 0.3) {
          const pixel = mapKeypointToPixel(keypoint, videoRect);
          pixels[jointName] = {
            ...pixel,
            confidence: keypoint.confidence,
          };
        }
      }
    }

    return { currentFrame: frame, pixelKeypoints: pixels, videoRect };
  }, [frames, currentTime, fps, containerWidth, containerHeight, naturalWidth, naturalHeight]);

  // Don't render if frame is invalid
  if (!currentFrame) {
    return null;
  }

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]} pointerEvents="none">
      {/* SVG skeleton */}
      <Svg width={containerWidth} height={containerHeight} viewBox={`0 0 ${containerWidth} ${containerHeight}`} style={StyleSheet.absoluteFill}>
        {/* Draw connections */}
        {SKELETON_CONNECTIONS.map(([joint1, joint2], index) => {
          const kp1 = pixelKeypoints[joint1];
          const kp2 = pixelKeypoints[joint2];

          if (!kp1 || !kp2) return null;

          // Determine connection color based on joint highlighting
          let strokeColor = SKELETON_COLORS.connection;
          if (redJoints.has(joint1) || redJoints.has(joint2)) {
            strokeColor = SKELETON_COLORS.red;
          } else if (amberJoints.has(joint1) || amberJoints.has(joint2)) {
            strokeColor = SKELETON_COLORS.amber;
          }

          return (
            <Line
              key={`connection-${index}`}
              x1={kp1.x}
              y1={kp1.y}
              x2={kp2.x}
              y2={kp2.y}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Draw joints */}
        {Object.entries(pixelKeypoints).map(([jointName, keypoint]) => {
          let fillColor = SKELETON_COLORS.neutral;
          if (redJoints.has(jointName)) {
            fillColor = SKELETON_COLORS.red;
          } else if (amberJoints.has(jointName)) {
            fillColor = SKELETON_COLORS.amber;
          }

          return (
            <Circle
              key={`joint-${jointName}`}
              cx={keypoint.x}
              cy={keypoint.y}
              r="4"
              fill={fillColor}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          );
        })}
      </Svg>

      {/* Issue label pill */}
      {primaryIssue && MECHANIC_DISPLAY_NAMES[primaryIssue] && (
        <View style={styles.labelPill}>
          <Text style={styles.labelText}>
            {MECHANIC_DISPLAY_NAMES[primaryIssue]}
          </Text>
        </View>
      )}

      {/* Frame counter */}
      {currentFrame && (
        <View style={styles.frameCounter}>
          <Text style={styles.frameText}>
            Frame {currentFrame.frame_number}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  labelPill: {
    position: 'absolute',
    top: spacing.cardSm,
    left: spacing.cardSm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: radius.pill,
    paddingVertical: spacing.iconGap / 2,
    paddingHorizontal: spacing.cardSm,
  },
  labelText: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  frameCounter: {
    position: 'absolute',
    bottom: spacing.cardSm,
    right: spacing.cardSm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: radius.badge,
    paddingVertical: spacing.iconGap / 2,
    paddingHorizontal: spacing.iconGap,
  },
  frameText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
    color: colors.text.muted,
  },
});