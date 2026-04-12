import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

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
        if (error || !data) {
          return { ...s, profile: null, hasProfile: false, profileResolved: true };
        }
        return {
          ...s,
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
      // SIGNED_IN, SIGNED_OUT, INITIAL_SESSION, TOKEN_REFRESHED, etc.
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

    const { error } = await supabase.from('profiles').insert({
      id: state.user.id,
      ...data,
      role: 'player',
      leaderboard_opt_in: false,
      onboarding_completed: data.onboarding_completed ?? false,
    });

    if (!error) {
      await fetchProfile(state.user.id);

      await supabase.from('activity_log').insert({
        user_id: state.user.id,
        event_type: 'login',
        event_data: { source: 'signup' },
      });
    }

    return { error: error as Error | null };
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', state.user.id);

    if (!error) {
      await fetchProfile(state.user.id);
    }

    return { error: error as Error | null };
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
