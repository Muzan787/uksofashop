// src/utils/halloweenHome.ts
//
// The homepage's Halloween reads: the hero's sofa and the Midnight rail,
// fetched by the slugs pinned in constants/halloween.ts and kept for five
// minutes under the homepage's own tag, like everything else on that page.
//
// Each one shows its DARK colourway's photograph and links straight to it
// (?variant=, which the product page already honours), so a black sofa on the
// rail opens as a black sofa rather than as the grey one listed first.

import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/utils/supabase/public'
import { canonicalCategory, canonicalProductPath } from '@/utils/productUrl'
import { sale } from '@/utils/pricing'
import { HALLOWEEN_HERO, MIDNIGHT_RAIL } from '@/constants/halloween'
import type { ProductCardData } from '@/components/Product/ProductCard'

export interface HalloweenHome {
  hero: {
    title: string
    href: string
    image: string | null
    price: number
    wasPrice: number | null
  } | null
  rail: ProductCardData[]
}

export const getHalloweenHome = unstable_cache(
  async (): Promise<HalloweenHome> => {
    const supabase = createPublicClient()
    const picks = [HALLOWEEN_HERO, ...MIDNIGHT_RAIL]

    const { data } = await supabase
      .from('products')
      .select('id, title, slug, base_price, was_price, average_rating, review_count, product_variants(id, image_url, color, color_hex, price_adjustment, priority), categories!products_category_id_fkey(slug, name), product_categories(categories(slug, name))')
      .in('slug', picks.map(p => p.slug))
      .eq('is_active', true)
      .order('priority', { referencedTable: 'product_variants', ascending: true })

    const bySlug = new Map((data ?? []).map(p => [p.slug, p]))

    // A pick whose sofa has gone inactive simply drops out; one whose dark
    // colourway has been deleted falls back to the sofa's first.
    const resolve = (pick: (typeof picks)[number]) => {
      const product = bySlug.get(pick.slug)
      if (!product) return null
      const variants = product.product_variants ?? []
      const variant = variants.find(v => v.id === pick.variantId) ?? variants[0]
      return {
        product,
        variants,
        image: variant?.image_url ?? null,
        // The price of the colourway shown, adjustment included - the figure
        // the product page opens on.
        priced: sale(product.base_price, product.was_price, variant?.price_adjustment),
        href: `${canonicalProductPath(product)}${variant ? `?variant=${variant.id}` : ''}`,
      }
    }

    const lead = resolve(HALLOWEEN_HERO)
    const hero = lead
      ? { title: lead.product.title, href: lead.href, image: lead.image, price: lead.priced.price, wasPrice: lead.priced.wasPrice }
      : null

    const rail = MIDNIGHT_RAIL.flatMap((pick): ProductCardData[] => {
      const r = resolve(pick)
      if (!r) return []
      return [{
        id: r.product.id,
        title: r.product.title,
        slug: r.product.slug,
        price: r.priced.price,
        wasPrice: r.priced.wasPrice,
        href: r.href,
        image: r.image,
        badge: canonicalCategory(r.product)?.name ?? null,
        reviewCount: r.product.review_count,
        averageRating: r.product.average_rating,
        swatches: r.variants
          .filter(v => v.color_hex)
          .map(v => ({ id: v.id, color: v.color ?? null, hex: v.color_hex ?? null, image: v.image_url ?? null })),
        // The same sofa can be in the "New in" rail below, and a
        // view-transition-name must be unique on the page.
        transition: false,
      }]
    })

    return { hero, rail }
  },
  ['uksofashop-halloween-home-v1'],
  { revalidate: 300, tags: ['home'] },
)
