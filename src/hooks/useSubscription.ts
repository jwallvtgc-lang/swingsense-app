import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubscription } from '../services/subscription';
import type { Subscription } from '../types';

export function useSubscription(): Subscription | null {
  const { profile } = useAuth();
  const isFocused = useIsFocused();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const sub = await getUserSubscription(profileId);
      if (!cancelled) setSubscription(sub);
    })();
    return () => { cancelled = true; };
  }, [profile?.id, isFocused]);

  return subscription;
}

/**
 * True only once the subscription fetch has resolved and confirmed free tier
 * (including "no subscription row" — treated as free elsewhere, e.g. canUserAnalyze).
 * Starts false and stays false until resolution, so paid users never see a
 * free-tier UI flash before their real tier loads.
 */
export function useIsFreeTier(): boolean {
  const { profile } = useAuth();
  const isFocused = useIsFocused();
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) {
      setIsFree(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const sub = await getUserSubscription(profileId);
      if (!cancelled) setIsFree((sub?.tier ?? 'free') === 'free');
    })();
    return () => { cancelled = true; };
  }, [profile?.id, isFocused]);

  return isFree;
}
