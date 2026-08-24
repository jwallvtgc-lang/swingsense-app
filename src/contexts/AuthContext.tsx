import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
// Same client as screens/services: `src/config/supabase.ts`
import { supabase } from '../config/supabase';
import { identifyUser, resetAnalytics, trackEvent } from '../services/analytics';
import { loginRevenueCat, logoutRevenueCat } from '../services/purchases';
import { Profile } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** The currently active profile — whichever the user has selected via switchProfile, or the payer profile by default. */
  profile: Profile | null;
  /** All profiles linked to this account via profile_relationships. */
  profiles: Profile[];
  /** ID of the profile currently shown across the app. */
  activeProfileId: string | null;
  loading: boolean;
  hasProfile: boolean;
  /** False while the first `profiles` fetch for the current session is in flight; avoids onboarding flash for returning users. */
  profileResolved: boolean;
}

type ProfileUpdateData = Partial<
  Pick<
    Profile,
    | 'first_name'
    | 'age'
    | 'primary_position'
    | 'batting_side'
    | 'height_feet'
    | 'height_inches'
    | 'experience_level'
    | 'onboarding_completed'
    | 'gave_coppa_consent'
    | 'consent_given_at'
  >
>;

interface AuthContextValue extends AuthState {
  /** True when `session` is non-null; updates with the same `setState` path as `session`. */
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; session: Session | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
  createProfile: (data: Omit<Profile, 'id' | 'role' | 'leaderboard_opt_in' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null; profileId: string | null }>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  /** Switch the active profile to any profile linked to this account. Updates `profile` and `activeProfileId` immediately in local state — no network call. */
  switchProfile: (profileId: string) => void;
  /** Permanently delete this account and all associated profiles/data. Signs out on success. */
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_REQUEST_TIMEOUT_MS = 30_000;

/** Avoids an infinite spinner when Supabase never resolves (bad URL, network, etc.). */
async function withAuthTimeout<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out (${AUTH_REQUEST_TIMEOUT_MS / 1000}s). Check your connection and EXPO_PUBLIC_SUPABASE_URL / anon key in .env.`
        )
      );
    }, AUTH_REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    profiles: [],
    activeProfileId: null,
    loading: true,
    hasProfile: false,
    profileResolved: false,
  });

  const fetchProfile = useCallback(async (userId: string, preferProfileId?: string) => {
    try {
      // Fetch the user object and all profile_relationships for this account in parallel.
      const [freshUserResult, { data: relRows, error: relError }] = await Promise.all([
        supabase.auth.getUser().then((r) => r.data?.user ?? null).catch(() => null),
        supabase
          .from('profile_relationships')
          .select('profile_id, is_payer')
          .eq('account_id', userId),
      ]);

      if (relError) throw relError;

      // No relationship rows → account hasn't completed profile creation yet (normal onboarding state).
      if (!relRows || relRows.length === 0) {
        setState((s) => {
          if (s.user?.id !== userId) return s;
          const userPatch = freshUserResult?.id === userId ? { user: freshUserResult } : {};
          return { ...s, ...userPatch, profile: null, profiles: [], activeProfileId: null, hasProfile: false, profileResolved: true };
        });
        return;
      }

      const profileIds = relRows.map((r) => r.profile_id as string);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);

      if (profilesError || !profilesData?.length) {
        setState((s) => {
          if (s.user?.id !== userId) return s;
          const userPatch = freshUserResult?.id === userId ? { user: freshUserResult } : {};
          return { ...s, ...userPatch, profile: null, profiles: [], activeProfileId: null, hasProfile: false, profileResolved: true };
        });
        return;
      }

      const allProfiles = profilesData as Profile[];

      // Identify user in analytics using the payer (primary) profile.
      const payerRel = relRows.find((r) => r.is_payer);
      const payerProfileId = (payerRel?.profile_id as string | undefined) ?? allProfiles[0]!.id;
      const payerProfile = allProfiles.find((p) => p.id === payerProfileId) ?? allProfiles[0]!;
      identifyUser(userId, {
        first_name: payerProfile.first_name ?? undefined,
        experience_level: payerProfile.experience_level,
        primary_position: payerProfile.primary_position,
        batting_side: payerProfile.batting_side,
        age: payerProfile.age,
      });

      console.log('[fetchProfile] resolved', allProfiles.length, 'profile(s) | auth userId:', userId);

      setState((s) => {
        if (s.user?.id !== userId) return s;
        const userPatch = freshUserResult?.id === userId ? { user: freshUserResult } : {};

        // Preserve the currently active profile if it's still in the new result set.
        // Otherwise default to the is_payer profile, then the first profile.
        // preferProfileId forces a specific profile active (used by createProfile to activate new profiles).
        const stillValid = s.activeProfileId != null && allProfiles.some((p) => p.id === s.activeProfileId);
        const preferValid = preferProfileId != null && allProfiles.some((p) => p.id === preferProfileId);
        const activeId = preferValid ? preferProfileId! : stillValid ? s.activeProfileId! : payerProfileId;
        const activeProfile = allProfiles.find((p) => p.id === activeId) ?? allProfiles[0]!;

        return {
          ...s,
          ...userPatch,
          profiles: allProfiles,
          activeProfileId: activeProfile.id,
          profile: activeProfile,
          hasProfile: true,
          profileResolved: true,
        };
      });
    } catch {
      setState((s) => {
        if (s.user?.id !== userId) return s;
        return { ...s, profile: null, profiles: [], activeProfileId: null, hasProfile: false, profileResolved: true };
      });
    }
  }, []);

  /** Keep React state in sync with Supabase (listener can fire after the signIn promise resolves). */
  const applyAuthSession = useCallback(
    (session: Session | null) => {
      // Single setState so session/user never get wiped by a batched follow-up update.
      const hasUser = Boolean(session?.user);
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
        profileResolved: !hasUser,
        ...(hasUser ? {} : { profile: null, profiles: [], activeProfileId: null, hasProfile: false }),
      }));
      if (session?.user) {
        void fetchProfile(session.user.id);
        void loginRevenueCat(session.user.id);
      }
    },
    [fetchProfile]
  );

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await fetchProfile(state.user.id);
    }
  }, [state.user, fetchProfile]);

  useEffect(() => {
    const SESSION_TIMEOUT_MS = 8_000;

    console.log('[Auth] Starting getSession...');

    const timeoutId = setTimeout(() => {
      setState((s) => {
        if (s.loading) {
          console.warn('[Auth] getSession timed out after 8s');
          return { ...s, loading: false, profileResolved: true };
        }
        return s;
      });
    }, SESSION_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        console.log('[Auth] getSession done, session:', session ? 'yes' : 'no');
        setState((s) => ({
          ...s,
          session,
          user: session?.user ?? null,
          loading: false,
          profileResolved: !session?.user,
        }));
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.warn('[Auth] getSession failed:', err?.message ?? err);
        setState((s) => ({
          ...s,
          session: null,
          user: null,
          loading: false,
          profileResolved: true,
        }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timeoutId);
      console.log(
        '[Auth] onAuthStateChange',
        event,
        session ? 'session: yes' : 'session: no'
      );
      if (event === 'USER_UPDATED' && session?.user) {
        // Only refresh the user object — do NOT reset profileResolved or re-fetch the
        // profile row. updateUser() fires this for metadata writes (e.g. account_type),
        // and resetting profileResolved would cause a needless splash flash.
        setState((s) => ({ ...s, session, user: session.user }));
        return;
      }
      applyAuthSession(session ?? null);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile, applyAuthSession]);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await withAuthTimeout('Sign up', () =>
        supabase.auth.signUp({ email, password })
      );
      if (error) {
        console.log('[Auth] signUp Supabase error:', error.message, error);
      } else {
        trackEvent('user_signed_up');
        if (data.session) {
          applyAuthSession(data.session);
        }
      }
      return {
        error: error as Error | null,
        session: data.session ?? null,
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.log('[Auth] signUp exception:', err.message, e);
      return { error: err, session: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await withAuthTimeout('Sign in', () =>
        supabase.auth.signInWithPassword({ email, password })
      );
      if (error) {
        console.log('[Auth] signIn Supabase error:', error.message, error);
      } else {
        console.log('[Auth] signIn ok, session present:', Boolean(data.session));
        if (data.session) {
          applyAuthSession(data.session);
        }
      }
      return {
        error: error as Error | null,
        session: data.session ?? null,
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.log('[Auth] signIn exception:', err.message, e);
      return { error: err, session: null };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetAnalytics();
    void logoutRevenueCat();
    setState((s) => ({
      ...s,
      profile: null,
      profiles: [],
      activeProfileId: null,
      hasProfile: false,
      profileResolved: true,
    }));
  };

  const switchProfile = useCallback((profileId: string) => {
    const target = state.profiles.find((p) => p.id === profileId);
    if (!target) return;
    // Re-identify analytics with the newly active profile.
    identifyUser(state.user?.id ?? profileId, {
      first_name: target.first_name ?? undefined,
      experience_level: target.experience_level,
      primary_position: target.primary_position,
      batting_side: target.batting_side,
      age: target.age,
    });
    setState((s) => {
      const t = s.profiles.find((p) => p.id === profileId);
      if (!t) return s;
      return { ...s, activeProfileId: profileId, profile: t, hasProfile: true };
    });
  }, [state.profiles, state.user?.id]);

  const createProfile = async (
    data: Omit<Profile, 'id' | 'role' | 'leaderboard_opt_in' | 'created_at' | 'updated_at'>
  ) => {
    if (!state.user) return { error: new Error('Not authenticated'), profileId: null };

    try {
      // Generate the profile ID client-side so it's known before any DB call.
      // This avoids a chicken-and-egg RLS failure: reading back the ID via .select().single()
      // would trigger the "view linked profiles" policy, which requires a profile_relationships
      // row that doesn't exist yet at that point.
      // Use Crypto.randomUUID() (expo-crypto) — crypto.randomUUID() is not available in Expo Go.
      const newProfileId = Crypto.randomUUID();
      const accountType = state.user.user_metadata?.account_type as 'player' | 'parent' | undefined;

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newProfileId,
          ...data,
          role: 'player',
          leaderboard_opt_in: false,
          onboarding_completed: data.onboarding_completed ?? false,
        });

      if (insertError) {
        return { error: insertError as Error, profileId: null };
      }

      // is_payer should only be true for the first profile under this account.
      const { data: existingPayer } = await supabase
        .from('profile_relationships')
        .select('profile_id')
        .eq('account_id', state.user.id)
        .eq('is_payer', true)
        .limit(1);
      const isPayer = !existingPayer || existingPayer.length === 0;

      const { error: relError } = await supabase.from('profile_relationships').insert({
        account_id: state.user.id,
        profile_id: newProfileId,
        relationship_type: accountType === 'parent' ? 'parent' : 'self',
        is_payer: isPayer,
        gave_coppa_consent: data.gave_coppa_consent ?? false,
        consent_given_at: data.consent_given_at ?? null,
      });

      if (relError) {
        return { error: relError as Error, profileId: null };
      }

      await fetchProfile(state.user.id, newProfileId);

      // activity_log.user_id → profiles.id (FK), so use the newly generated profile id.
      await supabase.from('activity_log').insert({
        user_id: newProfileId,
        event_type: 'login',
        event_data: { source: 'signup' },
      });

      return { error: null, profileId: newProfileId };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)), profileId: null };
    }
  };

  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    if (!state.user) return { error: new Error('Not authenticated') };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return { error: new Error('No active session') };

      const edgeFnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`;
      const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return { error: new Error((body as { error?: string }).error ?? `Deletion failed (${response.status})`) };
      }

      resetAnalytics();
      void logoutRevenueCat();
      await supabase.auth.signOut();
      setState({
        session: null,
        user: null,
        profile: null,
        profiles: [],
        activeProfileId: null,
        loading: false,
        hasProfile: false,
        profileResolved: true,
      });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    // profiles.id is no longer guaranteed to match state.user.id (AI-147 Stage 1).
    // Prefer the already-loaded profile id; fall back to resolving via profile_relationships
    // (same lookup fetchProfile uses) for cases where the profile hasn't loaded yet due to RLS.
    let profileId: string | null = state.profile?.id ?? null;
    if (!profileId) {
      const { data: relRows } = await supabase
        .from('profile_relationships')
        .select('profile_id')
        .eq('account_id', state.user.id)
        .limit(1);
      profileId = (relRows?.[0]?.profile_id as string) ?? null;
    }

    if (!profileId) {
      return { error: new Error('No profile found for this account') };
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select('id');

    console.log('[updateProfile] profileId:', profileId, '| rows affected:', updated?.length ?? 0, '| error:', error?.message ?? null);

    if (error) return { error: error as Error };

    if (!updated || updated.length === 0) {
      return { error: new Error('Update matched no rows — RLS policy may need updating for the new profile model') };
    }

    await fetchProfile(state.user.id);
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: Boolean(state.session),
        signUp,
        signIn,
        signOut,
        createProfile,
        updateProfile,
        refreshProfile,
        switchProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
