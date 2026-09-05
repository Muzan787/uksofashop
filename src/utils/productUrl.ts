// src/utils/productUrl.ts
//
// One definition of a product's canonical URL, used by the product page, the
// sitemap and the Google Merchant feed.
//
// Before this existed each of those three worked it out separately, and they
// disagreed: the sitemap emitted /shop/all/{slug}, the feed emitted
// /shop/uncategorized/{slug}, and site navigation emitted the real category.
// Three URLs for one product, all rendering the same page, competing with each
// other in search and mismatching what Merchant Centre had been given.
//
// products.category_id is the source of truth - one column, one value, so the
// schema itself guarantees a single canonical path. CATEGORY_PRIORITY is only a
// fallback for rows where that column hasn't been set.

/**
 * Which category wins when a product belongs to several and has no explicit
 * category_id. Most specific descriptor first; material last, because the
 * material is already obvious on the product page itself.
 *
 * These are category SLUGS, not names.
 */
export const CATEGORY_PRIORITY = [
  'electric-sofa',   // Electric Recliners
  'recliner',        // Recliner
  'corner-sofa',     // Corner Settees
  '3-2-seater',      // 3+2 Seaters
  'fabric-sofa',     // Fabric Sofas
  'leather-sofa',    // Leather Sofas
] as const

/** Last resort when a product has no categories at all. */
export const FALLBACK_CATEGORY = 'all'

/**
 * Slugs that have been renamed, mapped old -> new. The category page reads
 * this and issues a permanent redirect, so links published under the old slug
 * (and anything Google has already indexed) keep working and pass their
 * ranking on to the new URL.
 *
 * Keyed by the DECODED path segment, so both /shop/3+2-Seater and
 * /shop/3%2B2-Seater match the same entry.
 */
export const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  '3+2-Seater': '3-2-seater',
  // A "+" in a path segment is read as a space by anything that decodes it as
  // a query string, so the old slug also arrives looking like this.
  '3 2-Seater': '3-2-seater',
}

export interface CategoryRef {
  slug?: string | null
}

/**
 * Pick one category slug from however many a product belongs to.
 * Deterministic: the same input always yields the same URL.
 */
export function pickCanonicalCategorySlug(
  categories: (CategoryRef | null | undefined)[] | null | undefined,
): string {
  const slugs = (categories ?? [])
    .map(c => c?.slug)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)

  if (slugs.length === 0) return FALLBACK_CATEGORY

  for (const preferred of CATEGORY_PRIORITY) {
    if (slugs.includes(preferred)) return preferred
  }

  // A category we don't have a preference for: sort so the answer is still
  // stable rather than depending on row order.
  return [...slugs].sort()[0]
}

/**
 * The canonical path for a product.
 *
 * Slugs are still percent-encoded on the way out. Every current slug is plain
 * ASCII so this is a no-op today, but it keeps the function safe if a category
 * is ever added with a character that needs escaping.
 */
export function productPath(categorySlug: string | null | undefined, productSlug: string): string {
  const cat = categorySlug && categorySlug.length > 0 ? categorySlug : FALLBACK_CATEGORY
  return `/shop/${encodeURIComponent(cat)}/${encodeURIComponent(productSlug)}`
}

/** The two shapes a category can arrive in from a Supabase select. */
export interface ProductCategoryRelations {
  categories?: CategoryRef | CategoryRef[] | null
  product_categories?: { categories?: CategoryRef | CategoryRef[] | null }[] | null
}

/** Every category a query returned for a product, in one flat list. */
function categoryRefs<T extends CategoryRef>(product: {
  categories?: T | T[] | null
  product_categories?: { categories?: T | T[] | null }[] | null
}): T[] {
  const one = (c: T | T[] | null | undefined): T[] =>
    Array.isArray(c) ? c : c ? [c] : []

  return [
    ...one(product.categories),
    ...(product.product_categories ?? []).flatMap(pc => one(pc?.categories)),
  ]
}

/**
 * The one category slug a product's URL is built from.
 *
 * Split out of canonicalProductPath because callers need it on its own: a card
 * that both links to a product and labels it has to name the SAME category it
 * links to, or the badge and the breadcrumb the link lands on disagree.
 */
export function canonicalCategorySlug(product: ProductCategoryRelations): string {
  // 1. products.category_id, the designated primary category.
  const direct = Array.isArray(product.categories) ? product.categories[0] : product.categories
  if (direct?.slug) return direct.slug

  // 2. Fall back to the join table and apply the priority order.
  return pickCanonicalCategorySlug(
    (product.product_categories ?? []).flatMap(pc =>
      Array.isArray(pc?.categories) ? pc.categories : pc?.categories ? [pc.categories] : [],
    ),
  )
}

/**
 * Canonical path from whatever a query returned: the explicit category_id
 * relation if it's set, otherwise the join table.
 */
export function canonicalProductPath(product: ProductCategoryRelations & { slug: string }): string {
  return productPath(canonicalCategorySlug(product), product.slug)
}

/**
 * The category a product's canonical URL names, as the row the query returned
 * — so a caller can read `name` off it and label the card with the category it
 * is about to send the visitor to.
 *
 * Null when that row was not selected, which is not an error: the slug alone
 * is enough to build the URL, and the caller decides what to show without one.
 */
export function canonicalCategory<T extends CategoryRef>(product: {
  categories?: T | T[] | null
  product_categories?: { categories?: T | T[] | null }[] | null
}): T | null {
  const slug = canonicalCategorySlug(product)
  return categoryRefs(product).find(c => c?.slug === slug) ?? null
}
