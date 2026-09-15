-- Restrict the broad UPDATE grant from 013_fix_subscriptions_rls.sql, which allowed
-- authenticated users to write ANY column on their own subscriptions row — including
-- tier and status — letting a client grant itself Silver/Gold for free via a direct
-- table update, bypassing the App Store and complete_silver_purchase entirely.
--
-- Client code (src/services/subscription.ts: canUserAnalyze, incrementAnalysisCount)
-- only ever legitimately writes analyses_used_this_month and month_reset_date.
-- Column-level grants restrict direct client updates to exactly those two columns;
-- combined with the existing row-ownership RLS policy from 013, tier, status,
-- revenuecat_customer_id, current_period_start, and current_period_end become
-- unwritable via a direct client update.
--
-- complete_silver_purchase (016) is SECURITY DEFINER and runs with the function
-- owner's privileges, not `authenticated`'s — this change does not affect it.

revoke update on public.subscriptions from authenticated;

grant update (analyses_used_this_month, month_reset_date)
  on public.subscriptions
  to authenticated;
