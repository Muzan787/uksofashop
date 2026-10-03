-- Main collections: the layer above the sets.
--
-- /collection has been a flat list of variant_groups - "Verona Sofa",
-- "Roma Recliner" - which is one honest level of a catalogue that actually has
-- two. A made-to-order Verona and an imported Roma recliner are not the same
-- kind of purchase, and the shop is about to sell dining sets and wardrobes
-- that are not sofas at all. So a main collection sits above the sets, and
-- every product belongs to exactly one.
--
-- A main collection is not a category. categories answer "what shape of sofa
-- is this" and decide the product's URL; this answers "which part of the shop
-- is it from", and is what the front page of /collection is now made of. The
-- two are deliberately separate - Corner Sofas contains both imported and
-- made-to-order frames, and always will.
--
-- SLUGS SHARE A NAMESPACE WITH variant_groups.slug, because /collection/[slug]
-- resolves a main collection first and falls back to a set. Nothing enforces
-- that across the two tables; the route is deterministic about which wins, and
-- the seeded slugs below collide with nothing.
create table if not exists public.main_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  /** One sentence under the name on its own page. */
  standfirst text,
  /**
   * 'live' renders a card that links through to the collection.
   * 'coming_soon' renders an inert one - named, blurred, and with no
   * destination, because a card that navigates to an empty page is worse than
   * a card that admits there is nothing there yet.
   */
  status text not null default 'coming_soon' check (status in ('live', 'coming_soon')),
  /** Hand-ordered: the shop's own idea of what to show first, not alphabetical. */
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists main_collection_id uuid
  references public.main_collections(id) on delete set null;

create index if not exists products_main_collection_id_idx
  on public.products (main_collection_id);

-- Same shape as categories and variant_groups: anyone may read it, only an
-- admin may write it.
alter table public.main_collections enable row level security;

drop policy if exists "public read main_collections" on public.main_collections;
create policy "public read main_collections"
  on public.main_collections for select
  to public using (true);

drop policy if exists "admin write main_collections" on public.main_collections;
create policy "admin write main_collections"
  on public.main_collections for all
  to authenticated using (is_admin()) with check (is_admin());

-- The five the shop is organised around. Three have nothing in them yet and
-- say so.
insert into public.main_collections (slug, name, standfirst, status, position)
values
  ('imported-sofas', 'Imported Sofas',
   'Recliners and electric frames, built abroad and held in stock — the ones that arrive in days rather than weeks.',
   'live', 1),
  ('made-to-order-sofas', 'Made-To-Order Sofas',
   'Every frame we build ourselves, in any of the fabrics in the library, to the size your room actually is.',
   'live', 2),
  ('dining-sets', 'Dining Sets', null, 'coming_soon', 3),
  ('wardrobes', 'Wardrobes', null, 'coming_soon', 4),
  ('sofa-beds', 'Sofa Beds', null, 'coming_soon', 5)
on conflict (slug) do nothing;

-- The split the catalogue already encodes. origin = 'imported' is exactly the
-- thirteen recliners - five manual Roma, eight electric - and custom_made is
-- true on every one of the rest, so this is a restatement of the existing data
-- rather than a new judgement about it.
update public.products p
set main_collection_id = m.id
from public.main_collections m
where m.slug = 'imported-sofas'
  and p.origin = 'imported'
  and p.main_collection_id is null;

update public.products p
set main_collection_id = m.id
from public.main_collections m
where m.slug = 'made-to-order-sofas'
  and p.origin is distinct from 'imported'
  and p.main_collection_id is null;
