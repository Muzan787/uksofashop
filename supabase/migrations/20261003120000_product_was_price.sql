-- The "was" price, and the only thing a discount is on this catalogue.
--
-- NOTHING HERE IS A PRICE. products.base_price stays the single figure the
-- checkout calculator reads, and place_order still re-prices every line from
-- base_price + price_adjustment and rejects the order if the browser's total
-- disagrees. was_price is a claim about the past: it is struck through beside
-- the live price and turned into a rounded percentage, and it is never added
-- to or taken off any total, anywhere. That is deliberate — a discount
-- implemented as a second price is a discount that can be bypassed, and this
-- shop's money comes off the order through the offer engine, which already
-- has a database calculator of its own (see offer_* tables).
--
-- NULL is the normal state and means "no discount": every storefront surface
-- draws exactly what it drew before.
alter table public.products
  add column if not exists was_price numeric(10,2);

-- A was price at or below the live price would render as "0% off", or as a
-- saving the wrong way round. Rather than teach eight storefront surfaces to
-- each distrust the column, the row is not allowed to say it. The admin form
-- catches this first with a sentence the shop owner can act on; this is the
-- backstop for anything that writes the column another way.
alter table public.products
  drop constraint if exists products_was_price_above_base;

alter table public.products
  add constraint products_was_price_above_base
  check (was_price is null or was_price > base_price);

comment on column public.products.was_price is
  'Display-only previous price, struck through beside base_price with a rounded percent off. NULL means no discount is shown. Must exceed base_price - see products_was_price_above_base. Never read by place_order.';
