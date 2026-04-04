import { supabase } from '../config/supabase';
import { Subscription } from '../types';
import { FREE_TIER_MONTHLY_LIMIT } from '../config/constants';

export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data as Subscription | null;
}

export async function canUserAnalyze(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
}> {
  const sub = await getUserSubscription(userId);

  if (!sub) {
    return { allowed: true, remaining: FREE_TIER_MONTHLY_LIMIT };
  }

  if (sub.tier === 'pro' && sub.status === 'active') {
    return { allowed: true };
  }

  const now = new Date();
  const resetDate = new Date(sub.month_reset_date);
  if (now >= resetDate) {
    await supabase
      .from('subscriptions')
      .update({
        analyses_used_this_month: 0,
        month_reset_date: new Date(
          resetDate.getFullYear(),
          resetDate.getMonth() + 1,
          1
        ).toISOString(),
      })
      .eq('id', sub.id);

    return { allowed: true, remaining: FREE_TIER_MONTHLY_LIMIT };
  }

  const remaining = FREE_TIER_MONTHLY_LIMIT - sub.analyses_used_this_month;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `You've used all ${FREE_TIER_MONTHLY_LIMIT} free analyses this month. Upgrade to Pro for unlimited analyses.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

export async function incrementAnalysisCount(userId: string): Promise<void> {
  const sub = await getUserSubscription(userId);
  if (!sub) return;

  await supabase
    .from('subscriptions')
    .update({
      analyses_used_this_month: sub.analyses_used_this_month + 1,
    })
    .eq('id', sub.id);
}
