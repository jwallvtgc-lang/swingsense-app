import type { DrillMechanic, ExperienceLevel } from '../types/drill';

export const MECHANIC_LABELS: Record<DrillMechanic, string> = {
  'Stance': 'Stance',
  'Load & Stride': 'Load & Stride',
  'Power Position': 'Power Position',
  'Slot': 'Slot',
  'Balance/Extension': 'Balance/Extension',
  'Multi': 'Multi',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All Levels',
};

export function mapMechanicalIssueToMechanic(issueTitle: string): DrillMechanic | null {
  const t = issueTitle.toLowerCase();

  if (t.includes('stance') || t.includes('setup')) return 'Stance';
  if (t.includes('load') || t.includes('timing') || t.includes('stride')) return 'Load & Stride';
  if (t.includes('power position') || t.includes('hip') || t.includes('coil')) return 'Power Position';
  if (t.includes('slot') || t.includes('path') || t.includes('barrel')) return 'Slot';
  if (t.includes('balance') || t.includes('contact') || t.includes('finish') || t.includes('extension')) return 'Balance/Extension';

  return null;
}
