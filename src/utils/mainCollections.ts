// src/utils/mainCollections.ts
//
// The layer above the sets.
//
// /collection used to be a flat grid of variant_groups — "Verona Sofa",
// "Roma Recliner", sixteen of them in alphabetical order. That is one level of
// a catalogue that has two: a made-to-order Verona and an imported Roma
// recliner are not the same kind of purchase, and dining sets and wardrobes
// are not sofas at all. A main collection is the part of the shop; a set is a
// range within it; a product is a design within that.
//
// Shaping lives here rather than in the pages for the same reason
// utils/collections.ts exists: the index and the collection page both draw
// cards from the same rows, and two copies of the arithmetic is two chances
// for them to disagree about a price or a count.

import { priceAnchors, summariseCollections, type CollectionSummary } from '@/utils/collections'

/**
 * A SUB COLLECTION IS A VARIANT GROUP. One to one, whatever its size.
 *
 * This file briefly held a threshold — a group needed two products before it
 * counted — on the reasoning that a group of one is a design rather than a
 * range. That was the wrong call to make here. The variant group is the shop's
 * own statement about what belongs together, and a Bishop U-shape that comes
 * in one size is still its own sub collection, not a loose sofa. The database
 * now guarantees every active product has a group, so the threshold had
 * nothing left to decide anyway.
 *
 * What remains of the old split is the ungrouped case, which should not occur
 * — see splitCollectionMembers.
 */

/** 'live' links through. 'coming_soon' is named, blurred and inert. */
type MainCollectionStatus = 'live' | 'coming_soon'

/** The product fields a main-collection card needs, and nothing else. */
interface MainCollectionProduct {
  id: string
  /**
   * Two jobs: keeping a footstool from setting the collection's "from" price,
   * and naming the range a product with no variant group belongs to — see
   * rangeKey.
   */
  title?: string | null
  base_price: number
  is_active?: boolean | null
  gallery_images?: string[] | null
  /** The sub collection. Set on every active product — see rangeKey. */
  variant_group_id?: string | null
  product_variants?: { image_url?: string | null }[] | null
}

interface MainCollectionRow {
  id: string
  slug: string
  name: string
  standfirst: string | null
  status: string
  position: number
  products?: MainCollectionProduct[] | null
}

export interface MainCollectionSummary {
  id: string
  slug: string
  name: string
  standfirst: string | null
  status: MainCollectionStatus
  /**
   * The shop's own ordering, carried through so a coming-soon card can pick a
   * palette that is distinct from its neighbours' — see MainCollectionCard.
   */
  position: number
  /** Active designs in it. 0 on everything not open yet. */
  productCount: number
  /** Distinct variant groups among those designs. */
  setCount: number
  /** Cheapest active design, or null where there is nothing to price. */
  fromPrice: number | null
  /** Up to three photographs for the collage. Empty on a coming-soon card. */
  images: string[]
}

/**
 * Nine, not three.
 *
 * A set card shows three because a set is three or four sizes of one sofa, and
 * a fourth photograph of the same frame says nothing. A main collection is
 * thirteen recliners or fifty-one made-to-order frames, and the one thing its
 * card has to carry is how much is in there — so it is a contact sheet: one
 * lead photograph and eight more, each from a different RANGE.
 *
 * MainCollectionCard lays out exactly this many and falls back to the
 * three-panel collage below it, so the two numbers are in step.
 */
export const MOSAIC_IMAGES = 9

const MAX_IMAGES = MOSAIC_IMAGES

/** Every photograph a design has, lead variant first, gallery behind it. */
function photographsOf(p: MainCollectionProduct): string[] {
  return [
    ...(p.product_variants ?? []).map(v => v.image_url),
    ...(p.gallery_images ?? []),
  ].filter((url): url is string => Boolean(url))
}

