-- ============================================
-- SWINGSENSE KEY METRICS
-- Run these in Supabase SQL Editor as needed
-- ============================================

-- ============================================
-- BUSINESS METRICS
-- ============================================

-- Total users and weekly signups
select 
  date_trunc('week', created_at) as week,
  count(*) as new_users
from profiles
group by week
order by week desc;

-- Weekly analyses completed
select
  date_trunc('week', created_at) as week,
  count(*) as analyses_completed
from swing_analyses
where status = 'completed'
group by week
order by week desc;

-- Weekly active users (uploaded at least one swing)
select
  date_trunc('week', created_at) as week,
  count(distinct user_id) as active_users
from swing_analyses
where status = 'completed'
group by week
order by week desc;

-- Total users snapshot
select
  count(*) as total_users,
  count(*) filter (where onboarding_completed = true) as onboarded_users,
  count(*) filter (where created_at > now() - interval '7 days') as new_this_week,
  count(*) filter (where created_at > now() - interval '30 days') as new_this_month
from profiles;

-- ============================================
-- PRODUCT METRICS
-- ============================================

-- Onboarding completion rate
select
  count(*) as total_users,
  count(*) filter (where onboarding_completed = true) as completed_onboarding,
  round(count(*) filter (where onboarding_completed = true) * 100.0 / nullif(count(*), 0), 1) as completion_pct
from profiles;

-- Retention — users with more than one swing
select
  count(distinct user_id) as retained_users
from swing_analyses
where status = 'completed'
group by user_id
having count(*) > 1;

-- Average swings per user
select
  round(avg(swing_count), 1) as avg_swings_per_user,
  max(swing_count) as most_swings_single_user,
  count(*) as total_users_with_swings
from (
  select user_id, count(*) as swing_count
  from swing_analyses
  where status = 'completed'
  group by user_id
) counts;

-- Drop-off: users who signed up but never uploaded
select
  count(*) as signed_up_no_swing
from profiles p
where onboarding_completed = true
and not exists (
  select 1 from swing_analyses s
  where s.user_id = p.id
  and s.status = 'completed'
);

-- Feature usage: drill coach interactions
-- (requires activity_log table to be tracking drill_followup calls)
-- Run after wiring activity logging to /drill-followup endpoint

-- ============================================
-- COACHING INSIGHTS
-- ============================================

-- Most common primary mechanical issues
select
  coaching_output->'primary_mechanical_issue'->>'title' as issue,
  count(*) as frequency,
  round(count(*) * 100.0 / sum(count(*)) over (), 1) as pct_of_total
from swing_analyses
where status = 'completed'
and coaching_output is not null
group by issue
order by frequency desc
limit 10;

-- Average scores by experience level
select
  p.experience_level,
  round(avg(s.similarity_score), 1) as avg_overall_score,
  round(avg((s.similarity_breakdown->>'hip_rotation')::numeric), 1) as avg_hip_rotation,
  round(avg((s.similarity_breakdown->>'weight_transfer')::numeric), 1) as avg_weight_transfer,
  round(avg((s.similarity_breakdown->>'head_stability')::numeric), 1) as avg_head_stability,
  count(*) as swing_count
from swing_analyses s
join profiles p on s.user_id = p.id
where s.status = 'completed'
and s.similarity_score is not null
group by p.experience_level
order by avg_overall_score desc;

-- Score improvement over time per user
select
  p.first_name,
  p.experience_level,
  min(s.similarity_score) as starting_score,
  max(s.similarity_score) as best_score,
  max(s.similarity_score) - min(s.similarity_score) as improvement,
  count(*) as total_swings
from swing_analyses s
join profiles p on s.user_id = p.id
where s.status = 'completed'
and s.similarity_score is not null
group by p.id, p.first_name, p.experience_level
having count(*) > 1
order by improvement desc;

-- Weekly score trends (all users)
select
  date_trunc('week', created_at) as week,
  round(avg(similarity_score), 1) as avg_score,
  count(*) as swings_analyzed
from swing_analyses
where status = 'completed'
and similarity_score is not null
group by week
order by week desc;
