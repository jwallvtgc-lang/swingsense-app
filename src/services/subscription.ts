import { supabase } from '../config/supabase';
import { Subscription } from '../types';
import { FREE_TIER_WEEKLY_LIMIT } from '../config/constants';

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
    return { allowed: true, remaining: FREE_TIER_WEEKLY_LIMIT };
  }

  if (sub.tier === 'pro' && sub.status === 'active') {
    return { allowed: true };
  }

  const now = new Date();
  // Column names (analyses_used_this_month, month_reset_date) are legacy — they represent
  // a 7-day rolling window, not a calendar month. A column rename migration would clarify this.
  const resetDate = new Date(sub.month_reset_date);
  if (now >= resetDate) {
    // Advance exactly 7 days from the stored reset date, not from now, to prevent drift:
    // anchoring to the stored date means a user who delays opening the app doesn't gain
    // extra analyses (their next window still starts from the last reset boundary).
    const nextResetDate = new Date(resetDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    await supabase
      .from('subscriptions')
      .update({
        analyses_used_this_month: 0,
        month_reset_date: nextResetDate.toISOString(),
      })
      .eq('id', sub.id);

    return { allowed: true, remaining: FREE_TIER_WEEKLY_LIMIT };
  }

  const remaining = FREE_TIER_WEEKLY_LIMIT - sub.analyses_used_this_month;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `You've used all ${FREE_TIER_WEEKLY_LIMIT} free analyses this week. Upgrade to continue.`,
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
