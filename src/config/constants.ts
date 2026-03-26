export const BACKEND_API_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

/** Email for feedback / report a problem. */
export const FEEDBACK_EMAIL = 'jwallvtgc@gmail.com';

export async function getBackendUrl(): Promise<string> {
  return BACKEND_API_URL;
}

export function logConfig() {
  const backend = BACKEND_API_URL;
  const isLocalhost = backend.includes('localhost') || backend.includes('127.0.0.1');
  console.log('[Config] BACKEND_URL:', isLocalhost ? `${backend} (set EXPO_PUBLIC_BACKEND_URL for prod)` : backend);
}

/** Splash screen background – black */
export const SPLASH_BACKGROUND = '#000000';

/** Theme from swing-analyzer design spec */
export const COLORS = {
  background: '#080A0F',
  surface: '#0F1218',
  surfaceHover: '#151B24',
  border: '#1E2733',
  accent: '#F59E0B',
  accentGlow: 'rgba(245,158,11,0.15)',
  green: '#10B981',
  red: '#EF4444',
  text: '#F1F5F9',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  // Legacy aliases
  primary: '#10B981',
  primaryLight: '#14B8A6',
  primaryDark: '#064E3B',
  accentLight: '#FCD34D',
  surfaceLight: '#151B24',
  surfaceBorder: '#1E2733',
  textSecondary: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#F1F5F9',
  black: '#000000',
} as const;

/** Font family names – loaded via expo-font */
export const FONTS = {
  heading: 'BebasNeue_400Regular',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
} as const;

export const FREE_TIER_MONTHLY_LIMIT = 2;
