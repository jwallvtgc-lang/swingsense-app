-- Idempotency table for the RevenueCat webhook handler (POST /webhooks/revenuecat).
-- RevenueCat retries webhook delivery on any non-2xx response and can occasionally
-- redeliver an already-successful event, so each event.id is recorded here the first
-- time it's handled; a redelivery is detected via a duplicate-key conflict and skipped
-- without reprocessing.
--
-- Written only by the backend's service-role key — no grants to anon/authenticated,
-- and RLS with no policies denies all client access by default.

create table if not exists public.processed_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_webhook_events enable row level security;
