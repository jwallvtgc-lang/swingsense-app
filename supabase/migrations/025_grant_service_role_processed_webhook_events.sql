-- 024_add_processed_webhook_events.sql enabled RLS on this table but never
-- granted service_role any table-level privileges — BYPASSRLS skips RLS
-- policies, it does not substitute for a missing GRANT. This caused every
-- webhook call to fail with 42501 "permission denied for table
-- processed_webhook_events", independent of which key/header was used.

grant select, insert on public.processed_webhook_events to service_role;
