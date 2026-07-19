import type { DrillMechanic, ExperienceLevel } from '../types/drill';

export const MECHANIC_LABELS: Record<DrillMechanic, string> = {
  stance: 'Stance',
  load: 'Load',
  power_position: 'Power Position',
  slot: 'Slot',
  balance_at_contact: 'Balance at Contact',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All Levels',
};

// Helper function to map primary mechanical issue titles to drill mechanics
export function mapMechanicalIssueToMechanic(issueTitle: string): DrillMechanic | null {
  const lowerTitle = issueTitle.toLowerCase();

  if (lowerTitle.includes('stance') || lowerTitle.includes('setup')) {
    return 'stance';
  }
  if (lowerTitle.includes('load') || lowerTitle.includes('timing')) {
    return 'load';
  }
  if (lowerTitle.includes('power position') || lowerTitle.includes('hip') || lowerTitle.includes('coil')) {
    return 'power_position';
  }
  if (lowerTitle.includes('slot') || lowerTitle.includes('path') || lowerTitle.includes('barrel')) {
    return 'slot';
  }
  if (lowerTitle.includes('balance') || lowerTitle.includes('contact') || lowerTitle.includes('finish')) {
    return 'balance_at_contact';
  }

  return null;
}
