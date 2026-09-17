// src/app/build/catalogue.ts
//
// What /build has to choose from, read once on the server.
//
// The builder does not have a catalogue of its own. Every design it offers is
// a product the shop already sells - the same row, the same photograph, the
// same price - filtered to the ones flagged `custom_made`, because those are
// the frames the workshop makes to order. That is also what keeps recliners
// out: nothing in the Nova, Roma, Hannah or Orlando ranges is custom_made, so
// none of them can be built here, and there is no second list to keep in step
// with the first.
//
// What this file adds is the grouping the product table does not carry:
//
//   SIZE. `size_label` is free text - "3+2 Seater", "4 Seater Corner 1c2",
//   "Arm Chair" - and two of the corner labels are the same size in two
//   orientations. Step one asks "how many seats", so the labels are folded
//   into a short ordered list of sizes a person would actually say.
//
//   FAMILY. The product's variant group ("Verona Sofa") is the design; the
//   card shows the family name, not the SKU title. Products outside a group
//   fall back to the first word of their title, which is how the catalogue
//   has always named them.
//
//   A LINE ABOUT EACH DESIGN, because the card has room for one and a customer
//   swiping through five sofas at 375px wants to know what makes each one
//   different before reading a paragraph.

import { createClient } from '@/utils/supabase/server'
import { canonicalProductPath } from '@/utils/productUrl'
import type { BuildBack } from '@/types/build'

export interface BuildDesign {
  productId: string
  variantId: string
  slug: string
  href: string
  title: string
  /** "Verona" */
  family: string
  familySlug: string
  sizeKey: string
  /** As the product labels it: "4 Seater Corner 1c2". */
  sizeLabel: string
  back: BuildBack | null
  price: number
  image: string | null
  /** The colour the photograph shows - the lead variant's. */
  photographedIn: string | null
  /** Tidied for the card - "W 198 · H 97 · D 99 cm". Null where the record has none. */
  dimensions: string | null
  /** The feet the design is photographed on, where the record says. */
  feetAsPictured: string | null
  tagline: string
}

export type SizeShape = 'chair' | 'two' | 'three' | 'pair' | 'corner-small' | 'corner' | 'l' | 'u' | 'u-armed'

export interface BuildSize {
  key: string
  label: string
  /** What it is, in a few words: "one 3-seater and one 2-seater". */
  detail: string
  shape: SizeShape
  /** How many designs come in it. */
  designs: number
  /** The cheapest of them. */
  from: number
}

/**
 * The sizes step one offers, in the order it offers them - smallest first.
 * Nothing appears here that the catalogue does not currently carry; a size
 * with no custom_made product simply drops out of the list.
 */
const SIZES: Omit<BuildSize, 'designs' | 'from'>[] = [
  { key: 'armchair', label: 'Armchair', detail: 'One seat, two arms', shape: 'chair' },
  { key: '2-seater', label: '2 Seater', detail: 'Two seats', shape: 'two' },
  { key: '3-seater', label: '3 Seater', detail: 'Three seats', shape: 'three' },
  { key: '3-2-seater', label: '3+2 Seater', detail: 'A 3 seater and a 2 seater', shape: 'pair' },
  { key: '4-seater-corner', label: '4 Seater Corner', detail: 'A short corner', shape: 'corner-small' },
  { key: '5-seater-corner', label: '5 Seater Corner', detail: 'A full corner', shape: 'corner' },
  { key: 'l-shape', label: 'L-Shape', detail: 'A long side and a chaise', shape: 'l' },
  { key: 'u-shape', label: 'U-Shape', detail: 'Three sides, open front', shape: 'u' },
  { key: 'armed-u-shape', label: 'Armed U-Shape', detail: 'A U-shape with arms', shape: 'u-armed' },
]

/** One line per design family. The fallback covers anything added later. */
const TAGLINES: Record<string, string> = {
  verona: 'The plain, honest one — a tall supportive back and a woven cloth built for everyday family use.',
  salone: 'Clean square arms, piped cushions and a low, boxy line. The modern one.',
  ashton: 'Deep-buttoned Chesterfield arms in plush velvet, with a back that holds you up.',
  lily: 'Vertical channel stitching across the arms and base — soft, tailored, a little glamorous.',
  malibu: 'Scroll arms with antique studs, a button-tufted base and turned wooden feet. The traditional one.',
  bishop: 'Our biggest single piece — a full U with loose scatter-back cushions for the whole family.',
}
const TAGLINE_FALLBACK = 'Built to order in the workshop, in any of our fabrics, at the same price.'

/** "4 Seater Corner 1c2" -> the size key step one uses. Null for anything unplaceable. */
function sizeKeyFor(sizeLabel: string | null, title: string): string | null {
  const s = (sizeLabel ?? '').trim().toLowerCase()
  if (s) {
    if (s.includes('arm chair') || s === 'armchair') return 'armchair'
    if (s.startsWith('armed u')) return 'armed-u-shape'
    if (s.startsWith('u-shape') || s.startsWith('u shape')) return 'u-shape'
    if (s.startsWith('l-shape') || s.startsWith('l shape')) return 'l-shape'
    if (s.startsWith('3+2')) return '3-2-seater'
    if (s.startsWith('5 seater corner')) return '5-seater-corner'
    if (s.startsWith('4 seater corner')) return '4-seater-corner'
    if (s.startsWith('2 seater')) return '2-seater'
    if (s.startsWith('3 seater')) return '3-seater'
    return null
  }
  // No label at all. The one such product today is the Bishop, whose title
  // says what it is; the Lily footstool is deliberately not a sofa.
  const t = title.toLowerCase()
  if (t.includes('u shaped') || t.includes('u-shape')) return 'u-shape'
  return null
}

