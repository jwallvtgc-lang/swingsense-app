import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Line, Ellipse, Polygon } from 'react-native-svg';
import {
  MOVENET_LANDMARKS,
  MECHANIC_JOINTS,
  titleToMechanicSlug,
  getFrameForTime,
} from '../utils/skeletonUtils';
import {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
  typography,
} from '../../design-system/tokens';
import type { KeypointData, PrimaryMechanicalIssue, FrameKeypoints } from '../types';

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
  spread: number;
  confidence: number;
}

interface BatPathPoint {
  x: number;
  y: number;
  frameIndex: number;
}

const CONFIDENCE_THRESHOLD = 0.1;
const MIN_FRAMES_FOR_SPREAD = 3;

// Visual constants
const PANEL_PADDING = 0.125; // 12.5% padding on each side = 75% fill
const GROUND_LINE_Y_PERCENT = 0.85;
const OUTER_RADIUS_BASE = 8;
const OUTER_RADIUS_SPREAD_MULTIPLIER = 40;
const MIDDLE_RADIUS_BASE = 5;
const MIDDLE_RADIUS_SPREAD_MULTIPLIER = 20;
const INNER_RADIUS = 4;
const CENTER_RADIUS = 2;

export default function MotionTrailPanel({
  frames,
  primaryIssue,
  fps,
  containerWidth,
  containerHeight,
  currentTime,
}: MotionTrailPanelProps) {

  const { jointCentroids, batPath, bounds, mechanicSlug, currentFrameIndex } = useMemo(() => {
    if (!frames || frames.length === 0) {
      return {
        jointCentroids: {},
        batPath: [],
        bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        mechanicSlug: undefined,
        currentFrameIndex: -1
      };
    }

    const slug = titleToMechanicSlug(primaryIssue?.title);

    // Calculate current frame index for highlighting
    const frameIndex = currentTime !== undefined ?
      Math.floor((currentTime / 1000) * fps) : -1;

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

    // Calculate centroids and spread for each joint
    const centroids: Record<string, JointCentroid> = {};
    Object.entries(jointPositions).forEach(([jointName, positions]) => {
      if (positions.length < 1) return;

      // Calculate centroid (mean position)
      const sumX = positions.reduce((sum, pos) => sum + pos.x, 0);
      const sumY = positions.reduce((sum, pos) => sum + pos.y, 0);
      const meanX = sumX / positions.length;
      const meanY = sumY / positions.length;

      // Calculate spread (standard deviation)
      let spread = 0;
      if (positions.length >= MIN_FRAMES_FOR_SPREAD) {
        const varianceX = positions.reduce((sum, pos) => sum + Math.pow(pos.x - meanX, 2), 0) / positions.length;
        const varianceY = positions.reduce((sum, pos) => sum + Math.pow(pos.y - meanY, 2), 0) / positions.length;
        spread = Math.sqrt(varianceX + varianceY);
      }

      // Average confidence
      const avgConfidence = positions.reduce((sum, pos) => sum + pos.confidence, 0) / positions.length;

      centroids[jointName] = {
        x: meanX,
        y: meanY,
        spread,
        confidence: avgConfidence,
      };
    });

    // Find bounding box of all centroids
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

    // Calculate bat path from wrist movement
    const leftWristPositions: BatPathPoint[] = [];
    const rightWristPositions: BatPathPoint[] = [];

    frames.forEach((frame, index) => {
      if (!frame.keypoints) return;

      const leftWrist = frame.keypoints[MOVENET_LANDMARKS.LEFT_WRIST];
      const rightWrist = frame.keypoints[MOVENET_LANDMARKS.RIGHT_WRIST];

      if (leftWrist && leftWrist.confidence > CONFIDENCE_THRESHOLD) {
        leftWristPositions.push({
          x: leftWrist.x,
          y: leftWrist.y,
          frameIndex: index
        });
      }

      if (rightWrist && rightWrist.confidence > CONFIDENCE_THRESHOLD) {
        rightWristPositions.push({
          x: rightWrist.x,
          y: rightWrist.y,
          frameIndex: index
        });
      }
    });

    // Choose wrist with more movement (larger total distance)
    const calculateTotalDistance = (positions: BatPathPoint[]): number => {
      let total = 0;
      for (let i = 1; i < positions.length; i++) {
        const dx = positions[i].x - positions[i - 1].x;
        const dy = positions[i].y - positions[i - 1].y;
        total += Math.sqrt(dx * dx + dy * dy);
      }
      return total;
    };

    const leftDistance = calculateTotalDistance(leftWristPositions);
    const rightDistance = calculateTotalDistance(rightWristPositions);
    const batPathPoints = leftDistance > rightDistance ? leftWristPositions : rightWristPositions;

    return {
      jointCentroids: centroids,
      batPath: batPathPoints,
      bounds: boundingBox,
      mechanicSlug: slug,
      currentFrameIndex: frameIndex
    };
  }, [frames, primaryIssue, fps, currentTime]);

  if (!frames || frames.length === 0) {
    return null;
  }

  // Scale centroids to panel dimensions
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

  // Get joint colors based on primary issue
  const getJointColor = (jointName: string) => {
    if (!mechanicSlug || !MECHANIC_JOINTS[mechanicSlug]) {
      return { color: colors.text.primary, opacity: 0.5 }; // Default white
    }

    const { red, amber } = MECHANIC_JOINTS[mechanicSlug];

    if (red.includes(jointName)) {
      return { color: colors.text.red, opacity: 0.85 }; // Red for problem joints
    } else if (amber.includes(jointName)) {
      return { color: colors.bg.gold, opacity: 0.85 }; // Amber for connected joints
    } else {
      return { color: colors.text.primary, opacity: 0.5 }; // White for others
    }
  };

  // Create bat path SVG path string
  const createBatPathString = (): string => {
    if (batPath.length < 2) return '';

    const scaledPoints = batPath.map(point => mapToPanel(point.x, point.y));

    let pathString = `M${scaledPoints[0].x},${scaledPoints[0].y}`;

    // Use smooth curves for better visual appearance
    for (let i = 1; i < scaledPoints.length; i++) {
      if (i === 1) {
        pathString += ` L${scaledPoints[i].x},${scaledPoints[i].y}`;
      } else {
        // Quadratic bezier curve for smoothness
        const prevPoint = scaledPoints[i - 1];
        const currPoint = scaledPoints[i];
        const controlX = (prevPoint.x + currPoint.x) / 2;
        const controlY = (prevPoint.y + currPoint.y) / 2;
        pathString += ` Q${controlX},${controlY} ${currPoint.x},${currPoint.y}`;
      }
    }

    return pathString;
  };

  // Calculate ground line and feet position
  const groundLineY = containerHeight * GROUND_LINE_Y_PERCENT;
  const anklePositions = [
    jointCentroids[MOVENET_LANDMARKS.LEFT_ANKLE],
    jointCentroids[MOVENET_LANDMARKS.RIGHT_ANKLE]
  ].filter(Boolean);

  const feetCenterX = anklePositions.length > 0 ?
    anklePositions.reduce((sum, ankle) => {
      const mapped = mapToPanel(ankle.x, ankle.y);
      return sum + mapped.x;
    }, 0) / anklePositions.length : containerWidth / 2;

  const batPathString = createBatPathString();
  const lastBatPoint = batPath.length > 0 ? mapToPanel(batPath[batPath.length - 1].x, batPath[batPath.length - 1].y) : null;

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {/* Dark background */}
      <LinearGradient
        colors={[colors.bg.splashBase, colors.bg.splashBase]}
        style={StyleSheet.absoluteFill}
      />

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
            stroke={colors.border.dim}
            strokeWidth={0.5}
            opacity={0.5}
          />

          {/* Ground shadow ellipse */}
          <Ellipse
            cx={feetCenterX}
            cy={groundLineY + 8}
            rx={40}
            ry={6}
            fill={colors.bg.splashBase}
            opacity={0.3}
          />

          {/* Bat path */}
          {batPathString && (
            <>
              <Path
                d={batPathString}
                fill="none"
                stroke={colors.bg.gold}
                strokeWidth={2}
                opacity={0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Arrow at end of bat path */}
              {lastBatPoint && (
                <Polygon
                  points={`${lastBatPoint.x},${lastBatPoint.y - 4} ${lastBatPoint.x + 6},${lastBatPoint.y + 2} ${lastBatPoint.x - 6},${lastBatPoint.y + 2}`}
                  fill={colors.bg.gold}
                  opacity={0.7}
                />
              )}
            </>
          )}

          {/* Joint trails */}
          {Object.entries(jointCentroids).map(([jointName, centroid]) => {
            const { color, opacity } = getJointColor(jointName);
            const panelCoord = mapToPanel(centroid.x, centroid.y);

            const outerRadius = OUTER_RADIUS_BASE + (centroid.spread * OUTER_RADIUS_SPREAD_MULTIPLIER);
            const middleRadius = MIDDLE_RADIUS_BASE + (centroid.spread * MIDDLE_RADIUS_SPREAD_MULTIPLIER);

            // Check if this joint should be highlighted for current frame
            const isHighlighted = currentTime !== undefined &&
                                currentFrameIndex >= 0 &&
                                currentFrameIndex < frames.length &&
                                frames[currentFrameIndex]?.keypoints?.[jointName]?.confidence > CONFIDENCE_THRESHOLD;

            return (
              <React.Fragment key={`joint-${jointName}`}>
                {/* Outer glow ring */}
                <Circle
                  cx={panelCoord.x}
                  cy={panelCoord.y}
                  r={outerRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.5}
                  opacity={0.15}
                />

                {/* Middle ring */}
                <Circle
                  cx={panelCoord.x}
                  cy={panelCoord.y}
                  r={middleRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.8}
                  opacity={0.3}
                />

                {/* Inner dot */}
                <Circle
                  cx={panelCoord.x}
                  cy={panelCoord.y}
                  r={INNER_RADIUS}
                  fill={color}
                  opacity={isHighlighted ? 1.0 : 0.85}
                />

                {/* Center dot */}
                <Circle
                  cx={panelCoord.x}
                  cy={panelCoord.y}
                  r={CENTER_RADIUS}
                  fill={isHighlighted ? color : colors.text.primary}
                  opacity={isHighlighted ? 1.0 : 0.9}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.text.red }]} />
            <Text style={[styles.legendText, { color: colors.text.red }]}>needs work</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.bg.gold }]} />
            <Text style={[styles.legendText, { color: colors.bg.gold }]}>connected</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.text.primary, opacity: 0.5 }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>ok</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.bg.gold }]} />
            <Text style={[styles.legendText, { color: colors.bg.gold }]}>bat path</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.bg.splashBase,
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
    color: colors.bg.gold,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  mechanicName: {
    fontFamily: typography.body,
    fontSize: fontSizes.label,
    color: colors.text.red,
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
  legendLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontFamily: typography.body,
    fontSize: fontSizes.micro,
  },
});