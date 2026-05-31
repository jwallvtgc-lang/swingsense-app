-- Coaching traces table for tracking Claude API calls and coaching output analysis
create table coaching_traces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users,
  swing_id uuid,
  call_type text, -- 'main_analysis' | 'drill_coach' | 'progress_coach' | 'personal_best'
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

-- Indexes for performance and filtering
create index coaching_traces_eval_score_idx on coaching_traces(eval_score) where eval_score is null;
create index coaching_traces_call_type_idx on coaching_traces(call_type);
create index coaching_traces_created_at_idx on coaching_traces(created_at desc);