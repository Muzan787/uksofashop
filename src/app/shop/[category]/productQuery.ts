// src/app/shop/[category]/productQuery.ts
//
// Shared between page.tsx (which needs a count before it can decide whether a
// requested page exists) and ProductGrid.tsx (which fetches the rows). Both
// must filter identically - if they drift, the page count and the results stop
// agreeing and out-of-range pages start rendering as empty 200s.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { canonicalProductPath } from '@/utils/productUrl'

type Client = SupabaseClient<Database>

export const ITEMS_PER_PAGE = 9

/** The query parameters that narrow the result set. `page` is not one of them. */
/** Sort keys, as they appear in the URL. */
export const SORTS = ['featured', 'price-asc', 'price-desc', 'newest'] as const
export type SortKey = (typeof SORTS)[number]

export const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
  newest: 'Newest first',
}

/** Anything unrecognised is Featured rather than an error. */
export function parseSort(raw: string | string[] | undefined): SortKey {
  return typeof raw === 'string' && (SORTS as readonly string[]).includes(raw)
    ? (raw as SortKey)
    : 'featured'
}

/** A price bound from the URL. Non-numeric or negative is treated as absent. */
export function parsePrice(raw: string | string[] | undefined): number | undefined {
  if (typeof raw !== 'string') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
}

export interface ProductFilters {
  categoryId: string | null
  style?: string
  material?: string
  color?: string
  /** Inclusive bounds on base_price, in pounds. */
  minPrice?: number
  maxPrice?: number
}

/** True when the URL carries any filter, i.e. this is a facet of a listing page. */
/**
 * Whether the view is narrowed. Drives the noindex in generateMetadata: a
 * filtered listing is a near-duplicate of the unfiltered one and there is a
 * combinatorial number of them.
 *
 * Sort is NOT a filter and is deliberately absent — but a sorted URL is the
 * same rows in a different order, which is the definition of a duplicate, so
 * page.tsx treats a non-default sort the same way for indexing purposes.
 */
export function hasActiveFilters(f: Omit<ProductFilters, 'categoryId'>): boolean {
  return Boolean(f.style || f.material || f.color || f.minPrice !== undefined || f.maxPrice !== undefined)
}

/**
 * Read ?page= defensively.
 *
 * parseInt('abc') is NaN and parseInt('-5') is negative; both used to reach
 * Supabase's range() and produce either a malformed request or a negative
 * window. Anything that is not a positive integer is treated as page 1.
 */
export function parsePageParam(raw: string | string[] | undefined): number {
  if (typeof raw !== 'string') return 1
  // Reject '1.5', '1e3', '+1', ' 1 ' and similar before parseInt gets a chance
  // to salvage a leading digit out of them.
  if (!/^\d+$/.test(raw.trim())) return 1
  const n = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(n) || n < 1) return 1
  return n
}

/**
 * Applies the category and facet filters shared by both queries.
 *
 * The builder is threaded through as an opaque generic: .eq() and .filter()
 * each return a new builder whose type encodes the accumulated filters, which
 * a loop of optional calls cannot express. Casting internally keeps the
 * call-site type intact - callers get back exactly the builder they passed in.
 */
export function applyProductFilters<T>(
  query: T,
  { categoryId, style, material, color, minPrice, maxPrice }: ProductFilters,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  let q = query as any
  if (categoryId) q = q.eq('product_categories.category_id', categoryId)
  if (style) q = q.filter('specifications->>style', 'ilike', style)
  if (material) q = q.filter('product_variants.material', 'ilike', material)
  if (color) q = q.filter('product_variants.color', 'ilike', color)
  // base_price, matching the range the hero prints and the slider is bounded
  // by. The card can show base + a variant adjustment, so a product at the
  // very edge of the range can display a pound or two outside it.
  if (minPrice !== undefined) q = q.gte('base_price', minPrice)
  if (maxPrice !== undefined) q = q.lte('base_price', maxPrice)
  return q as T
}

/**
 * How many products match, without transferring any rows (head: true sends the
 * count in a header). Cheap enough to run before the Suspense boundaries so an
 * out-of-range page can 404 with a real status code rather than streaming an
 * empty grid inside a 200.
 */
/**
 * The cheapest and dearest product in a category, in pounds.
 *
 * Joined exactly like countMatchingProducts above — same !inner shape — so the
 * count and the range in the hero are always describing the same set of rows.
 *
 * It transfers one number per product rather than asking the database for the
 * aggregate, because PostgREST has no min()/max() without a view or an RPC and
 * the catalogue is small. If it ever runs to thousands, this is the line to
 * replace with a database function.
 */
export async function categoryPriceRange(
  supabase: Client,
  filters: ProductFilters,
): Promise<{ from: number | null; to: number | null }> {
  const base = supabase
    .from('products')
    .select('base_price, product_variants!inner(material, color), product_categories!inner(category_id)')
    .eq('is_active', true)

  const { data } = await applyProductFilters(base, filters)

  const prices = (data ?? [])
    .map(row => Number((row as { base_price: number | null }).base_price))
    .filter(n => Number.isFinite(n) && n > 0)

  if (!prices.length) return { from: null, to: null }
  return { from: Math.min(...prices), to: Math.max(...prices) }
}


