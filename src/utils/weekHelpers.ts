import type { SwingAnalysis } from '../types';

/**
 * Get the ISO week number for a given date.
 * Returns { year, week } where week is 1-53.
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  const target = new Date(date.getTime());

  // Set to Thursday (ISO week date standard)
  const dayNum = (target.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNum + 3); // Set to Thursday

  const firstThursday = new Date(target.getFullYear(), 0, 4); // January 4th is always in week 1
  const week = Math.floor((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return { year: target.getFullYear(), week };
}

/**
 * Extract the overall score from a swing analysis.
 * Used consistently across components for scoring logic.
 */
export function getOverallScore(swing: SwingAnalysis): number {
  return (
    swing.coaching_output?.similarity_scores?.overall ??
    swing.similarity_score ??
    0
  );
}

/**
 * Get week bounds (start/end dates) for the current week.
 */
export function getThisWeekBounds(date: Date): { start: Date; end: Date } {
  const dayNum = (date.getDay() + 6) % 7; // Monday = 0
  const start = new Date(date);
  start.setDate(date.getDate() - dayNum);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get week bounds for the week prior to the given date.
 */
export function getLastWeekBounds(date: Date): { start: Date; end: Date } {
  const thisWeek = getThisWeekBounds(date);
  const start = new Date(thisWeek.start);
  start.setDate(start.getDate() - 7);

  const end = new Date(thisWeek.start);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}