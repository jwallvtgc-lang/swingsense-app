import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line } from 'react-native-svg';
import {
  MOVENET_LANDMARKS,
  MECHANIC_JOINTS,
  SKELETON_CONNECTIONS,
  titleToMechanicSlug,
} from '../utils/skeletonUtils';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { PrimaryMechanicalIssue, FrameKeypoints } from '../types';

interface MotionTrailPanelProps {
  frames: FrameKeypoints[];
  primaryIssue?: PrimaryMechanicalIssue | null;
  fps: number;
  containerWidth: number;
  containerHeight: number;
  currentTime?: number; // for scrubber interaction highlighting
}

interface JointCentroid {
  x: number;
  y: number;
  confidence: number;
}

const CONFIDENCE_THRESHOLD = 0.1;

// Visual constants
const PANEL_PADDING = 0.15; // 15% padding on each side = 70% fill
const GROUND_LINE_Y_PERCENT = 0.85;

export default function MotionTrailPanel({
  frames,
  primaryIssue,
  fps,
  containerWidth,
  containerHeight,
  currentTime,
}: MotionTrailPanelProps) {

  const { jointCentroids, bounds, mechanicSlug } = useMemo(() => {
    if (!frames || frames.length === 0) {
      return {
        jointCentroids: {},
        bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        mechanicSlug: undefined,
      };
    }

    const slug = titleToMechanicSlug(primaryIssue?.title);

    // Collect all joint positions across all frames
    const jointPositions: Record<string, Array<{ x: number; y: number; confidence: number }>> = {};

    frames.forEach(frame => {
      if (!frame.keypoints) return;

      Object.entries(frame.keypoints).forEach(([jointName, keypoint]) => {
        if (keypoint.confidence > CONFIDENCE_THRESHOLD) {
          if (!jointPositions[jointName]) {
            jointPositions[jointName] = [];
          }
          jointPositions[jointName].push({
            x: keypoint.x,
            y: keypoint.y,
            confidence: keypoint.confidence,
          });
        }
      });
    });

    // Calculate centroids for each joint (average position)
    const centroids: Record<string, JointCentroid> = {};
    Object.entries(jointPositions).forEach(([jointName, positions]) => {
      if (positions.length < 1) return;

      // Calculate centroid (mean position)
      const sumX = positions.reduce((sum, pos) => sum + pos.x, 0);
      const sumY = positions.reduce((sum, pos) => sum + pos.y, 0);
      const meanX = sumX / positions.length;
      const meanY = sumY / positions.length;

      // Average confidence
      const avgConfidence = positions.reduce((sum, pos) => sum + pos.confidence, 0) / positions.length;

      centroids[jointName] = {
        x: meanX,
        y: meanY,
        confidence: avgConfidence,
      };
    });

    // Find bounding box of all centroids for scaling
    const validCentroids = Object.values(centroids);
    let boundingBox = { minX: 1, maxX: 0, minY: 1, maxY: 0 };

    if (validCentroids.length > 0) {
      boundingBox = validCentroids.reduce((acc, centroid) => ({
        minX: Math.min(acc.minX, centroid.y), // Note: x/y swap for coordinate system
        maxX: Math.max(acc.maxX, centroid.y),
        minY: Math.min(acc.minY, centroid.x),
        maxY: Math.max(acc.maxY, centroid.x),
      }), boundingBox);
    }

    return {
      jointCentroids: centroids,
      bounds: boundingBox,
      mechanicSlug: slug,
    };
  }, [frames, primaryIssue]);

  if (!frames || frames.length === 0) {
    return null;
  }

  // Scale centroids to panel dimensions (70% fill, centered)
  const usableWidth = containerWidth * (1 - PANEL_PADDING * 2);
  const usableHeight = containerHeight * (1 - PANEL_PADDING * 2);
  const offsetX = containerWidth * PANEL_PADDING;
  const offsetY = containerHeight * PANEL_PADDING;

  const scaleX = bounds.maxX > bounds.minX ? usableWidth / (bounds.maxX - bounds.minX) : 1;
  const scaleY = bounds.maxY > bounds.minY ? usableHeight / (bounds.maxY - bounds.minY) : 1;

  // Convert normalized coordinates to panel pixel coordinates
  const mapToPanel = (normX: number, normY: number) => ({
    x: offsetX + ((1 - normY - bounds.minX) * scaleX), // Note: coordinate system swap and flip
    y: offsetY + ((normX - bounds.minY) * scaleY),
  });

  // Get joint colors and sizes based on primary issue
  const getJointStyle = (jointName: string) => {
    if (!mechanicSlug || !MECHANIC_JOINTS[mechanicSlug]) {
      return { color: colors.text.primary, opacity: 0.6, radius: 5 }; // Default white
    }

    const { red, amber } = MECHANIC_JOINTS[mechanicSlug];

    if (red.includes(jointName)) {
      return { color: '#E24B4A', opacity: 1.0, radius: 8 }; // Red problem joints
    } else if (amber.includes(jointName)) {
      return { color: '#F5A623', opacity: 1.0, radius: 6 }; // Amber connected joints
    } else {
      return { color: colors.text.primary, opacity: 0.6, radius: 5 }; // White for others
    }
  };

  // Ground line position
  const groundLineY = containerHeight * GROUND_LINE_Y_PERCENT;

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {/* Dark background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0d12' }]} />

      {/* Panel header */}
      <View style={styles.header}>
        <Text style={styles.motionLabel}>MOTION TRAIL</Text>
        {primaryIssue && (
          <Text style={styles.mechanicName}>{primaryIssue.title}</Text>
        )}
      </View>

      {/* Main visualization */}
      <View style={styles.visualContainer}>
        <Svg
          width={containerWidth}
          height={containerHeight}
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
        >
          {/* Ground line */}
          <Line
            x1={0}
            y1={groundLineY}
            x2={containerWidth}
            y2={groundLineY}
            stroke={colors.text.primary}
            strokeWidth={1}
            opacity={0.2}
          />

          {/* Skeleton connection lines */}
          {SKELETON_CONNECTIONS.map(([joint1, joint2], index) => {
            const centroid1 = jointCentroids[joint1];
            const centroid2 = jointCentroids[joint2];

            if (!centroid1 || !centroid2) return null;

            const point1 = mapToPanel(centroid1.x, centroid1.y);
            const point2 = mapToPanel(centroid2.x, centroid2.y);

            return (
              <Line
                key={`connection-${index}`}
                x1={point1.x}
                y1={point1.y}
                x2={point2.x}
                y2={point2.y}
                stroke={colors.text.primary}
                strokeWidth={1}
                opacity={0.2}
              />
            );
          })}

          {/* Joint centroids */}
          {Object.entries(jointCentroids).map(([jointName, centroid]) => {
            const { color, opacity, radius } = getJointStyle(jointName);
            const panelCoord = mapToPanel(centroid.x, centroid.y);

            return (
              <Circle
                key={`joint-${jointName}`}
                cx={panelCoord.x}
                cy={panelCoord.y}
                r={radius}
                fill={color}
                opacity={opacity}
              />
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E24B4A' }]} />
            <Text style={[styles.legendText, { color: '#E24B4A' }]}>needs work</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.text.primary, opacity: 0.6 }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>ok</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#0a0d12',
  },
  header: {
    position: 'absolute',
    top: spacing.cardGap,
    left: spacing.screen,
    zIndex: 2,
  },
  motionLabel: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.medium,
    color: '#F5A623',
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  mechanicName: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    color: '#E24B4A',
    marginTop: spacing.iconGap / 4,
  },
  visualContainer: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.cardGap,
    left: spacing.screen,
    zIndex: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconGap / 2,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
  },
});