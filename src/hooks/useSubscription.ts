import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubscription } from '../services/subscription';
import type { Subscription } from '../types';

export function useSubscription(): Subscription | null {
  const { profile } = useAuth();
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
  }, [profile?.id]);

  return subscription;
}
