/**
 * Swing analysis utilities for mechanical issue mapping and phase timing
 */

// Joint highlighting based on primary mechanical issue
export const MECHANIC_JOINTS: Record<string, { red: string[]; amber: string[] }> = {
  'stance': {
    red: ['left_ankle', 'right_ankle', 'left_knee', 'right_knee'],
    amber: ['left_hip', 'right_hip'],
  },
  'load': {
    red: ['left_hip', 'right_hip'],
    amber: ['left_shoulder', 'right_shoulder', 'left_knee', 'right_knee'],
  },
  'power_position': {
    red: ['left_hip', 'right_hip', 'left_knee', 'right_knee'],
    amber: ['left_shoulder', 'right_shoulder'],
  },
  'slot': {
    red: ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
    amber: ['left_shoulder', 'right_shoulder'],
  },
  'balance_at_contact': {
    red: ['left_ankle', 'right_ankle'],
    amber: ['left_knee', 'right_knee', 'left_hip', 'right_hip'],
  },
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