// scripts/social/lib/products.ts
//
// Reads a product straight from Supabase so a post is made from a slug and
// nothing else. Uses the anon key: products, variants and variant groups are
// public catalogue data, readable by every visitor, so the script needs no
// more authority than the storefront has.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/types/supabase.ts'

export type ProductVariant = {
  color: string | null
  color_hex: string | null
  material: string | null
  image_url: string | null
  priority: number | null
  price_adjustment: number | null
}

export type Product = {
  slug: string
  title: string
  base_price: number
  size_label: string | null
  subgroup_label: string | null
  custom_made: boolean
  specifications: Record<string, unknown> | null
  gallery_images: string[] | null
  product_variants: ProductVariant[]
  variant_groups: { name: string; subgroup_title: string } | null
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
        'Run through `npm run social`, which loads .env.',
    )
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const SELECT =
  'slug, title, base_price, size_label, subgroup_label, custom_made, specifications, gallery_images, ' +
  'product_variants(color, color_hex, material, image_url, priority, price_adjustment), ' +
  'variant_groups(name, subgroup_title)'

export async function fetchProduct(slug: string): Promise<Product> {
  const { data, error } = await client()
    .from('products')
    .select(SELECT)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`Supabase: ${error.message}`)
  if (!data) throw new Error(`No product with slug "${slug}". Run with --list to see them.`)

  const specifications =
    data.specifications && typeof data.specifications === 'object' && !Array.isArray(data.specifications)
      ? (data.specifications as Record<string, unknown>)
      : null

  return { ...data, specifications }
}

export async function listProductSlugs(): Promise<{ slug: string; title: string }[]> {
  const { data, error } = await client()
    .from('products')
    .select('slug, title')
    .eq('is_active', true)
    .order('title')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return data
}

/**
 * The variants that have a photograph, lowest priority first — the same
 * order the product gallery uses to pick its lead image.
 */
export function photographedVariants(product: Product): ProductVariant[] {
  return [...product.product_variants]
    .filter(v => v.image_url)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
}

/**
 * Resolve what the user typed for an image into a URL.
 *
 *   - a URL is used as-is (a generated room scene, a fabric close-up)
 *   - a colour name picks that variant's photograph
 *   - nothing picks the lead variant, then the first gallery image
 *
 * Returns the URL and, when it came from a variant, the variant's colour so
 * the split template can label a pane "Grey" without being told to.
 */
export function resolveImage(
  product: Product,
  wanted?: string | null,
): { url: string; label?: string } {
  if (wanted && /^https?:\/\//i.test(wanted)) return { url: wanted }

  const variants = photographedVariants(product)

  if (wanted) {
    // "Grey" matches by colour; "Grey Fabric" or "Fabric Grey" matches colour
    // and material, for families that offer the same colour in two cloths.
    const norm = (v: string | null | undefined) => (v ?? '').trim().toLowerCase()
    const want = norm(wanted)
    const match =
      variants.find(v => norm(v.color) === want) ??
      variants.find(v => `${norm(v.color)} ${norm(v.material)}` === want) ??
      variants.find(v => `${norm(v.material)} ${norm(v.color)}` === want)
    if (!match) {
      const have = variants.map(v => [v.color, v.material].filter(Boolean).join(' ')).join(', ') || 'none'
      throw new Error(`"${product.slug}" has no photographed "${wanted}" variant. Variants with photos: ${have}.`)
    }
    return { url: match.image_url!, label: match.color ?? undefined }
  }

  const lead = variants[0]
  if (lead) return { url: lead.image_url!, label: lead.color ?? undefined }

  const gallery = product.gallery_images?.[0]
  if (gallery) return { url: gallery }

  throw new Error(`"${product.slug}" has no photograph on any variant or in its gallery. Pass --image <url>.`)
}

/** £549, or "From £549" when a variant costs more than the base. */
export function formatPrice(product: Product): string {
  const money = `£${Math.round(product.base_price).toLocaleString('en-GB')}`
  const varies = product.product_variants.some(v => (v.price_adjustment ?? 0) > 0)
  return varies ? `From ${money}` : money
}

/**
 * The specifications JSON as rows for the spec card. The admin panel stores
 * free-form keys, so this only tidies what it finds:
 *
 *   - every "✓" row is gathered into one row keyed "Included", so a recliner's
 *     USB port, LED lights and cup holders take one line rather than three
 *   - a Dimensions string that lists several pieces (separated by "|" or by
 *     line breaks) becomes one row per piece, keyed by the piece ("3 Seater",
 *     "2 Seater")
 *   - a string of "Label: number" pieces ("Length:169 | Width:94") becomes one
 *     row reading "Length 169 · Width 94"
 *   - a "Style" row goes last: it is the least informative line on the card,
 *     so it is the one to lose when there are more rows than fit
 *   - everything else is shown as typed, capped at `limit` rows
 */
export function specRows(product: Product, limit = 5): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = []
  const included: string[] = []
  const styleRows: { key: string; value: string }[] = []
  const specs = product.specifications ?? {}

  // The admin panel stores keys as typed, so "dimensions" and "Dimensions"
  // both occur; tabs and doubled spaces do too.
  const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()
  const isMeasure = (text: string) => /(^|\s)[LHWD]\s*:/i.test(text)

  for (const [rawKey, raw] of Object.entries(specs)) {
    if (raw === null || raw === undefined || raw === '') continue
    const key = tidy(rawKey).replace(/^./, c => c.toUpperCase())
    const source = typeof raw === 'string' ? raw : String(raw)
    const value = tidy(source)

    if (value === '✓' || value.toLowerCase() === 'true') {
      included.push(key.replace(/\s*included$/i, ''))
      continue
    }

    if (/[|\n]/.test(source)) {
      // Pieces are separated by "|" or by line breaks. A label on a line of
      // its own ("3-Seater") belongs to the measurement on the next line.
      const parts = source.split(/\||\r?\n/).map(tidy).filter(Boolean)
      const pieces: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const next = parts[i + 1]
        if (!isMeasure(parts[i]) && next && /^[LHWD]\s*:/i.test(next)) {
          pieces.push(`${parts[i]} ${next}`)
          i++
        } else {
          pieces.push(parts[i])
        }
      }

      // "Length:169 | Width:94 | Height:94" — one measurement per piece, so
      // they read better as one row than as three rows all keyed Dimensions.
      const labelledNumbers = pieces.map(piece => piece.match(/^([A-Za-z][A-Za-z ]*?)\s*:\s*(\d\S*)$/))
      if (labelledNumbers.every(Boolean)) {
        rows.push({ key, value: labelledNumbers.map(m => `${m![1].trim()} ${m![2]}`).join(' · ') })
        continue
      }

      for (const piece of pieces) {
        // "3 Seater: L:198cm ..." or "3-Seater  L:198 cm ..." — the piece
        // name is whatever precedes the first L:/H:/W:/D: measurement.
        const labelled = piece.match(/^(.+?)\s*:?\s+((?:[LHWD]\s*:).*)$/i)
        rows.push(labelled ? { key: labelled[1].trim(), value: labelled[2] } : { key, value: piece })
      }
      continue
    }

    if (key.toLowerCase() === 'style') {
      styleRows.push({ key, value })
      continue
    }

    rows.push({ key, value })
  }

  if (included.length) rows.push({ key: 'Included', value: included.join(' · ') })
  return [...rows, ...styleRows].slice(0, limit)
}
