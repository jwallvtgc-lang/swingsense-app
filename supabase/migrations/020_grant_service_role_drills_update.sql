-- service_role has only ever had SELECT on public.drills (never explicitly granted
-- write access by 001/008/009) — scripts/generate-drill-thumbnails.js (AI-169) needs
-- UPDATE to write thumbnail_url back onto each drill row.
grant update on public.drills to service_role;
