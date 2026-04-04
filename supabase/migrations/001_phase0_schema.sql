-- SwingSense Phase 0 Schema
-- All Phase 0 tables + placeholder tables for future-proofing

-- ============================================================
-- PHASE 0 TABLES (actively used)
-- ============================================================

-- profiles: extends auth.users, created during onboarding
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  age integer not null check (age >= 5 and age <= 99),
  primary_position text not null check (primary_position in (
    'catcher', 'first_base', 'second_base', 'shortstop',
    'third_base', 'outfield', 'pitcher', 'dh_utility'
  )),
  height_feet integer check (height_feet >= 3 and height_feet <= 7),
  height_inches integer check (height_inches >= 0 and height_inches <= 11),
  batting_side text not null check (batting_side in ('left', 'right', 'switch')),
  role text not null default 'player' check (role in ('player', 'coach', 'team_admin')),
  leaderboard_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- swing_analyses: one row per uploaded swing — the core table
create table public.swing_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_url text not null,
  video_duration_seconds numeric,
  keypoint_data jsonb,
  coaching_output jsonb,
  bat_speed_mph numeric,
  similarity_score integer check (similarity_score >= 0 and similarity_score <= 100),
  similarity_breakdown jsonb,
  key_frames jsonb,
  status text not null default 'uploading' check (status in (
    'uploading', 'processing', 'completed', 'failed'
  )),
  created_at timestamptz not null default now()
);

create index idx_swing_analyses_user_date
  on public.swing_analyses (user_id, created_at desc);

-- subscriptions: one row per user, synced from RevenueCat
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  revenuecat_customer_id text not null default '',
  tier text not null default 'free' check (tier in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  analyses_used_this_month integer not null default 0,
  month_reset_date timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- activity_log: event-driven tracking for achievements engine
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'analysis_completed', 'score_improved', 'bat_speed_recorded',
    'login', 'profile_updated'
  )),
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_user_date
  on public.activity_log (user_id, created_at desc);

-- ============================================================
-- PLACEHOLDER TABLES (create now, populate in Phase 1/2)
-- ============================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'coach', 'admin')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table public.drills (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  instructions text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category text not null check (category in (
    'hip_rotation', 'weight_transfer', 'bat_path', 'contact_point', 'general'
  )),
  video_url text,
  created_at timestamptz not null default now()
);

create table public.user_drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  drill_id uuid not null references public.drills(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5),
  is_favorite boolean not null default false,
  completed_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  badge_image_url text,
  criteria jsonb not null,
  requires_pro boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  total_analyses integer not null default 0,
  best_similarity_score integer,
  best_bat_speed_mph numeric,
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  total_drills_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feedback_type text not null check (feedback_type in (
    'bug', 'feature_request', 'coaching_question', 'general'
  )),
  message text not null,
  analysis_rating integer check (analysis_rating >= 1 and analysis_rating <= 5),
  contact_opt_in boolean not null default false,
  status text not null default 'received' check (status in ('received', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.swing_analyses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activity_log enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.drills enable row level security;
alter table public.user_drills enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_stats enable row level security;
alter table public.feedback enable row level security;

-- profiles: users can read and update only their own row
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- swing_analyses: users can read and insert only their own rows
create policy "Users can view own analyses"
  on public.swing_analyses for select using (auth.uid() = user_id);
create policy "Users can insert own analyses"
  on public.swing_analyses for insert with check (auth.uid() = user_id);
create policy "Users can update own analyses"
  on public.swing_analyses for update using (auth.uid() = user_id);

-- subscriptions: users can read only their own row
create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- activity_log: users can read only their own rows
create policy "Users can view own activity"
  on public.activity_log for select using (auth.uid() = user_id);
create policy "Users can insert own activity"
  on public.activity_log for insert with check (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

create trigger user_stats_updated_at
  before update on public.user_stats
  for each row execute function public.handle_updated_at();

-- Auto-create subscription and user_stats rows on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id);

  insert into public.user_stats (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ============================================================
-- TABLE GRANTS
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.swing_analyses to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.activity_log to authenticated;
grant select on public.teams to authenticated;
grant select on public.team_members to authenticated;
grant select on public.drills to authenticated;
grant select on public.user_drills to authenticated;
grant select on public.achievements to authenticated;
grant select on public.user_achievements to authenticated;
grant select on public.user_stats to authenticated;
grant select, insert on public.feedback to authenticated;
grant select on public.profiles to anon;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('swing-videos', 'swing-videos', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own videos" on storage.objects;
create policy "Users can upload own videos"
  on storage.objects for insert
  with check (bucket_id = 'swing-videos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view own videos" on storage.objects;
create policy "Users can view own videos"
  on storage.objects for select
  using (bucket_id = 'swing-videos' and auth.uid()::text = (storage.foldername(name))[1]);
