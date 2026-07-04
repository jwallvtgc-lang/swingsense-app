-- Recreate coaching_traces with explicit schema, RLS, and grants.
-- Migration 006 created the table without RLS or grants, blocking
-- REST API writes even with a valid service role key.

drop table if exists public.coaching_traces cascade;

create table public.coaching_traces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users,
  swing_id uuid,
  call_type text,
  experience_level text,
  computed_metrics jsonb,
  full_prompt text,
  raw_response text,
  parsed_primary_issue text,
  parsed_cue text,
  parsed_drill text,
  parsed_summary text,
  latency_ms integer,
  model_version text,
  prompt_version text,
  eval_score text,
  eval_flags jsonb,
  manually_reviewed boolean default false,
  reviewer_notes text
);

create index coaching_traces_eval_score_idx
  on public.coaching_traces(eval_score) where eval_score is null;
create index coaching_traces_call_type_idx
  on public.coaching_traces(call_type);
create index coaching_traces_created_at_idx
  on public.coaching_traces(created_at desc);
create index coaching_traces_user_id_idx
  on public.coaching_traces(user_id);

-- Enable RLS. Backend writes use service_role key which bypasses RLS automatically.
-- No user-facing insert/update policy — coaching traces are internal records only.
alter table public.coaching_traces enable row level security;

-- Grants matching 001_phase0_schema.sql pattern.
-- service_role bypasses RLS and can insert regardless of policies.
grant select, insert, update on public.coaching_traces to authenticated;
