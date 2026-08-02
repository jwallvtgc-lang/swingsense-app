-- Documentation migration: captures the profile_relationships table added during AI-144.
-- Already exists in production (13 rows, all relationship_type='self', from one-time backfill).
-- Nothing in the app writes to this table yet — AI-147 Stage 1+ will wire it up.
-- Safe to run against a database that already has this table: CREATE TABLE IF NOT EXISTS.

create table if not exists public.profile_relationships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id),
  profile_id uuid not null references public.profiles(id),
  relationship_type text not null check (relationship_type in ('self', 'parent')),
  is_payer boolean not null default false,
  gave_coppa_consent boolean not null default false,
  consent_given_at timestamptz,
  created_at timestamptz default now(),
  unique (account_id, profile_id)
);

alter table public.profile_relationships enable row level security;

drop policy if exists "Users can view own relationships" on public.profile_relationships;
create policy "Users can view own relationships"
  on public.profile_relationships for select using (auth.uid() = account_id);

drop policy if exists "Users can insert own relationships" on public.profile_relationships;
create policy "Users can insert own relationships"
  on public.profile_relationships for insert with check (auth.uid() = account_id);

drop policy if exists "Users can update own relationships" on public.profile_relationships;
create policy "Users can update own relationships"
  on public.profile_relationships for update using (auth.uid() = account_id);

grant select, insert, update on public.profile_relationships to authenticated;
