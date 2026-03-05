import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_ANON_KEY';

const isPlaceholder = SUPABASE_URL.includes('YOUR_PROJECT') || SUPABASE_ANON_KEY.includes('your-anon');
console.log('[Supabase] URL:', SUPABASE_URL.replace(/\/\/[^@]+@/, '//***@'));
if (isPlaceholder) console.warn('[Supabase] Placeholder config - set EXPO_PUBLIC_SUPABASE_* in eas.json or EAS secrets');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
