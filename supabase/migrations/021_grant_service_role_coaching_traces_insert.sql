-- 007_recreate_coaching_traces.sql granted select/insert/update to `authenticated` only,
-- despite its own comment claiming "service_role bypasses RLS and can insert regardless
-- of policies" — RLS-bypass does not substitute for a missing table-level GRANT.
-- backend/server.py's write_coaching_trace() POSTs (inserts) using
-- SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY as its first-choice credential, which
-- resolves to the service_role Postgres role — grant it the INSERT it actually needs.
-- Whether this has been silently failing in production (the function swallows all errors
-- into a log line, never raising) is unconfirmed — tracked separately, not assumed here.
grant insert on public.coaching_traces to service_role;
