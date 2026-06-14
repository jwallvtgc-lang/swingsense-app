/**
 * Skeleton overlay utilities for MoveNet keypoint visualization
 */

// MoveNet 17-point landmark names (based on COCO pose model)
export const MOVENET_LANDMARKS = {
  NOSE: 'nose',
  LEFT_EYE: 'left_eye',
  RIGHT_EYE: 'right_eye',
  LEFT_EAR: 'left_ear',
  RIGHT_EAR: 'right_ear',
  LEFT_SHOULDER: 'left_shoulder',
  RIGHT_SHOULDER: 'right_shoulder',
  LEFT_ELBOW: 'left_elbow',
  RIGHT_ELBOW: 'right_elbow',
  LEFT_WRIST: 'left_wrist',
  RIGHT_WRIST: 'right_wrist',
  LEFT_HIP: 'left_hip',
  RIGHT_HIP: 'right_hip',
  LEFT_KNEE: 'left_knee',
  RIGHT_KNEE: 'right_knee',
  LEFT_ANKLE: 'left_ankle',
  RIGHT_ANKLE: 'right_ankle',
} as const;

// Skeleton connections defining which joints to connect with lines
export const SKELETON_CONNECTIONS: Array<[string, string]> = [
  // Head connections
  [MOVENET_LANDMARKS.NOSE, MOVENET_LANDMARKS.LEFT_EYE],
  [MOVENET_LANDMARKS.NOSE, MOVENET_LANDMARKS.RIGHT_EYE],
  [MOVENET_LANDMARKS.LEFT_EYE, MOVENET_LANDMARKS.LEFT_EAR],
  [MOVENET_LANDMARKS.RIGHT_EYE, MOVENET_LANDMARKS.RIGHT_EAR],

  // Torso connections
  [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.RIGHT_SHOULDER],
  [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.LEFT_HIP],
  [MOVENET_LANDMARKS.RIGHT_SHOULDER, MOVENET_LANDMARKS.RIGHT_HIP],
  [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.RIGHT_HIP],

  // Left arm
  [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.LEFT_ELBOW],
  [MOVENET_LANDMARKS.LEFT_ELBOW, MOVENET_LANDMARKS.LEFT_WRIST],

  // Right arm
  [MOVENET_LANDMARKS.RIGHT_SHOULDER, MOVENET_LANDMARKS.RIGHT_ELBOW],
  [MOVENET_LANDMARKS.RIGHT_ELBOW, MOVENET_LANDMARKS.RIGHT_WRIST],

  // Left leg
  [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.LEFT_KNEE],
  [MOVENET_LANDMARKS.LEFT_KNEE, MOVENET_LANDMARKS.LEFT_ANKLE],

  // Right leg
  [MOVENET_LANDMARKS.RIGHT_HIP, MOVENET_LANDMARKS.RIGHT_KNEE],
  [MOVENET_LANDMARKS.RIGHT_KNEE, MOVENET_LANDMARKS.RIGHT_ANKLE],
];

// Joint highlighting based on primary mechanical issue
export const MECHANIC_JOINTS: Record<string, { red: string[]; amber: string[] }> = {
  'stance': {
    red: [MOVENET_LANDMARKS.LEFT_ANKLE, MOVENET_LANDMARKS.RIGHT_ANKLE, MOVENET_LANDMARKS.LEFT_KNEE, MOVENET_LANDMARKS.RIGHT_KNEE],
    amber: [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.RIGHT_HIP],
  },
  'load': {
    red: [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.RIGHT_HIP],
    amber: [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.RIGHT_SHOULDER, MOVENET_LANDMARKS.LEFT_KNEE, MOVENET_LANDMARKS.RIGHT_KNEE],
  },
  'power_position': {
    red: [MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.RIGHT_HIP, MOVENET_LANDMARKS.LEFT_KNEE, MOVENET_LANDMARKS.RIGHT_KNEE],
    amber: [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.RIGHT_SHOULDER],
  },
  'slot': {
    red: [MOVENET_LANDMARKS.LEFT_ELBOW, MOVENET_LANDMARKS.RIGHT_ELBOW, MOVENET_LANDMARKS.LEFT_WRIST, MOVENET_LANDMARKS.RIGHT_WRIST],
    amber: [MOVENET_LANDMARKS.LEFT_SHOULDER, MOVENET_LANDMARKS.RIGHT_SHOULDER],
  },
  'balance_at_contact': {
    red: [MOVENET_LANDMARKS.LEFT_ANKLE, MOVENET_LANDMARKS.RIGHT_ANKLE],
    amber: [MOVENET_LANDMARKS.LEFT_KNEE, MOVENET_LANDMARKS.RIGHT_KNEE, MOVENET_LANDMARKS.LEFT_HIP, MOVENET_LANDMARKS.RIGHT_HIP],
  },
};

