import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
// Same client as screens/services: `src/config/supabase.ts`
import { supabase } from '../config/supabase';
import { identifyUser, resetAnalytics, trackEvent } from '../services/analytics';
import { Profile } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
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
  createProfile: (data: Omit<Profile, 'id' | 'role' | 'leaderboard_opt_in' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null }>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
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
    loading: true,
    hasProfile: false,
    profileResolved: false,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // getUser() and the account→profile_id lookup run in parallel — no added latency vs before.
      // profile_relationships is the source of truth linking an auth account to its profile(s).
      const [freshUserResult, { data: relRows, error: relError }] = await Promise.all([
        supabase.auth.getUser().then((r) => r.data?.user ?? null).catch(() => null),
        supabase
          .from('profile_relationships')
          .select('profile_id')
          .eq('account_id', userId)
          .limit(1),
      ]);

      if (relError) throw relError;

      // No relationship row → account hasn't completed profile creation yet (normal onboarding state).
      if (!relRows || relRows.length === 0) {
        setState((s) => {
          if (s.user?.id !== userId) return s;
          const userPatch = freshUserResult?.id === userId ? { user: freshUserResult } : {};
          return { ...s, ...userPatch, profile: null, hasProfile: false, profileResolved: true };
        });
        return;
      }

      const profileId = relRows[0].profile_id as string;
      console.log('[fetchProfile] resolved profile_id:', profileId, '| auth userId:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      console.log('[fetchProfile] profiles SELECT result:', { data: data ? '(row)' : null, error: error?.message ?? null, code: (error as any)?.code ?? null });

      if (!error && data) {
        identifyUser(userId, {
          first_name: data.first_name ?? undefined,
          experience_level: data.experience_level,
          primary_position: data.primary_position,
          batting_side: data.batting_side,
          age: data.age,
        });
      }

      setState((s) => {
        if (s.user?.id !== userId) return s;
        const userPatch = freshUserResult?.id === userId ? { user: freshUserResult } : {};
        if (error || !data) {
          return { ...s, ...userPatch, profile: null, hasProfile: false, profileResolved: true };
        }
        return {
          ...s,
          ...userPatch,
          profile: data as Profile,
          hasProfile: true,
          profileResolved: true,
        };
      });
    } catch {
      setState((s) => {
        if (s.user?.id !== userId) return s;
        return { ...s, profile: null, hasProfile: false, profileResolved: true };
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
        ...(hasUser ? {} : { profile: null, hasProfile: false }),
      }));
      if (session?.user) {
        void fetchProfile(session.user.id);
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
    setState((s) => ({
      ...s,
      profile: null,
      hasProfile: false,
      profileResolved: true,
    }));
  };

  const createProfile = async (
    data: Omit<Profile, 'id' | 'role' | 'leaderboard_opt_in' | 'created_at' | 'updated_at'>
  ) => {
    if (!state.user) return { error: new Error('Not authenticated') };

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
        return { error: insertError as Error };
      }

      const { error: relError } = await supabase.from('profile_relationships').insert({
        account_id: state.user.id,
        profile_id: newProfileId,
        relationship_type: accountType === 'parent' ? 'parent' : 'self',
        is_payer: true,
        gave_coppa_consent: data.gave_coppa_consent ?? false,
        consent_given_at: data.consent_given_at ?? null,
      });

      if (relError) {
        return { error: relError as Error };
      }

      await fetchProfile(state.user.id);

      // activity_log.user_id → profiles.id (FK), so use the newly generated profile id.
      await supabase.from('activity_log').insert({
        user_id: newProfileId,
        event_type: 'login',
        event_data: { source: 'signup' },
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
