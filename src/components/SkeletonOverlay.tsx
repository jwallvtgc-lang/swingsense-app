import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import {
  SKELETON_CONNECTIONS,
  MOVENET_LANDMARKS,
  getFrameForTime,
  isValidFrame,
} from '../utils/skeletonUtils';

interface SkeletonOverlayProps {
  frames: Array<{
    frame_number: number;
    timestamp_ms: number;
    keypoints: Record<string, { x: number; y: number; confidence: number }>;
  }>;
  containerWidth: number;
  containerHeight: number;
  currentTime: number; // in milliseconds
  fps: number;
}

// All skeleton elements are white
const SKELETON_WHITE = '#FFFFFF';

export default function SkeletonOverlay({
  frames,
  containerWidth,
  containerHeight,
  currentTime,
  fps,
}: SkeletonOverlayProps) {
  // Facial keypoints to exclude from dots and lines
  const facialKeypoints = [
    MOVENET_LANDMARKS.NOSE,
    MOVENET_LANDMARKS.LEFT_EYE,
    MOVENET_LANDMARKS.RIGHT_EYE,
    MOVENET_LANDMARKS.LEFT_EAR,
    MOVENET_LANDMARKS.RIGHT_EAR,
  ] as const;

  // Memoize current frame with pixel coordinates
  const { currentFrame, pixelKeypoints } = useMemo(() => {
    const frame = getFrameForTime(frames, currentTime, fps);

    if (!isValidFrame(frame)) {
      return { currentFrame: null, pixelKeypoints: {} };
    }

    const pixels: Record<string, { x: number; y: number; confidence: number }> = {};

    if (frame?.keypoints) {
      for (const [jointName, keypoint] of Object.entries(frame.keypoints)) {
        if (keypoint.confidence > 0.15) {
          // Include nose as regular joint, exclude other facial keypoints
          if (jointName === MOVENET_LANDMARKS.NOSE ||
              (jointName !== MOVENET_LANDMARKS.LEFT_EYE &&
               jointName !== MOVENET_LANDMARKS.RIGHT_EYE &&
               jointName !== MOVENET_LANDMARKS.LEFT_EAR &&
               jointName !== MOVENET_LANDMARKS.RIGHT_EAR)) {
            pixels[jointName] = {
              x: keypoint.y * containerWidth,
              y: (1 - keypoint.x) * containerHeight,
              confidence: keypoint.confidence,
            };
          }
        }
      }
    }

    return { currentFrame: frame, pixelKeypoints: pixels };
  }, [frames, currentTime, fps, containerWidth, containerHeight]);

  // Don't render if frame is invalid
  if (!currentFrame) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { width: containerWidth, height: containerHeight },
      ]}
      pointerEvents="none"
    >
      {/* SVG skeleton */}
      <Svg width={containerWidth} height={containerHeight} viewBox={`0 0 ${containerWidth} ${containerHeight}`} style={StyleSheet.absoluteFill}>
        {/* Draw connections (excluding facial connections) */}
        {SKELETON_CONNECTIONS.filter(([joint1, joint2]) => {
          const isFacial1 = joint1 === MOVENET_LANDMARKS.NOSE ||
                            joint1 === MOVENET_LANDMARKS.LEFT_EYE ||
                            joint1 === MOVENET_LANDMARKS.RIGHT_EYE ||
                            joint1 === MOVENET_LANDMARKS.LEFT_EAR ||
                            joint1 === MOVENET_LANDMARKS.RIGHT_EAR;
          const isFacial2 = joint2 === MOVENET_LANDMARKS.NOSE ||
                            joint2 === MOVENET_LANDMARKS.LEFT_EYE ||
                            joint2 === MOVENET_LANDMARKS.RIGHT_EYE ||
                            joint2 === MOVENET_LANDMARKS.LEFT_EAR ||
                            joint2 === MOVENET_LANDMARKS.RIGHT_EAR;
          return !isFacial1 && !isFacial2;
        }).map(([joint1, joint2], index) => {
          const kp1 = pixelKeypoints[joint1];
          const kp2 = pixelKeypoints[joint2];

          if (!kp1 || !kp2) return null;

          return (
            <Line
              key={`connection-${index}`}
              x1={kp1.x}
              y1={kp1.y}
              x2={kp2.x}
              y2={kp2.y}
              stroke={SKELETON_WHITE}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Draw joints (including nose as regular joint) */}
        {Object.entries(pixelKeypoints).map(([jointName, keypoint]) => {
          return (
            <Circle
              key={`joint-${jointName}`}
              cx={keypoint.x}
              cy={keypoint.y}
              r="4"
              fill={SKELETON_WHITE}
              strokeWidth="0"
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});