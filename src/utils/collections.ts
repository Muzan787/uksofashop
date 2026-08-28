// src/utils/collections.ts
//
// Turns a variant_groups row and its products into the shape CollectionCard
// wants: a price range and up to three representative images.
//
// This logic was written out twice, near-identically, in src/app/page.tsx and
// src/app/collection/page.tsx - both untyped, both using `any` throughout. One
// typed copy means the homepage and the collections page can no longer show
// different prices or different images for the same collection.

/** The subset of a product row this needs. Anything else is ignored. */
export interface CollectionProduct {
  base_price: number
  is_active?: boolean | null
  gallery_images?: string[] | null
  product_variants?: { image_url?: string | null }[] | null
}

export interface CollectionGroup {
  id: string
  name: string
  slug: string
  products?: CollectionProduct[] | null
}

export interface CollectionSummary {
  id: string
  name: string
  slug: string
  minPrice: number
  maxPrice: number
  images: string[]
  /**
   * How many active pieces the set contains. It is the one thing a customer
   * genuinely wants to know about a collection before opening it, and the card
   * had no way to say it.
   */
  pieceCount: number
}

const MAX_IMAGES = 3

/**
 * Picks up to three images, preferring variety over completeness: one image
 * from each distinct product first, so a collection of four sofas shows four
 * different sofas rather than three angles of the same one. Only then does it
 * backfill from remaining variants and gallery images.
 */
function pickImages(products: CollectionProduct[]): string[] {
  const chosen: string[] = []
  const seen = new Set<string>()

  const take = (url: string | null | undefined) => {
    if (!url || seen.has(url) || chosen.length >= MAX_IMAGES) return
    chosen.push(url)
    seen.add(url)
  }

  // Pass 1 - one per product.
  for (const p of products) {
    take(p.product_variants?.[0]?.image_url ?? p.gallery_images?.[0])
  }

  // Pass 2 - backfill.
  for (const p of products) {
    if (chosen.length >= MAX_IMAGES) break
    for (const v of p.product_variants ?? []) take(v.image_url)
    for (const img of p.gallery_images ?? []) take(img)
  }

  return chosen.slice(0, MAX_IMAGES)
}

/**
 * Collections with no active products are dropped rather than rendered empty -
 * a card with no price and no image is worse than no card.
 */
export function summariseCollections(
  groups: CollectionGroup[] | null | undefined,
): CollectionSummary[] {
  const out: CollectionSummary[] = []

  for (const group of groups ?? []) {
    const active = (group.products ?? []).filter(p => p.is_active)
    if (active.length === 0) continue

    const prices = active.map(p => Number(p.base_price))

    out.push({
      id: group.id,
      name: group.name,
      slug: group.slug,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      images: pickImages(active),
      pieceCount: active.length,
    })
  }

  return out
}
