-- Fix subscriptions RLS policies broken by AI-147 (profiles.id now differs from auth.uid()).
-- The original SELECT policy used auth.uid() = user_id, which always fails for new accounts
-- because subscriptions.user_id = profiles.id (set by handle_new_profile trigger) and
-- profiles.id is now a client-generated UUID independent of the auth UUID.
-- Both policies now join through profile_relationships to resolve auth.uid() → profiles.id.

-- 1. Drop the broken SELECT policy
drop policy if exists "Users can view own subscription" on public.subscriptions;

-- 2. Replacement SELECT policy via profile_relationships
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.profile_relationships
      where profile_relationships.profile_id = subscriptions.user_id
        and profile_relationships.account_id = auth.uid()
    )
  );

-- 3. UPDATE policy (same join logic — required for incrementAnalysisCount and month reset)
create policy "Users can update own subscription"
  on public.subscriptions for update
  using (
    exists (
      select 1 from public.profile_relationships
      where profile_relationships.profile_id = subscriptions.user_id
        and profile_relationships.account_id = auth.uid()
    )
  );

-- 4. Grant UPDATE to authenticated (previously only SELECT was granted)
grant update on public.subscriptions to authenticated;