// Plain language names for primary mechanical issues
export const MECHANIC_DISPLAY_NAMES: Record<string, string> = {
  'stance': 'Stance Setup',
  'load': 'Load Phase',
  'power_position': 'Power Position',
  'slot': 'Swing Path',
  'balance_at_contact': 'Balance at Contact',
};

/**
 * Maps human-readable title to slug for joint highlighting
 */
export function titleToMechanicSlug(title: string | undefined): string | undefined {
  if (!title) return undefined;

  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('stance')) return 'stance';
  if (lowerTitle.includes('load')) return 'load';
  if (lowerTitle.includes('power')) return 'power_position';
  if (lowerTitle.includes('slot')) return 'slot';
  if (lowerTitle.includes('balance')) return 'balance_at_contact';

  return undefined;
}

// Mechanic phase windows for slow motion pause timing
export const MECHANIC_PHASE_WINDOWS: Record<string, { start: number; end: number }> = {
  stance: { start: 0, end: 0.22 },
  load: { start: 0.22, end: 0.44 },
  power_position: { start: 0.44, end: 0.62 },
  slot: { start: 0.62, end: 0.75 },
  balance_at_contact: { start: 0.75, end: 1.0 },
};

// Plain mechanic names for UI display
export const MECHANIC_PLAIN_NAMES: Record<string, string> = {
  stance: 'stance',
  load: 'load',
  power_position: 'power position',
  slot: 'slot',
  balance_at_contact: 'balance at contact',
};

/**
 * Computes actual rendered video rect accounting for CONTAIN letterboxing
 */
export function getVideoRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): { x: number; y: number; width: number; height: number } {
  const containerAspect = containerW / containerH;
  const videoAspect = naturalW / naturalH;

  if (videoAspect > containerAspect) {
    // Video is wider than container - letterbox top/bottom
    const renderedWidth = containerW;
    const renderedHeight = containerW / videoAspect;
    const yOffset = (containerH - renderedHeight) / 2;
    return {
      x: 0,
      y: yOffset,
      width: renderedWidth,
      height: renderedHeight,
    };
  } else {
    // Video is taller than container - letterbox left/right
    const renderedHeight = containerH;
    const renderedWidth = containerH * videoAspect;
    const xOffset = (containerW - renderedWidth) / 2;
    return {
      x: xOffset,
      y: 0,
      width: renderedWidth,
      height: renderedHeight,
    };
  }
}

/**
 * Convert normalized keypoint coordinates (0-1) to pixel coordinates
 */
export function mapKeypointToPixel(
  keypoint: { x: number; y: number; confidence: number },
  videoRect: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: videoRect.x + (keypoint.y * videoRect.width),
    y: videoRect.y + ((1 - keypoint.x) * videoRect.height),
  };
}

/**
 * Get the frame data for the current playback time
 * Uses binary search for O(log n) performance since frames are sorted by timestamp
 */
export function getFrameForTime(
  frames: Array<{ frame_number: number; timestamp_ms: number; keypoints: Record<string, { x: number; y: number; confidence: number }> }>,
  currentTimeMs: number,
  fps: number
): { frame_number: number; timestamp_ms: number; keypoints: Record<string, { x: number; y: number; confidence: number }> } | null {
  if (!frames || frames.length === 0) return null;

  // Binary search for closest frame
  let left = 0;
  let right = frames.length - 1;
  let closestFrame = frames[0];
  let minDiff = Math.abs(frames[0].timestamp_ms - currentTimeMs);

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const frame = frames[mid];
    const diff = Math.abs(frame.timestamp_ms - currentTimeMs);

    if (diff < minDiff) {
      minDiff = diff;
      closestFrame = frame;
    }

    if (frame.timestamp_ms < currentTimeMs) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return closestFrame;
}

/**
 * Check if a frame has enough valid keypoints to render skeleton
 */
export function isValidFrame(
  frame: { frame_number: number; timestamp_ms: number; keypoints: Record<string, { x: number; y: number; confidence: number }> } | null
): boolean {
  if (!frame || !frame.keypoints) return false;

  const validKeypoints = Object.values(frame.keypoints).filter(
    kp => kp.confidence > 0.15
  );

  return validKeypoints.length >= 5; // At least 5 keypoints with good confidence
}