function backFor(subgroup: string | null): BuildBack | null {
  if (subgroup === 'High Back') return 'High Back'
  if (subgroup === 'Scattered Back') return 'Scattered Back'
  return null
}

/**
 * "L:198cm H:97cm D:99cm"  ->  "W 198 · H 97 · D 99 cm"
 * "240cm x 240cm H:90cm"   ->  "240 × 240 · H 90 cm"
 * Two units separated by "|" come back on two lines.
 */
export function tidyDimensions(raw: string | null | undefined): string | null {
  if (!raw) return null
  const parts = raw
    .split('|')
    .map(p =>
      p
        .replace(/\s+/g, ' ')
        .replace(/\bL\s*:\s*/gi, 'W ')
        .replace(/\bH\s*:\s*/gi, 'H ')
        .replace(/\bD\s*:\s*/gi, 'D ')
        .replace(/\s*cm\b/gi, '')
        .replace(/\s*[x×]\s*/gi, ' × ')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .map(p => {
      // A middle dot between one measurement and the next, never after the
      // unit's own name ("3 Seater:").
      const withDots = p.replace(/(?<=\d)\s(?=[WHD]\s\d)/g, ' · ')
      return `${withDots} cm`
    })
  return parts.length ? parts.join('\n') : null
}

function specs(raw: unknown): Record<string, string> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw as Record<string, string>
}

interface Row {
  id: string
  title: string
  slug: string
  base_price: number | string
  size_label: string | null
  subgroup_label: string | null
  specifications: unknown
  variant_groups: { name: string; slug: string } | { name: string; slug: string }[] | null
  categories: { slug: string } | { slug: string }[] | null
  product_categories: { categories: { slug: string } | { slug: string }[] | null }[] | null
  product_variants: { id: string; image_url: string | null; color: string | null; priority: number | null; price_adjustment: number | null }[] | null
}

export async function getBuildCatalogue(): Promise<{ designs: BuildDesign[]; sizes: BuildSize[] }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, title, slug, base_price, size_label, subgroup_label, specifications, ' +
      'variant_groups(name, slug), ' +
      'categories!products_category_id_fkey(slug), product_categories(categories(slug)), ' +
      'product_variants(id, image_url, color, priority, price_adjustment)',
    )
    .eq('custom_made', true)
    .eq('is_active', true)

  if (error || !data) return { designs: [], sizes: [] }

  const designs: BuildDesign[] = []

  for (const row of data as unknown as Row[]) {
    const sizeKey = sizeKeyFor(row.size_label, row.title)
    if (!sizeKey) continue

    // The lead variant: what the product page shows first and prices from.
    const variants = [...(row.product_variants ?? [])].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    )
    const lead = variants[0]
    if (!lead) continue

    const group = Array.isArray(row.variant_groups) ? row.variant_groups[0] : row.variant_groups
    const family = (group?.name ?? row.title).replace(/\s+sofa$/i, '').trim().split(' ')[0]
    const familySlug = family.toLowerCase()
    const spec = specs(row.specifications)
    const size = SIZES.find(s => s.key === sizeKey)!

    designs.push({
      productId: row.id,
      variantId: lead.id,
      slug: row.slug,
      href: canonicalProductPath(row),
      title: row.title.trim(),
      family,
      familySlug,
      sizeKey,
      sizeLabel: row.size_label?.trim() || size.label,
      back: backFor(row.subgroup_label),
      price: Number(row.base_price) + Number(lead.price_adjustment ?? 0),
      image: lead.image_url,
      photographedIn: lead.color?.trim() || null,
      dimensions: tidyDimensions(spec.Dimensions ?? spec.dimensions ?? null),
      feetAsPictured: spec.Feet ?? spec.feet ?? null,
      tagline: TAGLINES[familySlug] ?? TAGLINE_FALLBACK,
    })
  }

  // Families in a stable order - by name - so the carousel does not reshuffle
  // between visits. Within a family, High Back before Scattered Back.
  designs.sort((a, b) =>
    a.family.localeCompare(b.family) ||
    a.sizeLabel.localeCompare(b.sizeLabel) ||
    (a.back ?? '').localeCompare(b.back ?? ''),
  )

  const sizes: BuildSize[] = SIZES
    .map(s => {
      const inSize = designs.filter(d => d.sizeKey === s.key)
      return {
        ...s,
        designs: new Set(inSize.map(d => d.familySlug)).size,
        from: inSize.length ? Math.min(...inSize.map(d => d.price)) : 0,
      }
    })
    .filter(s => s.designs > 0)

  return { designs, sizes }
}
