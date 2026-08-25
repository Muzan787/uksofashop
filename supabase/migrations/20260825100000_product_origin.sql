-- Per-product country of origin, so a "Made in the UK" badge can appear only
-- where it is true.
--
-- The site previously claimed British manufacture across every shared surface -
-- header, footer, homepage, entry animation and every product page - which is
-- not substantiable: the recliner ranges are imported. Country-of-origin claims
-- have to be evidenced under the CAP Code, so the claim now lives per product
-- rather than as a sitewide badge.
--
--   'uk'          -> renders the "Made in the UK" badge
--   'imported'    -> renders nothing
--   'unspecified' -> renders nothing (the safe default for anything new)
--
-- Anything other than 'uk' is silent rather than labelled, so a product added
-- without thinking about origin never makes a claim by accident.

alter table public.products
  add column if not exists origin text not null default 'unspecified';

alter table public.products
  drop constraint if exists products_origin_check;
alter table public.products
  add constraint products_origin_check
  check (origin in ('uk', 'imported', 'unspecified'));

comment on column public.products.origin is
  'Country of manufacture for the "Made in the UK" badge. Only ''uk'' displays a claim; everything else renders nothing. Must be evidenced before setting to ''uk''.';

-- Recliners are imported; the Verona fabric range is UK-made.
update public.products set origin = 'imported'
where title ilike 'Nova%'
   or title ilike 'Orlando%'
   or title ilike 'Oxford%'
   or title ilike 'Roma%'
   or title ilike 'Hannah%';

update public.products set origin = 'uk'
where title ilike 'Verona%';
