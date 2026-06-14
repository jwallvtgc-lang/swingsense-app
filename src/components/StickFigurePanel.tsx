import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle } from 'react-native-svg';
import {
  MOVENET_LANDMARKS,
  getFrameForTime,
  isValidFrame,
} from '../utils/skeletonUtils';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { KeypointData } from '../types';

interface StickFigurePanelProps {
  visible: boolean;
  keypoints?: KeypointData | null;
  currentTime: number; // in milliseconds
  panelWidth: number;
  panelHeight: number;
}

// Stick figure connection map - defines which joints connect to form the skeleton
const STICK_FIGURE_CONNECTIONS: Array<[string, string]> = [
  // Head to shoulders
  [MOVENET_LANDMARKS.NOSE, MOVENET_LANDMARKS.LEFT_SHOULDER],
  [MOVENET_LANDMARKS.NOSE, MOVENET_LANDMARKS.RIGHT_SHOULDER],

  // Shoulder bar
  [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.RIGHT_SHOULDER],

  // Left arm
  [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.LEFT_ELBOW],
  [MOVENET_LANDMARKS.LEFT_ELBOW, MOVENET_LANDMARKS.LEFT_WRIST],

  // Right arm
  [MOVENET_LANDMARKS.RIGHT_SHOULDER, MOVENET_LANDMARKS.RIGHT_ELBOW],
  [MOVENET_LANDMARKS.RIGHT_ELBOW, MOVENET_LANDMARKS.RIGHT_WRIST],

  // Torso
  [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.LEFT_HIP],
  [MOVENET_LANDMARKS.RIGHT_SHOULDER, MOVENET_LANDMARKS.RIGHT_HIP],

  // Hip bar
  [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.RIGHT_HIP],

  // Left leg
  [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.LEFT_KNEE],
  [MOVENET_LANDMARKS.LEFT_KNEE, MOVENET_LANDMARKS.LEFT_ANKLE],

  // Right leg
  [MOVENET_LANDMARKS.RIGHT_HIP, MOVENET_LANDMARKS.RIGHT_KNEE],
  [MOVENET_LANDMARKS.RIGHT_KNEE, MOVENET_LANDMARKS.RIGHT_ANKLE],
];

// Stick figure styling
const STICK_FIGURE_WHITE = 'rgba(255,255,255,0.9)';
const JOINT_RADIUS = 6;
const BONE_STROKE_WIDTH = 2.5;

