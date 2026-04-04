alter table public.profiles
add column if not exists experience_level text
check (
  experience_level is null or experience_level in (
    'Youth',
    'Recreational',
    'Travel Ball',
    'High School',
    'College',
    'Former College or Pro',
    'Coach'
  )
);

comment on column public.profiles.experience_level is
  'Player competitive level — used for AI scoring calibration and coaching tone.';
