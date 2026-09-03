alter table public.profiles
  add column if not exists ai_data_consent boolean not null default false,
  add column if not exists ai_data_consent_at timestamptz;
