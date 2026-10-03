-- A sub collection IS a variant group, so every sofa has to be in one.
--
-- /collection/<main> draws a card per sub collection, and four active products
-- belonged to no group at all: Bishop, Orlando, Oxford and the Sims Footstool.
-- Those were falling through to a second "every other design" grid, which made
-- the page tell two stories about what a sub collection is. One rule now: a
-- variant group is a sub collection, one to one, whatever its size.
--
-- WHICH GROUP a loose product joins is decided by the first word of its title,
-- which is how this catalogue is actually named — Verona, Ashton, Roma, Sims.
-- A product whose first word already names a group joins it; the rest get a
-- group of their own, named for that word. Rename them in the admin panel if
-- you want the house "<Name> Sofa" form; the id is what everything joins on.
insert into public.variant_groups (name, slug)
select v.name, v.slug
from (values ('Bishop', 'bishop'), ('Orlando', 'orlando'), ('Oxford', 'oxford')) as v(name, slug)
where not exists (
  select 1 from public.variant_groups g where g.slug = v.slug
);

-- Matched on the first word of the group's name against the first word of the
-- product's title. Every group's first word is distinct across the catalogue,
-- so this cannot land a product in the wrong one.
--
-- No size_label is set. A group member without one is simply absent from the
-- size picker, so nothing on these four product pages changes — they appear in
-- their sub collection and nowhere else. Give them a label in the admin panel
-- to turn them into size options within the range.
--
-- is_active only: the inactive "Test" row is not a sofa and would mint a
-- "Test" sub collection out of nothing.
update public.products p
set variant_group_id = g.id
from public.variant_groups g
where p.variant_group_id is null
  and p.is_active
  and lower(split_part(btrim(p.title), ' ', 1)) = lower(split_part(g.name, ' ', 1));