/** Everything a ProductCard needs, and nothing the client does not. */
export interface GridCard {
  id: string
  title: string
  slug: string
  href: string
  price: number
  image: string | null
  secondaryImage: string | null
  reviewCount: number | null
  averageRating: number | null
  swatches: { id: string; color: string | null; hex: string | null; image: string | null }[]
}

/**
 * One page of the listing, already shaped for the card.
 *
 * Shared by the server component that renders the first page and the server
 * action behind "Load more", so the two can never disagree about which
 * variant is shown, what the price includes, or how the rows are ordered —
 * which is exactly the sort of thing that goes wrong when appending pages is
 * bolted on afterwards.
 */
/**
 * The ORDER BY behind each sort key.
 *
 * Featured is is_featured first and then newest, which is what the flag on
 * the products table is for; without the second key every unfeatured product
 * would come back in whatever order Postgres felt like.
 */
function applySort<T>(query: T, sort: SortKey): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  const q = query as any
  switch (sort) {
    case 'price-asc':  return q.order('base_price', { ascending: true }) as T
    case 'price-desc': return q.order('base_price', { ascending: false }) as T
    case 'newest':     return q.order('created_at', { ascending: false }) as T
    default:
      return q
        .order('is_featured', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }) as T
  }
}

export async function fetchProductCards(
  supabase: Client,
  filters: ProductFilters,
  page: number,
  categorySegment: string,
  sort: SortKey = 'featured',
): Promise<{ cards: GridCard[]; count: number }> {
  const from = (page - 1) * ITEMS_PER_PAGE

  const query = applyProductFilters(
    supabase
      .from('products')
      .select(
        // The two category relations are here for the href, not for the card:
        // see the note where it is built below. Both are joins on a query that
        // already runs, so they cost no extra round trip.
        'id, title, slug, base_price, gallery_images, average_rating, review_count, product_variants!inner(id, image_url, material, color, color_hex, price_adjustment, priority), product_categories!inner(category_id, categories(slug)), categories!products_category_id_fkey(slug)',
        { count: 'exact' },
      )
      .eq('is_active', true),
    filters,
  )

  const { data, count } = await applySort(query, sort)
    // Sorts the joined variants array, so [0] is the lead photograph. This is
    // a second, independent ordering and does not compete with the one above.
    .order('priority', { referencedTable: 'product_variants', ascending: true })
    .range(from, from + ITEMS_PER_PAGE - 1)

  const cards = (data ?? []).map(product => {
    // Where a colour or material facet is active, the card should show the
    // variant the customer asked for rather than the default one.
    let variant = product.product_variants?.[0]
    if (filters.color || filters.material) {
      const match = product.product_variants?.find(v =>
        (filters.color ? v.color?.toLowerCase() === filters.color.toLowerCase() : true) &&
        (filters.material ? v.material?.toLowerCase() === filters.material.toLowerCase() : true))
      if (match) variant = match
    }

    const image = variant?.image_url ?? null

    // The link keeps the visitor inside the category they are browsing, which
    // is what the breadcrumb on the product page then shows — but ONLY where
    // that is a category the product genuinely belongs to.
    //
    // Everywhere else it has to be the canonical path instead, because the
    // product page redirects anything else. On /shop/all — the listing the
    // header's Shop link goes to, and the busiest one on the site — "all" is a
    // virtual segment that no product belongs to, so every single card was
    // linking to a URL that answered with a 308. That is not one slow
    // navigation, it is two: the server renders /shop/all/<slug> far enough to
    // work out where it should have gone, throws that work away, and renders
    // the canonical URL from scratch. Roughly double the wait, on every
    // product opened from the main shop page.
    //
    // A category filter narrows the embedded rows to the filtered category
    // (product_categories!inner plus the .eq in applyProductFilters), so on a
    // real category page this still finds a match and the link is unchanged.
    const belongsToSegment = (product.product_categories ?? []).some(pc => {
      const cats = Array.isArray(pc?.categories) ? pc.categories : pc?.categories ? [pc.categories] : []
      return cats.some(c => c?.slug === categorySegment)
    })

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      href: belongsToSegment
        ? `/shop/${encodeURIComponent(categorySegment)}/${encodeURIComponent(product.slug)}`
        : canonicalProductPath(product),
      price: product.base_price + (variant?.price_adjustment || 0),
      image,
      secondaryImage:
        product.product_variants?.find(v => v.image_url && v.image_url !== image)?.image_url
        ?? product.gallery_images?.[0]
        ?? null,
      reviewCount: product.review_count,
      averageRating: product.average_rating,
      swatches: (product.product_variants ?? [])
        .filter(v => v.color_hex)
        .map(v => ({ id: v.id, color: v.color ?? null, hex: v.color_hex ?? null, image: v.image_url ?? null })),
    }
  })

  return { cards, count: count ?? 0 }
}

export async function countMatchingProducts(
  supabase: Client,
  filters: ProductFilters,
): Promise<number> {
  const base = supabase
    .from('products')
    .select(
      'id, product_variants!inner(material, color), product_categories!inner(category_id)',
      { count: 'exact', head: true },
    )
    .eq('is_active', true)

  const { count } = await applyProductFilters(base, filters)
  return count ?? 0
}
