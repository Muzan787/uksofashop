-- First-party visitor/session/arrival attribution.
--
-- Additive only: a brand new table, written exclusively from
-- src/app/api/attribution/arrival/route.ts via the service-role client. RLS
-- is enabled with no policies for anon/authenticated, so the only way to read
-- or write this table from the API layer is through that route (writes) or a
-- future admin-authenticated read policy (not added here - nothing in the
-- admin panel reads this table yet).
--
-- One row per arrival_id. A session may contain more than one meaningful
-- arrival (for example a second paid click ten minutes later), so session_id
-- is indexed but deliberately not unique. This preserves every campaign touch
-- without turning the table into a pageview clickstream.

create table if not exists public.attribution_sessions (
  id                    uuid primary key default gen_random_uuid(),

  visitor_id            uuid not null,
  session_id            uuid not null,
  arrival_id            uuid not null,

  created_at            timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),

  first_touch_source    text,
  first_touch_medium    text,
  first_touch_campaign  text,
  first_touch_content   text,
  first_touch_term      text,

  last_touch_source     text,
  last_touch_medium     text,
  last_touch_campaign   text,
  last_touch_content    text,
  last_touch_term       text,

  gclid                 text,
  gbraid                text,
  wbraid                text,
  fbclid                text,

  ga_client_id          text,
  meta_fbp              text,
  meta_fbc              text,

  landing_page          text,
  referrer              text,

  initial_product_id    uuid,
  initial_variant_id    uuid,

  unique (arrival_id)
);

create index if not exists attribution_sessions_visitor_id_idx
  on public.attribution_sessions (visitor_id);
create index if not exists attribution_sessions_session_id_idx
  on public.attribution_sessions (session_id);
create index if not exists attribution_sessions_arrival_id_idx
  on public.attribution_sessions (arrival_id);
create index if not exists attribution_sessions_created_at_idx
  on public.attribution_sessions (created_at);
create index if not exists attribution_sessions_gclid_idx
  on public.attribution_sessions (gclid) where gclid is not null;

alter table public.attribution_sessions enable row level security;
revoke all on public.attribution_sessions from anon, authenticated;

comment on table public.attribution_sessions is
  'First-party visitor/session/arrival attribution, one row per arrival_id. '
  'Written only by the service-role client in api/attribution/arrival/route.ts.';
