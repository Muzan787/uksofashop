-- Review requests after delivery, and reviews from guests.
--
-- Two problems this solves.
--
-- 1. The review form required an account, but customers check out as guests.
--    So the people who actually bought something were the people who could not
--    review it, which is why the site had no genuine reviews at all.
--
-- 2. The "Verified Buyer" badge was rendered on every review unconditionally.
--    Nothing connected a review to an order, so the badge was decorative -
--    and a verified-purchase claim that isn't verified is exactly the kind of
--    thing the DMCC Act 2024 treats as a misleading practice.
--
-- A review is now tied to the order it came from. The badge is derived from
-- that link rather than asserted.

-- Guests have no auth user.
alter table public.reviews
  alter column user_id drop not null;

-- The order this review is about. Set only when the review arrived through a
-- signed link in a post-delivery email, which is what makes it verifiable.
alter table public.reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null;

comment on column public.reviews.order_id is
  'The delivered order this review came from. Non-null means a verified purchase.';

-- One review per product per order. Without this a customer could follow the
-- emailed link repeatedly and post the same review many times.
create unique index if not exists reviews_one_per_order_product
  on public.reviews (order_id, product_id)
  where order_id is not null;

-- When the order was actually delivered, so the request can be sent a few days
-- later rather than in the same hour. status alone carries no timestamp.
alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists review_request_sent_at timestamptz;

comment on column public.orders.delivered_at is
  'Set the first time the order reaches delivered. Drives the review-request delay.';
comment on column public.orders.review_request_sent_at is
  'Set once the review request has gone out. Null means not yet sent.';

-- Existing orders are backfilled as already-requested so that turning this on
-- does not email every past customer at once.
update public.orders
set review_request_sent_at = coalesce(review_request_sent_at, now())
where created_at < now();
