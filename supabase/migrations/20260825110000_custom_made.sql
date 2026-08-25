-- Flags which products can be made to a customer's own specification.
--
-- We make the fabric ranges to order in a colour, material or size of the
-- customer's choosing. The recliner ranges are imported as-is and cannot be.
-- Until now this was mentioned nowhere on the site at all.
--
-- Defaults to false so a newly added product never advertises made-to-order
-- until someone deliberately ticks it, the same rule as products.origin.
--
-- Note the consequence for returns: a made-to-measure item is exempt from the
-- 14-day cancellation right under the Consumer Contracts Regulations, so this
-- flag also controls where that warning is shown - on the product page, before
-- the customer commits, rather than buried in the terms.

alter table public.products
  add column if not exists custom_made boolean not null default false;

comment on column public.products.custom_made is
  'True where the product can be made to the customer''s own colour, material or size. Drives the "Made to your specification" block and its Consumer Contracts Regulations exemption notice.';

-- The Verona fabric range is made to order. Recliners are not.
update public.products set custom_made = true
where title ilike 'Verona%';