export default function StickFigurePanel({
  visible,
  keypoints,
  currentTime,
  panelWidth,
  panelHeight,
}: StickFigurePanelProps) {
  // Convert keypoints to pixel coordinates for stick figure
  const { currentFrame, pixelKeypoints, frameNumber, totalFrames } = useMemo(() => {
    if (!keypoints?.frames || !visible) {
      return { currentFrame: null, pixelKeypoints: {}, frameNumber: 0, totalFrames: 0 };
    }

    const frame = getFrameForTime(keypoints.frames, currentTime, keypoints.fps);

    if (!isValidFrame(frame)) {
      return { currentFrame: null, pixelKeypoints: {}, frameNumber: 0, totalFrames: keypoints.frames.length };
    }

    const pixels: Record<string, { x: number; y: number; confidence: number }> = {};

    // Calculate stick figure dimensions - use 85% of panel height
    const figureHeight = panelHeight * 0.85;
    const figureWidth = panelWidth;

    // Calculate figure bounds for centering
    const validKeypoints = frame?.keypoints ?
      Object.values(frame.keypoints).filter(kp => kp.confidence > 0.15) : [];

    let bounds = { minX: 1, maxX: 0, minY: 1, maxY: 0 };
    if (validKeypoints.length > 0) {
      bounds = validKeypoints.reduce((acc, kp) => ({
        minX: Math.min(acc.minX, kp.y),
        maxX: Math.max(acc.maxX, kp.y),
        minY: Math.min(acc.minY, kp.x),
        maxY: Math.max(acc.maxY, kp.x),
      }), bounds);
    }

    // Center the figure based on bounds
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const offsetX = figureWidth / 2 - ((1 - centerX) * figureWidth);
    const offsetY = (panelHeight - figureHeight) / 2 + figureHeight / 2 - (centerY * figureHeight);

    if (frame?.keypoints) {
      for (const [jointName, keypoint] of Object.entries(frame.keypoints)) {
        if (keypoint.confidence > 0.15) {
          // Use the corrected coordinate mapping from SkeletonOverlay
          pixels[jointName] = {
            x: offsetX + ((1 - keypoint.y) * figureWidth),
            y: offsetY + (keypoint.x * figureHeight),
            confidence: keypoint.confidence,
          };
        }
      }
    }

    return {
      currentFrame: frame,
      pixelKeypoints: pixels,
      frameNumber: Math.floor((currentTime / 1000) * (keypoints.fps || 30)),
      totalFrames: keypoints.frames.length
    };
  }, [keypoints, currentTime, visible, panelWidth, panelHeight]);

  if (!visible || !currentFrame) {
    return null;
  }

  const groundLineY = panelHeight * 0.78; // Ground line at 78% of panel height

  return (
    <LinearGradient
      colors={[colors.bg.splashTop, colors.bg.splashMid]}
      style={[styles.container, { width: panelWidth, height: panelHeight }]}
    >
      {/* Amber accent line at top */}
      <View style={styles.accentLine} />

      {/* Panel header */}
      <View style={styles.header}>
        <Text style={styles.mechanicsLabel}>MECHANICS</Text>
        {/* TODO: Add primary issue name below when available */}
      </View>

      {/* Stick figure SVG */}
      <View style={styles.figureContainer}>
        {/* Ground line */}
        <View style={[styles.groundLine, { top: groundLineY }]} />

        <Svg
          width={panelWidth}
          height={panelHeight - spacing.sectionGap * 2}
          viewBox={`0 0 ${panelWidth} ${panelHeight - spacing.sectionGap * 2}`}
        >
          {/* Draw connections (bones) */}
          {STICK_FIGURE_CONNECTIONS.map(([joint1, joint2], index) => {
            const kp1 = pixelKeypoints[joint1];
            const kp2 = pixelKeypoints[joint2];

            if (!kp1 || !kp2) return null;

            return (
              <Line
                key={`bone-${index}`}
                x1={kp1.x}
                y1={kp1.y}
                x2={kp2.x}
                y2={kp2.y}
                stroke={STICK_FIGURE_WHITE}
                strokeWidth={BONE_STROKE_WIDTH}
                strokeLinecap="round"
              />
            );
          })}

          {/* Draw joints (dots) */}
          {Object.entries(pixelKeypoints).map(([jointName, keypoint]) => {
            // TODO: Add mechanic-specific color highlighting here
            // When primaryIssue is implemented, joints will turn red/amber based on mechanics

            return (
              <Circle
                key={`joint-${jointName}`}
                cx={keypoint.x}
                cy={keypoint.y}
                r={JOINT_RADIUS}
                fill={STICK_FIGURE_WHITE}
                strokeWidth="0"
              />
            );
          })}
        </Svg>
      </View>

      {/* Panel footer */}
      <View style={styles.footer}>
        <Text style={styles.frameIndicator}>
          Frame {frameNumber} / {totalFrames}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    position: 'relative',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.bg.gold,
    opacity: 0.4,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.cardGap,
    paddingBottom: spacing.iconGap,
  },
  mechanicsLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.medium,
    color: colors.text.gold,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  figureContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  groundLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border.dim,
    opacity: 0.8,
    zIndex: 1,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.iconGap,
    paddingBottom: spacing.cardGap,
    alignItems: 'flex-end',
  },
  frameIndicator: {
    fontFamily: typography.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
  },
});