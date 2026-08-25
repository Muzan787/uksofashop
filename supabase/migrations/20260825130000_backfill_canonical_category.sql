-- Backfill products.category_id, the single canonical category that decides a
-- product's URL.
--
-- Every product had category_id = NULL and was linked only through
-- product_categories. Both the sitemap and the Google Merchant feed resolved
-- the category through this column, so both fell back to placeholders -
-- /shop/all/{slug} and /shop/uncategorized/{slug} respectively - while site
-- navigation used the real category. Three indexable URLs per product, all
-- rendering the same page and competing with each other.
--
-- product_categories still says where a product can be BROWSED.
-- products.category_id says where it LIVES.
--
-- The priority below mirrors CATEGORY_PRIORITY in src/utils/productUrl.ts:
-- most specific descriptor first, material last, because the material is
-- already obvious on the product page. It only decides the INITIAL value -
-- after this, category_id is editable per product from the admin panel, and
-- addProduct/updateProduct set it for anything new.

with priority(slug, rank) as (values
  ('electric-sofa', 1),
  ('recliner',      2),
  ('corner-sofa',   3),
  ('3+2-Seater',    4),
  ('fabric-sofa',   5),
  ('leather-sofa',  6)
),
pick as (
  select distinct on (p.id)
         p.id as product_id,
         c.id as category_id
  from public.products p
  join public.product_categories pc on pc.product_id = p.id
  join public.categories c          on c.id = pc.category_id
  left join priority pr             on pr.slug = c.slug
  -- coalesce so a category not in the list still sorts last but deterministically
  order by p.id, coalesce(pr.rank, 99), c.slug
)
update public.products p
set category_id = pick.category_id
from pick
where p.id = pick.product_id
  and p.category_id is distinct from pick.category_id;
