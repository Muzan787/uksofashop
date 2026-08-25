-- Purchase conversions move from order placement to order confirmation.
--
-- Roughly a quarter of cash-on-delivery orders are never completed, so firing
-- Purchase the moment the checkout form submits overstated reported revenue by
-- about a third and taught the ad platforms to find more people who place
-- orders rather than more people who pay. Confirmation happens within minutes,
-- so moving the event there costs nothing in attribution window or learning
-- phase while removing most of that noise.
--
-- These columns make the send idempotent. An admin can move an order between
-- statuses freely - confirmed -> shipped -> back to confirmed - and each
-- conversion is still reported exactly once. Without them, every toggle would
-- send another Purchase and inflate the numbers again in a new way.

alter table public.orders
  -- Stable id for deduplication. Fixed per order, so a retry after a network
  -- failure can never be counted as a second conversion.
  add column if not exists purchase_event_id uuid not null default gen_random_uuid(),
  add column if not exists purchase_event_sent_at timestamptz,
  add column if not exists delivered_event_sent_at timestamptz;

comment on column public.orders.purchase_event_id is
  'Deduplication id sent to Meta CAPI and GA4 for the Purchase conversion.';
comment on column public.orders.purchase_event_sent_at is
  'Set once the Purchase conversion has been reported. Null means not yet sent.';
comment on column public.orders.delivered_event_sent_at is
  'Set once the delivered (true revenue) event has been reported.';

-- Existing orders predate conversion tracking; mark them as already reported
-- so that touching an old order does not fire a conversion for it now.
update public.orders
set purchase_event_sent_at = coalesce(purchase_event_sent_at, now()),
    delivered_event_sent_at = coalesce(delivered_event_sent_at, now())
where created_at < now();