/**
 * Which sub collection a product belongs to: its variant group, full stop.
 *
 * This was briefly a first-word-of-the-title heuristic, because "Sims
 * Footstool" had no group and keying on the id alone made it a sub collection
 * of its own — putting a Sims corner sofa and a Sims footstool in the same
 * nine-picture sheet under the heading "all different". Guessing at the data
 * was the wrong half of that problem to fix. The footstool is in the Sims
 * group now, as is every other loose product, so the key is the real thing
 * again and the sheet is right because the catalogue is.
 *
 * The fallback is the product id. It should never be reached — a migration
 * put every active product in a group — and if it ever is, the product shows
 * as its own sub collection rather than silently merging with another.
 */
function rangeKey(p: MainCollectionProduct): string {
  return p.variant_group_id ?? `ungrouped:${p.id}`
}

/**
 * ONE PHOTOGRAPH PER RANGE BEFORE A SECOND FROM ANY OF THEM.
 *
 * Taking one per DESIGN is not the same thing and was not enough. Verona has
 * fourteen sizes and Ashton ten, so nine different designs off the top of
 * Made-To-Order were nine photographs of the same two sofas at slightly
 * different widths — a contact sheet whose whole job is to say "look how much
 * is in here", saying the opposite.
 *
 * So the products are bucketed by variant group and the picker goes round the
 * buckets rather than down the list: the first nine images come from nine
 * different ranges where there are nine, and from as many as exist where there
 * are fewer. A product belonging to no group is its own bucket, because that
 * is exactly what it is — a one-off design, as distinct from a Verona as a
 * Malibu is.
 *
 * Deeper rounds work the same way: round two takes the second design of each
 * range, round three the third, so Imported Sofas — which has only five
 * buckets to fill nine slots — still spreads them as widely as it can instead
 * of emptying one range before starting the next.
 */
function pickImages(products: MainCollectionProduct[]): string[] {
  const buckets = new Map<string, MainCollectionProduct[]>()
  for (const p of products) {
    const key = rangeKey(p)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(p)
    else buckets.set(key, [p])
  }

  // Each range's photographs, already interleaved across its own designs: the
  // lead shot of every Verona size first, then their second shots. So even a
  // card drawing twice from one range does not draw the same sofa twice.
  //
  // Sofas lead within a range. A footstool photographed on its own is a weak
  // picture in a sheet selling sofas, and it is a range's cheapest row so it
  // can easily sort first — priceAnchors is the same test that stops it
  // setting the "from" price.
  const queues = [...buckets.values()].map(bucket => {
    const ordered = [...bucket].sort(
      (a, b) => Number(priceAnchors(b.title)) - Number(priceAnchors(a.title)),
    )
    const queue: string[] = []
    const deepest = Math.max(...ordered.map(p => photographsOf(p).length), 0)
    for (let round = 0; round < deepest; round++) {
      for (const p of ordered) {
        const url = photographsOf(p)[round]
        if (url) queue.push(url)
      }
    }
    return queue
  })

  const chosen: string[] = []
  const seen = new Set<string>()
  const deepest = Math.max(...queues.map(q => q.length), 0)

  for (let round = 0; round < deepest && chosen.length < MAX_IMAGES; round++) {
    for (const queue of queues) {
      if (chosen.length >= MAX_IMAGES) break
      const url = queue[round]
      if (!url || seen.has(url)) continue
      chosen.push(url)
      seen.add(url)
    }
  }

  return chosen
}

/**
 * A main collection the database calls live, but which has nothing active in
 * it, is shown as coming soon anyway.
 *
 * The status column is a decision; this is a fact. Trusting the column alone
 * would put a working link on a card that opens an empty page, which is the
 * one outcome the coming-soon treatment exists to prevent — and it would
 * happen silently, the first time the last product in a collection was hidden.
 */
