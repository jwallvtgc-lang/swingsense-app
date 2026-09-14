alter table public.swing_analyses
  add column if not exists is_bookmarked boolean not null default false;

comment on column public.swing_analyses.is_bookmarked is
  'Player-toggled bookmark on an individual swing analysis, shown in History. Unrelated to user_drills.is_favorite (drill favoriting is a separate mechanism).';
