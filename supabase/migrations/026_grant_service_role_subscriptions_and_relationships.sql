-- The RevenueCat webhook handler (backend/server.py: revenuecat_webhook) is the
-- first thing in this codebase to write to subscriptions/read profile_relationships
-- using a service_role key — every prior write path went through client-side
-- authenticated/anon RLS grants instead. Neither table has ever had explicit
-- service_role grants, so the webhook's writes were failing with 42501
-- "permission denied", the same bug class as 020/021/025.
--
-- subscriptions needs SELECT in addition to UPDATE because PostgREST's
-- `Prefer: return=representation` performs an UPDATE ... RETURNING *, which
-- requires SELECT on the returned columns as well as UPDATE on the set columns.

grant select on public.profile_relationships to service_role;
grant select, update on public.subscriptions to service_role;