export function summariseMainCollections(
  rows: MainCollectionRow[] | null | undefined,
): MainCollectionSummary[] {
  return (rows ?? []).map(row => {
    const active = (row.products ?? []).filter(p => p.is_active)

    const prices = active
      .filter(p => priceAnchors(p.title))
      .map(p => Number(p.base_price))
      .filter(n => Number.isFinite(n) && n > 0)

    // One card per variant group on the collection's own page, so one per
    // variant group in the count here. rangeKey gives an ungrouped product a
    // key of its own, which is what the page would draw for it too.
    const rangeCount = new Set(active.map(rangeKey)).size

    const live = row.status === 'live' && active.length > 0

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      standfirst: row.standfirst,
      status: live ? 'live' : 'coming_soon',
      position: row.position,
      productCount: active.length,
      setCount: rangeCount,
      fromPrice: prices.length ? Math.min(...prices) : null,
      images: live ? pickImages(active) : [],
    }
  })
}

/** "13 designs · 3 ranges · from £280", and the honest shorter versions. */
export function mainCollectionSummaryLine(
  c: Pick<MainCollectionSummary, 'status' | 'productCount' | 'setCount' | 'fromPrice'>,
): string {
  if (c.status === 'coming_soon') return 'Coming soon'

  const parts = [`${c.productCount} ${c.productCount === 1 ? 'design' : 'designs'}`]
  if (c.setCount > 0) parts.push(`${c.setCount} ${c.setCount === 1 ? 'range' : 'ranges'}`)
  if (c.fromPrice !== null) parts.push(`from £${Math.round(c.fromPrice).toLocaleString('en-GB')}`)
  return parts.join(' · ')
}

// ─── The collection's own page ───────────────────────────────────────────────

/** A product row as the main-collection page reads it. */
export interface MainCollectionMember extends MainCollectionProduct {
  title: string
  slug: string
  was_price?: number | null
  average_rating?: number | null
  review_count?: number | null
  size_label?: string | null
  /**
   * Both relations, because the card's href is canonicalProductPath() and the
   * designated primary category is the first thing it reads. Without them a
   * design opens through a 308 to wherever it should have gone.
   */
  categories?: { slug: string } | { slug: string }[] | null
  product_categories?: { categories?: { slug: string } | { slug: string }[] | null }[] | null
  product_variants?:
    | { id?: string; image_url?: string | null; color?: string | null; color_hex?: string | null; price_adjustment?: number | null; priority?: number | null }[]
    | null
  variant_groups?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
}

/**
 * A collection's sub collections — one per variant group — and, if the data
 * ever drifts, whatever is left over.
 *
 * Deliberately NOT "sub collections, then every design again underneath".
 * Listing all fifty-eight made-to-order sofas below the fifteen groups they
 * are already inside shows the same Verona fourteen times and makes the page a
 * wall. A sub collection is opened for its sizes.
 *
 * `singles` should always come back empty: a migration put every active
 * product in a group, and the admin form has carried the picker since. It
 * stays because "appears nowhere" is the wrong way to fail — a product that
 * loses its group shows up as its own card rather than dropping off the page
 * silently, which is also how it would be counted on the card that led here.
 */
export function splitCollectionMembers(members: MainCollectionMember[]): {
  sets: CollectionSummary[]
  singles: MainCollectionMember[]
} {
  const active = members.filter(m => m.is_active !== false)

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const grouped = new Map<string, { id: string; name: string; slug: string; products: MainCollectionMember[] }>()
  const singles: MainCollectionMember[] = []

  for (const m of active) {
    const group = one(m.variant_groups)
    if (!m.variant_group_id || !group) {
      singles.push(m)
      continue
    }
    const existing = grouped.get(m.variant_group_id)
    if (existing) existing.products.push(m)
    else grouped.set(m.variant_group_id, { ...group, products: [m] })
  }

  // Through the same summariser the flat collections page used, so a sub
  // collection card here and one there cannot price the same set differently.
  const sets = summariseCollections(
    [...grouped.values()].map(g => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      products: g.products.map(p => ({
        base_price: p.base_price,
        is_active: true,
        gallery_images: p.gallery_images,
        product_variants: p.product_variants,
      })),
    })),
  ).sort((a, b) => a.minPrice - b.minPrice)

  singles.sort((a, b) => Number(a.base_price) - Number(b.base_price))

  return { sets, singles }
}
