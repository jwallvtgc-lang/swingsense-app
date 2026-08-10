import type { DrillCard } from '../types/drill';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
}

// Mulberry32: compact, good-quality seeded PRNG.
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = z + Math.imul(z ^ (z >>> 7), 61 | z) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically selects `count` drills from `drills`.
 * Seed = profileId + periodKey (the subscription's current month_reset_date).
 * Identical inputs always produce identical output, so carousel and library
 * show the same drills for a given profile within a period, and rotate
 * automatically when the period resets (periodKey advances).
 */
export function seededDrillSelection(
  drills: DrillCard[],
  count: number,
  profileId: string,
  periodKey: string,
): DrillCard[] {
  if (drills.length === 0 || count <= 0) return [];
  const rand = mulberry32(hashString(profileId + periodKey));
  const shuffled = [...drills].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
