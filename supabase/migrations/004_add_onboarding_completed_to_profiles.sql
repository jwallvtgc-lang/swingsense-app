-- Track multi-step onboarding completion (app gates main tabs until true).
alter table public.profiles
  add column if not exists onboarding_completed boolean;

comment on column public.profiles.onboarding_completed is
  'When true, user finished onboarding. Null/false = show onboarding flow.';

-- Grandfather existing profiles (already using the app) as complete.
update public.profiles
set onboarding_completed = true
where onboarding_completed is null;
