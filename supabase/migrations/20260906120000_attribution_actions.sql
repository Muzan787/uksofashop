-- A lightweight, commercially-meaningful action ledger.
--
-- Deliberately NOT a clickstream: only the handful of actions that matter to
-- a marketing attribution report get a row. Scroll depth, hovers and
-- cosmetic clicks never reach this table. See
-- docs/TRACKING_V2_EXPORT_CONTRACT.md for how this feeds a future Attribution
-- Ledger sheet.
--
-- Written from application code as each of these actions already happens
-- (product mount, add-to-cart, checkout start, WhatsApp click, order
-- placement) - no new writer is added by this migration itself, and rows are
-- best-effort: a failure to insert here must never block the action it is
-- describing.

create table if not exists public.attribution_actions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  visitor_id     uuid,
  session_id     uuid,
  arrival_id     uuid,

  action_type    text not null check (action_type in (
    'arrival', 'product_view', 'add_to_cart', 'checkout_start',
    'whatsapp_click', 'call_click', 'order_placed'
  )),

  page_url       text,

  product_id     uuid,
  variant_id     uuid,

  whatsapp_reference text,
  order_id       uuid references public.orders(id),

  metadata       jsonb
);

create index if not exists attribution_actions_session_id_idx
  on public.attribution_actions (session_id);
create index if not exists attribution_actions_visitor_id_idx
  on public.attribution_actions (visitor_id);
create index if not exists attribution_actions_action_type_idx
  on public.attribution_actions (action_type);
create index if not exists attribution_actions_created_at_idx
  on public.attribution_actions (created_at);
create index if not exists attribution_actions_order_id_idx
  on public.attribution_actions (order_id) where order_id is not null;

alter table public.attribution_actions enable row level security;
revoke all on public.attribution_actions from anon, authenticated;

comment on table public.attribution_actions is
  'Commercially-meaningful action ledger (arrival/view/cart/checkout/contact/'
  'order), not a full clickstream. See docs/TRACKING_V2_EXPORT_CONTRACT.md.';
