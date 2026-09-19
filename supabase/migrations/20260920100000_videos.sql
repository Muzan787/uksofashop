-- Video clips, uploaded from the admin panel and shown on the storefront.
--
-- Three kinds, and the kind decides where a clip appears:
--
--   studio     a product on its own, in the shop. A slide in that product's
--              gallery, after the photographs.
--   customer   a delivered sofa in someone's home, sent to us on WhatsApp.
--              A strip on that product's page, and on /reviews.
--   warehouse  the unit, the van, the workshop. Behind-the-scenes sections
--              on the About and Showroom pages.
--
-- The file itself lives on Cloudinary, the same account as every photograph.
-- `url` is the delivery URL Cloudinary returned; `public_id` is what the
-- Admin API needs to delete it again. The width, height and duration come
-- back from the upload and are kept so the page can draw the right shape of
-- frame before the poster arrives - phone clips are portrait, studio clips
-- are usually landscape.
--
-- Public read is limited to active rows: a clip can be taken off the site
-- without being thrown away.

begin;

create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('studio', 'customer', 'warehouse')),
  product_id  uuid references public.products(id) on delete set null,
  url         text not null,
  public_id   text not null,
  caption     text,
  width       integer,
  height      integer,
  duration    numeric,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.videos is
  'Storefront video clips hosted on Cloudinary. kind decides where a clip shows; product_id ties studio and customer clips to a product.';

create index if not exists videos_product_idx on public.videos (product_id) where is_active;
create index if not exists videos_kind_idx on public.videos (kind) where is_active;

alter table public.videos enable row level security;

drop policy if exists "public read active videos" on public.videos;
create policy "public read active videos"
  on public.videos for select to public using (is_active);

-- The admin list shows hidden clips too, so they can be switched back on.
drop policy if exists "admin read all videos" on public.videos;
create policy "admin read all videos"
  on public.videos for select to authenticated using (is_admin());

drop policy if exists "admin write videos" on public.videos;
create policy "admin write videos"
  on public.videos for all to authenticated
  using (is_admin()) with check (is_admin());

commit;
