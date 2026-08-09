-- Fix swing_analyses RLS policies broken by AI-147 (profiles.id now differs from auth.uid()).
-- The original policies used auth.uid() = user_id, which always fails for new accounts
-- because swing_analyses.user_id = profiles.id (set by createAnalysisRecord) and
-- profiles.id is now a client-generated UUID independent of the auth UUID.
-- All four policies now join through profile_relationships to resolve auth.uid() → profiles.id.
--
-- GRANT STATUS (confirmed from migrations 001 + 002 — no gaps):
--   SELECT  ✓  migration 001
--   INSERT  ✓  migration 001
--   UPDATE  ✓  migration 001
--   DELETE  ✓  migration 002
-- No additional grants needed.

-- 1. Ensure RLS is on (idempotent — safe if already enabled)
alter table public.swing_analyses enable row level security;

-- 2. Drop broken policies
drop policy if exists "Users can view own analyses" on public.swing_analyses;
drop policy if exists "Users can insert own analyses" on public.swing_analyses;
drop policy if exists "Users can update own analyses" on public.swing_analyses;
drop policy if exists "Users can delete own analyses" on public.swing_analyses;

-- 3. Replacement policies via profile_relationships

create policy "Users can view own analyses"
  on public.swing_analyses for select
  using (
    exists (
      select 1 from public.profile_relationships
      where profile_relationships.profile_id = swing_analyses.user_id
        and profile_relationships.account_id = auth.uid()
    )
  );

create policy "Users can insert own analyses"
  on public.swing_analyses for insert
  with check (
    exists (
      select 1 from public.profile_relationships
      where profile_relationships.profile_id = swing_analyses.user_id
        and profile_relationships.account_id = auth.uid()
    )
  );

create policy "Users can update own analyses"
  on public.swing_analyses for update
  using (
    exists (
      select 1 from public.profile_relationships
      where profile_relationships.profile_id = swing_analyses.user_id
        and profile_relationships.account_id = auth.uid()
    )
  );

create policy "Users can delete own analyses"
  on public.swing_analyses for delete
  using (
    exists (
      select 1 from public.profile_relationships
      where profile_relationships.profile_id = swing_analyses.user_id
        and profile_relationships.account_id = auth.uid()
    )
  );
