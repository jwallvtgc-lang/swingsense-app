import { supabase } from '../config/supabase';
import { Subscription } from '../types';
import { getTierConfig } from './tierConfig';

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

  // No subscription row yet — treat as free tier
  if (!sub) {
    const freeCfg = await getTierConfig('free');
    return { allowed: true, remaining: freeCfg?.analysis_limit ?? 3 };
  }

  // Lapsed subscriptions (expired/cancelled) fall back to free-tier limits
  const effectiveTier = sub.status === 'active' ? sub.tier : 'free';
  const cfg = await getTierConfig(effectiveTier);

  // Unlimited tier (analysis_limit === null)
  if (cfg?.analysis_limit == null) {
    return { allowed: true };
  }

  // Limited tier — derive window size and label from config
  const limit = cfg.analysis_limit;
  const periodDays = cfg.analysis_period === 'monthly' ? 30 : 7;
  const periodLabel = cfg.analysis_period === 'monthly' ? 'month' : 'week';

  // Column names (analyses_used_this_month, month_reset_date) are legacy — they represent
  // a rolling window whose length is now determined by analysis_period from config.
  const now = new Date();
  const resetDate = new Date(sub.month_reset_date);

  if (now >= resetDate) {
    // Advance from stored reset date (not from now) to prevent drift.
    const nextResetDate = new Date(resetDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
    await supabase
      .from('subscriptions')
      .update({
        analyses_used_this_month: 0,
        month_reset_date: nextResetDate.toISOString(),
      })
      .eq('id', sub.id);
    return { allowed: true, remaining: limit };
  }

  const remaining = limit - sub.analyses_used_this_month;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `You've used all ${limit} analyses this ${periodLabel}. Upgrade to continue.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

export async function incrementAnalysisCount(userId: string): Promise<void> {
  const sub = await getUserSubscription(userId);
  if (!sub) return;

  // Skip counter for unlimited tiers — the count is never checked for them.
  const cfg = await getTierConfig(sub.tier);
  if (cfg?.analysis_limit == null) return;

  await supabase
    .from('subscriptions')
    .update({
      analyses_used_this_month: sub.analyses_used_this_month + 1,
    })
    .eq('id', sub.id);
}
