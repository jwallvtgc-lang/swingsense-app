create table if not exists public.drills (
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

alter table public.drills enable row level security;

create policy "Drills are publicly readable"
  on public.drills
  for select
  using (true);
