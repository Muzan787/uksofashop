-- Applied in production on 14 Nov 2026 while diagnosing the 30-day timeout:
-- force a hash join for the summary function. Superseded by
-- 20261114150000_journey_session_rollup.sql, whose CREATE OR REPLACE clears it.
alter function public.admin_website_summary(timestamptz, timestamptz, text, text) set enable_nestloop = off;
