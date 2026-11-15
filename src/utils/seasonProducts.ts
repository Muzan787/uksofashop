// src/utils/seasonProducts.ts
//
// The sofas the seasonal pages and the homepage's "Made for Christmas" band
// show: real made-to-order products from the Made-To-Order Sofas main
// collection, with their real prices and photographs. Nothing here is typed in
// by hand, so a price or a photograph can never differ from the product page.
//
// Selection rules (pickSeasonProducts, pure and tested):
//   - only products with a photograph and a positive price;
//   - NO product that carries a was price. The seasonal pages make no
//     reference-price claim at all, so they do not feature a sofa whose card
//     would draw one;
//   - spread across shapes (family seating, U-shapes, corners, 3+2 sets) so the
//     page is not eight near-identical cards, best-reviewed first inside a
//     shape, then dearest, then slug, so the order is stable.
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/utils/supabase/public'
import { canonicalProductPath } from '@/utils/productUrl'
import { MADE_TO_ORDER_HREF } from '@/utils/seasonal'

export type SeasonShape = 'family' | 'u_shape' | 'corner' | 'three_two' | 'other'

export interface SeasonProduct {
  id: string
  title: string
  slug: string
  href: string
  price: number
  image: string
  shape: SeasonShape
  reviewCount: number
}

interface RawProduct {
  id: string
  title: string
  slug: string
  base_price: number | string
  was_price?: number | string | null
  review_count?: number | null
  is_active?: boolean | null
  product_variants?: { image_url?: string | null; price_adjustment?: number | string | null }[] | null
  categories?: { slug?: string | null } | { slug?: string | null }[] | null
  product_categories?: { categories?: { slug?: string | null } | { slug?: string | null }[] | null }[] | null
}

/** Which shape a product is, from its slug (the shop's own naming). */
export function seasonShape(slug: string): SeasonShape {
  if (slug.includes('family-set')) return 'family'
  if (slug.includes('u-shape')) return 'u_shape'
  if (slug.includes('corner')) return 'corner'
  if (slug.includes('3and2')) return 'three_two'
  return 'other'
}

const ORDER: SeasonShape[] = ['family', 'u_shape', 'corner', 'three_two']

export function pickSeasonProducts(raw: RawProduct[], limit: number): SeasonProduct[] {
  const usable: SeasonProduct[] = []
  for (const p of raw) {
    if (p.is_active === false) continue
    const price = Number(p.base_price) + Number(p.product_variants?.[0]?.price_adjustment ?? 0)
    const image = p.product_variants?.find(v => v.image_url)?.image_url ?? null
    if (!(price > 0) || !image) continue
    if (p.was_price != null && Number(p.was_price) > 0) continue
    const shape = seasonShape(p.slug)
    if (shape === 'other') continue
    usable.push({
      id: p.id, title: p.title, slug: p.slug, price, image, shape,
      href: canonicalProductPath(p as never),
      reviewCount: Number(p.review_count ?? 0),
    })
  }
  const rank = (a: SeasonProduct, b: SeasonProduct) =>
    b.reviewCount - a.reviewCount || b.price - a.price || a.slug.localeCompare(b.slug)
  const byShape = new Map<SeasonShape, SeasonProduct[]>()
  for (const s of ORDER) byShape.set(s, usable.filter(x => x.shape === s).sort(rank))

  // Round-robin across shapes, so the first cards already show the range.
  const out: SeasonProduct[] = []
  let progressed = true
  while (out.length < limit && progressed) {
    progressed = false
    for (const s of ORDER) {
      const next = byShape.get(s)?.shift()
      if (next && out.length < limit) { out.push(next); progressed = true }
    }
  }
  return out
}

const readSeasonProducts = unstable_cache(
  async (): Promise<SeasonProduct[]> => {
    const supabase = createPublicClient()
    const { data: main } = await supabase
      .from('main_collections').select('id').eq('slug', MADE_TO_ORDER_HREF.split('/').pop() as string).maybeSingle()
    if (!main) return []
    const { data } = await supabase
      .from('products')
      .select(`
        id, title, slug, base_price, was_price, review_count, is_active,
        product_variants ( image_url, price_adjustment, priority ),
        categories!products_category_id_fkey ( slug ),
        product_categories ( categories ( slug ) )
      `)
      .eq('main_collection_id', main.id)
      .eq('is_active', true)
      .order('priority', { referencedTable: 'product_variants', ascending: true })
    return pickSeasonProducts((data ?? []) as unknown as RawProduct[], 8)
  },
  ['season-products-v1'],
  { revalidate: 600, tags: ['season', 'home'] },
)

/**
 * Eight made-to-order sofas for the seasonal pages; kept for ten minutes.
 * Never throws: if the catalogue cannot be read (the database is unreachable
 * at build time, say), the pages and the homepage band simply draw without the
 * cards instead of failing the page or the deploy.
 */
export async function getSeasonProducts(): Promise<SeasonProduct[]> {
  try {
    return await readSeasonProducts()
  } catch (err) {
    console.error('Season products could not be read:', err)
    return []
  }
}
