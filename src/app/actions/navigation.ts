// src/app/actions/navigation.ts
'use server'
//
// The two queries the header used to run from the browser: the mega menu's
// drawer contents, and product search.
//
// Both are reads with no auth requirement, so they were legitimate client
// queries - they just cost the whole storefront a 198KB Supabase client in
// first load to make them. As server actions they cost a fetch each, and the
// library stays on the server. See src/utils/navigation.ts for the full note.

import { createClient } from '@/utils/supabase/server'
import { canonicalProductPath } from '@/utils/productUrl'

// ─── Mega menu ───────────────────────────────────────────────────────────────

export interface MegaCollection {
  id: string
  name: string
  slug: string
}

/** categoryId -> cheapest and dearest product in it. */
export type MegaPriceRange = Record<string, { min: number; max: number }>

export interface MegaMenuData {
  collections: MegaCollection[]
  prices: MegaPriceRange
}

/**
 * Still called on first open rather than on page load, which is the same
 * lazy behaviour the component had before: the drawer is desktop-only, and
 * fetching its contents for every phone that can never open it would be two
 * queries nobody asked for.
 */
export async function getMegaMenuData(): Promise<MegaMenuData> {
  const supabase = await createClient()

  const [collectionsRes, productsRes] = await Promise.all([
    supabase.from('variant_groups').select('id, name, slug').order('name').limit(6),
    supabase
      .from('products')
      .select('base_price, product_categories!inner(category_id)')
      .eq('is_active', true),
  ])

  const prices: MegaPriceRange = {}
  for (const row of productsRes.data ?? []) {
    const price = Number(row.base_price)
    if (!Number.isFinite(price)) continue
    for (const pc of row.product_categories ?? []) {
      const id = pc.category_id
      if (!id) continue
      prices[id] = prices[id]
        ? { min: Math.min(prices[id].min, price), max: Math.max(prices[id].max, price) }
        : { min: price, max: price }
    }
  }

  return { collections: collectionsRes.data ?? [], prices }
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchHit {
  id: string
  title: string
  slug: string
  base_price: number
  image: string | null
  /**
   * The finished product URL, canonical. It used to be a bare categorySlug the
   * overlay pasted into a template, taken from product_categories[0] with
   * 'all' behind it — the first is whichever row the join happened to return,
   * the second is a segment no product belongs to. Either way the header
   * search could hand somebody a URL that only answered with a redirect.
   */
  href: string
}

const MIN_CHARS = 2
const LIMIT = 6

/**
 * The search term goes into a PostgREST `or=` filter, which is a comma
 * separated list of conditions with parentheses around the group. A term
 * containing a comma, a parenthesis or a backslash therefore does not escape
 * into SQL - PostgREST parameterises the values - but it DOES corrupt the
 * filter expression itself, which returns an error or the wrong rows.
 *
 * The client version interpolated the raw term. Stripping the four characters
 * that carry meaning in that grammar is what keeps a search for "3+2, corner"
 * returning results instead of nothing. `%` goes too, because a term of "%"
 * matches every row in the table.
 */
function sanitiseTerm(raw: string): string {
  return raw.replace(/[,()\\%]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function searchProducts(rawTerm: string): Promise<SearchHit[]> {
  const term = sanitiseTerm(String(rawTerm ?? '')).slice(0, 80)
  if (term.length < MIN_CHARS) return []

  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(
      'id, title, slug, base_price, product_variants(image_url), categories!products_category_id_fkey(slug), product_categories!inner(categories(slug))',
    )
    .eq('is_active', true)
    .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    .limit(LIMIT)

  return (data ?? []).map((p) => {
    const variants = p.product_variants as { image_url: string | null }[] | null
    return {
      id: p.id as string,
      title: p.title as string,
      slug: p.slug as string,
      base_price: Number(p.base_price),
      image: variants?.[0]?.image_url ?? null,
      href: canonicalProductPath({
        slug: p.slug as string,
        categories: p.categories,
        product_categories: p.product_categories,
      }),
    }
  })
}
