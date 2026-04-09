import type { User } from '@supabase/supabase-js';

/** Display name: profile first name, then auth metadata, email local part, or "Player". */
export function displayNameFromUser(
  profileFirstName: string | undefined,
  user: User | null
): string {
  const fromProfile = profileFirstName?.trim();
  if (fromProfile) return fromProfile;
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (full) return full;
  const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
  if (name) return name;
  const email = user?.email?.trim();
  if (email) {
    const local = email.split('@')[0];
    if (local) return local;
  }
  return 'Player';
}
