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
 * How many active products a variant group needs before it is a range.
 *
 * Eight groups in this catalogue hold exactly one product, left over from sets
 * that were planned and never filled out. Counting them as ranges on the card
 * and then not drawing them as ranges on the page — see splitCollectionMembers
 * — is the kind of drift this file exists to prevent, so the threshold is
 * stated once and both ends read it.
 */
export const MIN_RANGE_SIZE = 2

/** 'live' links through. 'coming_soon' is named, blurred and inert. */
export type MainCollectionStatus = 'live' | 'coming_soon'

/** The product fields a main-collection card needs, and nothing else. */
export interface MainCollectionProduct {
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
  variant_group_id?: string | null
  /** The range's own name, where it has one. Only the first word is used. */
  variant_groups?: { name: string } | { name: string }[] | null
  product_variants?: { image_url?: string | null }[] | null
}

export interface MainCollectionRow {
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
 * Which range a product belongs to, for the purpose of showing variety.
 *
 * The variant group id is not enough on its own. "Lily Footstool" has no group
 * — it is one product, so nobody ever made it a set — and keying on the id
 * alone made it a range of its own, which put a Lily corner sofa and a Lily
 * footstool in the same nine-picture sheet under the heading "all different".
 * They are the same range to anyone looking at them.
 *
 * So the key is the first word of the range's name, or of the product's own
 * title where it has no range. That heuristic is already load-bearing in this
 * codebase — the product page sorts its "more like this" rail by comparing
 * exactly this — and it is how the catalogue is actually named: Verona,
 * Ashton, Lily, Roma.
 */
function rangeKey(p: MainCollectionProduct): string {
  const group = Array.isArray(p.variant_groups) ? p.variant_groups[0] : p.variant_groups
  const name = group?.name ?? p.title ?? p.id
  const first = name.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '')
  // A title that is punctuation or empty falls back to the id, so two unnamed
  // products never collapse into one bucket.
  return first || `solo:${p.id}`
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

    // Counted the way the collection's own page draws them: a group holding
    // one product is a design, not a range. See MIN_RANGE_SIZE.
    const perGroup = new Map<string, number>()
    for (const p of active) {
      if (!p.variant_group_id) continue
      perGroup.set(p.variant_group_id, (perGroup.get(p.variant_group_id) ?? 0) + 1)
    }
    const rangeCount = [...perGroup.values()].filter(n => n >= MIN_RANGE_SIZE).length

    const live = row.status === 'live' && active.length > 0

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      standfirst: row.standfirst,
      status: live ? 'live' : 'coming_soon',
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
 * Splits a collection's products into the ranges they belong to and the
 * designs that stand alone.
 *
 * Deliberately NOT "ranges, then every design again underneath". Listing all
 * fifty-one made-to-order sofas below the thirteen ranges they are already
 * inside shows the same Verona fourteen times and makes the page a wall. A
 * range is opened for its sizes; what is left over is shown on its own,
 * because otherwise there is no way to reach it from here at all.
 *
 * A group holding ONE active product is not a range, whatever the admin panel
 * calls it. Eight of them exist, left over from sets that were planned and
 * never filled out, and each was drawing a collage card promising "1 piece in
 * the set" that opened a page with one sofa on it. Those are shown as the
 * design they are.
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

  const ranges = [...grouped.values()].filter(g => {
    if (g.products.length >= MIN_RANGE_SIZE) return true
    singles.push(...g.products)
    return false
  })

  // Through the same summariser the flat collections page used, so a range
  // card here and a range card there cannot price the same set differently.
  const sets = summariseCollections(
    ranges.map(g => ({
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
