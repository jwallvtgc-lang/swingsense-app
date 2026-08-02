alter table public.profiles
  add column if not exists gave_coppa_consent boolean not null default false,
  add column if not exists consent_given_at timestamptz;
