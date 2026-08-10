import { supabase } from '../config/supabase';

export interface TierConfig {
  tier: string;
  analysis_limit: number | null;   // null = unlimited
  analysis_period: 'weekly' | 'monthly' | null;
  carousel_drill_count: number | null;
  library_drill_count: number | null;
  action_plan_frequency: string;
  updated_at: string;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Module-level cache — refreshed at most once per TTL window.
// A DB update propagates to running sessions within 5 minutes without a cold start.
let cache: Map<string, TierConfig> | null = null;
let cacheExpiry = 0;
let pending: Promise<Map<string, TierConfig>> | null = null;

async function loadAll(): Promise<Map<string, TierConfig>> {
  if (cache && Date.now() < cacheExpiry) return cache;
  if (pending) return pending;
  const p = (async () => {
    const { data } = await supabase.from('subscription_tiers').select('*');
    const map = new Map<string, TierConfig>(
      (data ?? []).map((row) => [row.tier as string, row as TierConfig])
    );
    cache = map;
    cacheExpiry = Date.now() + TTL_MS;
    pending = null;
    return map;
  })();
  pending = p;
  return p;
}

export async function getTierConfig(tier: string): Promise<TierConfig | null> {
  const configs = await loadAll();
  return configs.get(tier) ?? null;
}

export async function getAllTierConfigs(): Promise<Map<string, TierConfig>> {
  return loadAll();
}
