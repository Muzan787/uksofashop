// src/app/shop/[category]/productQuery.ts
//
// Shared between page.tsx (which needs a count before it can decide whether a
// requested page exists) and ProductGrid.tsx (which fetches the rows). Both
// must filter identically - if they drift, the page count and the results stop
// agreeing and out-of-range pages start rendering as empty 200s.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

export const ITEMS_PER_PAGE = 9

/** The query parameters that narrow the result set. `page` is not one of them. */
export interface ProductFilters {
  categoryId: string | null
  style?: string
  material?: string
  color?: string
}

/** True when the URL carries any filter, i.e. this is a facet of a listing page. */
export function hasActiveFilters(f: Omit<ProductFilters, 'categoryId'>): boolean {
  return Boolean(f.style || f.material || f.color)
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
  { categoryId, style, material, color }: ProductFilters,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  let q = query as any
  if (categoryId) q = q.eq('product_categories.category_id', categoryId)
  if (style) q = q.filter('specifications->>style', 'ilike', style)
  if (material) q = q.filter('product_variants.material', 'ilike', material)
  if (color) q = q.filter('product_variants.color', 'ilike', color)
  return q as T
}

/**
 * How many products match, without transferring any rows (head: true sends the
 * count in a header). Cheap enough to run before the Suspense boundaries so an
 * out-of-range page can 404 with a real status code rather than streaming an
 * empty grid inside a 200.
 */
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
