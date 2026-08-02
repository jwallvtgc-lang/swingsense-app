-- Documentation migration: captures AI-144 changes already applied to production.
-- profiles.id FK to auth.users(id) was dropped and gen_random_uuid() default was added
-- to support the profile_relationships model where one auth account can own multiple profiles.
-- Safe to run against a database that already has these changes applied.

-- Drop the FK constraint from profiles.id → auth.users(id).
-- Auto-generated name from migration 001 CREATE TABLE definition is 'profiles_id_fkey'.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- Add gen_random_uuid() default to profiles.id.
-- SET DEFAULT is idempotent — safe if the default already exists.
alter table public.profiles
  alter column id set default gen_random_uuid();
