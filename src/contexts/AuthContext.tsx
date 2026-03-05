import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Profile } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  hasProfile: boolean;
}

type ProfileUpdateData = Partial<Pick<Profile, 'first_name' | 'age' | 'primary_position' | 'batting_side' | 'height_feet' | 'height_inches'>>;

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createProfile: (data: Omit<Profile, 'id' | 'role' | 'leaderboard_opt_in' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null }>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    hasProfile: false,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      setState((s) => ({ ...s, profile: null, hasProfile: false }));
      return;
    }

    setState((s) => ({ ...s, profile: data as Profile, hasProfile: true }));
  }, []);

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
          return { ...s, loading: false };
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
        }));
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.warn('[Auth] getSession failed:', err?.message ?? err);
        setState((s) => ({ ...s, session: null, user: null, loading: false }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeoutId);
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setState((s) => ({ ...s, profile: null, hasProfile: false }));
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState((s) => ({ ...s, profile: null, hasProfile: false }));
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
