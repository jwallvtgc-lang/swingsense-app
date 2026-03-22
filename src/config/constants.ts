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

/** Splash screen background – navy, matches native splash */
export const SPLASH_BACKGROUND = '#1e3a5f';

export const COLORS = {
  primary: '#1B4D3E',
  primaryLight: '#2D7A5F',
  primaryDark: '#0F2E25',
  accent: '#F5A623',
  accentLight: '#FFEAA7',
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  surfaceBorder: '#333333',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  white: '#FFFFFF',
  black: '#000000',
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
