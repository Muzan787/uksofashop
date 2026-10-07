-- Cover the thirteen foreign keys that had no leading index.
--
-- Postgres creates an index for a PRIMARY KEY and for UNIQUE, but never for a
-- FOREIGN KEY. Every one of these columns is something the app joins or
-- filters on, and four of them are on the storefront's hottest path:
--
--   product_variants.product_id    every listing card and every product page
--   product_categories.category_id every category page
--   products.category_id           the canonical URL for a product
--   reviews.product_id             the product page's review block
--
-- At 72 products the planner will often still choose a sequential scan
-- because the tables are tiny, and that is fine - the point is that the
-- cost stops being linear in catalogue size. The rest are admin and
-- reporting paths (order lines, the Google outbox, swatch items) where a
-- seq scan is already noticeable on a page that loads forty orders at once.
--
-- An unindexed FK also makes DELETE on the parent slow, because Postgres has
-- to scan the child table to enforce the constraint. Deleting a product
-- currently scans product_variants, reviews, wishlist and order_items in
-- full.
--
-- IF NOT EXISTS throughout so this is safe to re-run.

-- ── Storefront ──────────────────────────────────────────────────────────
create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);

create index if not exists product_categories_category_id_idx
  on public.product_categories (category_id);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists reviews_product_id_idx
  on public.reviews (product_id);

create index if not exists categories_parent_id_idx
  on public.categories (parent_id);

-- ── Orders and the admin panel ──────────────────────────────────────────
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_variant_id_idx
  on public.order_items (variant_id);

create index if not exists order_items_fabric_id_idx
  on public.order_items (fabric_id);

-- ── Customer accounts ───────────────────────────────────────────────────
create index if not exists reviews_user_id_idx
  on public.reviews (user_id);

create index if not exists wishlist_product_id_idx
  on public.wishlist (product_id);

-- ── Samples and conversion reporting ────────────────────────────────────
create index if not exists swatch_request_items_fabric_id_idx
  on public.swatch_request_items (fabric_id);

create index if not exists google_conversion_outbox_receipt_id_idx
  on public.google_conversion_outbox (receipt_id);

create index if not exists google_order_consent_receipt_id_idx
  on public.google_order_consent (receipt_id);
