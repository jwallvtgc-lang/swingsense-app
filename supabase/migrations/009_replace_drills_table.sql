-- Replace legacy drills table (migration 001 schema) with Action Plan schema.
-- The 001 table had: title, description, instructions, difficulty, category
-- Migration 008 used CREATE TABLE IF NOT EXISTS so it was silently a no-op.
-- Drop and recreate with the correct schema, then restore grants and RLS.

-- Drop old table; CASCADE removes the FK constraint from user_drills
-- (user_drills rows are safe — only the constraint is dropped, not the table)
drop table if exists public.drills cascade;

-- Recreate with Action Plan schema
create table public.drills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mechanic text,
  secondary_mechanics text[],
  modalities text[] not null default '{}',
  foundation text not null,
  setup text not null,
  focus_points text not null,
  finish_reminders text not null,
  purpose text not null,
  video_url text,
  experience_level text not null default 'all',
  created_at timestamptz default now()
);

-- Restore FK from user_drills
alter table public.user_drills
  add constraint user_drills_drill_id_fkey
  foreign key (drill_id) references public.drills(id) on delete cascade;

-- RLS
alter table public.drills enable row level security;

drop policy if exists "Drills are publicly readable" on public.drills;
create policy "Drills are publicly readable"
  on public.drills
  for select
  using (true);

-- Grants — anon for future unauthenticated browsing; authenticated for in-app use
grant select on public.drills to anon, authenticated;
