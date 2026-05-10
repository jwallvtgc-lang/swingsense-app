/**
 * Wall clock when splashClock module first loads import chain — ~JS bundle start.
 * Used so native splash stays visible at least SPLASH_MIN_MS from cold start.
 */
export const SPLASH_T0_MS = Date.now();

/** Minimum ms the native splash PNG should stay up before mounting any React UI (Expo hides splash when views mount). */
export const SPLASH_MIN_MS = 2500;
