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
    const match = variants.find(v => v.color?.toLowerCase() === wanted.toLowerCase())
    if (!match) {
      const have = variants.map(v => v.color).filter(Boolean).join(', ') || 'none'
      throw new Error(`"${product.slug}" has no photographed "${wanted}" variant. Colours with photos: ${have}.`)
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
 *   - a "✓" value reads as "Yes"
 *   - a Dimensions string that lists several pieces separated by "|" becomes
 *     one row per piece, keyed by the piece ("3 Seater", "2 Seater")
 *   - everything else is shown as typed, capped at `limit` rows
 */
export function specRows(product: Product, limit = 4): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = []
  const specs = product.specifications ?? {}

  for (const [key, raw] of Object.entries(specs)) {
    if (raw === null || raw === undefined || raw === '') continue
    const value = typeof raw === 'string' ? raw.trim() : String(raw)

    if (value === '✓' || value.toLowerCase() === 'true') {
      rows.push({ key, value: 'Yes' })
      continue
    }

    if (value.includes('|')) {
      for (const part of value.split('|')) {
        const piece = part.trim()
        const colon = piece.indexOf(':')
        const looksLabelled = colon > 0 && !/^[LHWD]:/i.test(piece)
        rows.push(
          looksLabelled
            ? { key: piece.slice(0, colon).trim(), value: piece.slice(colon + 1).trim() }
            : { key, value: piece },
        )
      }
      continue
    }

    rows.push({ key, value })
  }

  return rows.slice(0, limit)
}
