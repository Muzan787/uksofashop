// src/utils/catalogue.ts
//
// The catalogue admin's rules that need no database (admin upgrade K1-K3):
// a web address from a name, what a product is flagged for in the list, the
// list's search, and save_product()'s refusals as sentences beside the field.
// Pure, so they are tested.

/** "Verona 3 Seater (Grey)" -> "verona-3-seater-grey". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

/**
 * Search title and description: what search results show, roughly. The shop
 * adds " | UK Sofa Shop" (15 characters) after every title, so the title
 * guide is 60 less that.
 */
export const SEO_TITLE_GUIDE = 45
export const SEO_DESCRIPTION_GUIDE = 155
export const SEO_TITLE_MAX = 120
export const SEO_DESCRIPTION_MAX = 320

export interface ListProduct {
  title: string
  is_active: boolean | null
  is_featured: boolean | null
  custom_made: boolean | null
  size_label: string | null
  gallery_images: string[] | null
  specifications: unknown
  variant_group: string | null
  product_variants: { sku: string; color: string | null; color_hex: string | null; image_url: string | null; is_active: boolean | null }[]
}

export type ProductFlag = 'hidden' | 'featured' | 'made-to-order' | 'no-photo' | 'no-size'

/** The product's size as the shop shows it: its Dimensions line. */
export function productSize(p: Pick<ListProduct, 'specifications'>): string | null {
  const specs = p.specifications && typeof p.specifications === 'object' ? (p.specifications as Record<string, unknown>) : {}
  const value = specs.Dimensions
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function productFlags(p: ListProduct): ProductFlag[] {
  const flags: ProductFlag[] = []
  if (!p.is_active) flags.push('hidden')
  if (p.is_featured) flags.push('featured')
  if (p.custom_made) flags.push('made-to-order')
  const shown = p.product_variants.filter(v => v.is_active !== false)
  if (!shown.some(v => v.image_url) && !(p.gallery_images ?? []).length) flags.push('no-photo')
  if (!productSize(p)) flags.push('no-size')
  return flags
}

/** Missing a photo or a size: the list's "Needs attention". */
export function needsAttention(p: ListProduct): boolean {
  const flags = productFlags(p)
  return flags.includes('no-photo') || flags.includes('no-size')
}

/** Name, range, colour or SKU, any order, any case. */
export function matchesSearch(p: ListProduct, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = [
    p.title,
    p.variant_group ?? '',
    p.size_label ?? '',
    ...p.product_variants.flatMap(v => [v.sku, v.color ?? '']),
  ].join(' ').toLowerCase()
  return words.every(w => haystack.includes(w))
}

export type EditorField =
  | 'title' | 'slug' | 'base_price' | 'was_price' | 'description' | 'origin' | 'range' | 'size_label'
  | 'main_collection' | 'categories' | 'tier' | 'seo_title' | 'seo_description' | 'specifications'
  | 'colourways' | 'form'

/**
 * save_product()'s refusal, as a sentence and the field it belongs beside.
 * `detail` is the SKU (or the row number) for a colourway refusal.
 */
export function saveRefusal(message: string, detail: string | null | undefined): { field: EditorField; text: string; sku?: string } {
  const code = (message.match(/[A-Z][A-Z_]{3,}/) ?? [''])[0]
  const sku = detail?.trim() || undefined
  switch (code) {
    case 'TITLE_SHORT': return { field: 'title', text: 'Give the product a name of at least 3 letters.' }
    case 'SLUG_INVALID': return { field: 'slug', text: 'The web address can only have small letters, numbers and single dashes.' }
    case 'SLUG_TAKEN': return { field: 'slug', text: 'Another product already uses this web address. Change it slightly.' }
    case 'PRICE_INVALID': return { field: 'base_price', text: 'The price has to be a number above £0.' }
    case 'WAS_PRICE_LOW': return { field: 'was_price', text: 'The was price has to be higher than the price. Leave it blank for no discount.' }
    case 'DESCRIPTION_REQUIRED': return { field: 'description', text: 'Write a description: it is the main text on the product page.' }
    case 'ORIGIN_INVALID': return { field: 'origin', text: 'Choose where it is made from the list.' }
    case 'GROUP_UNKNOWN': return { field: 'range', text: 'That range no longer exists. Pick another, or none.' }
    case 'SIZE_LABEL_REQUIRED': return { field: 'size_label', text: 'A product in a range needs its size label, e.g. "3 Seater" or "Corner".' }
    case 'COLLECTION_UNKNOWN': return { field: 'main_collection', text: 'That collection no longer exists. Pick another, or none.' }
    case 'SEO_TITLE_LONG': return { field: 'seo_title', text: `Keep the search title under ${SEO_TITLE_MAX} characters (${SEO_TITLE_GUIDE} is what search results show).` }
    case 'SEO_DESCRIPTION_LONG': return { field: 'seo_description', text: `Keep the search description under ${SEO_DESCRIPTION_MAX} characters (${SEO_DESCRIPTION_GUIDE} is what search results show).` }
    case 'SPECIFICATIONS_INVALID': return { field: 'specifications', text: 'The specifications could not be read. Check each line has a name.' }
    case 'NO_CATEGORY': return { field: 'categories', text: 'Tick at least one category, so the product has somewhere to live.' }
    case 'CATEGORY_UNKNOWN': return { field: 'categories', text: 'One of the ticked categories no longer exists. Reload the page.' }
    case 'TIER_INVALID': return { field: 'tier', text: 'Choose an offer tier from the list.' }
    case 'NO_COLOURWAYS': return { field: 'colourways', text: 'Add at least one colourway.' }
    case 'NO_SHOWN_COLOURWAYS': return { field: 'colourways', text: 'A product in the shop needs at least one colourway that is shown. Show one, or hide the product.' }
    case 'SKU_REQUIRED': return { field: 'colourways', text: `Colourway ${sku ?? ''} needs a SKU.`.replace('  ', ' ') }
    case 'SKU_DUPLICATE': return { field: 'colourways', sku, text: `The SKU ${sku} is used twice on this product. Each colourway needs its own.` }
    case 'SKU_TAKEN': return { field: 'colourways', sku, text: `The SKU ${sku} is already used by another colourway. Each SKU can only be used once, even on hidden colourways.` }
    case 'COLOUR_NAME_REQUIRED': return { field: 'colourways', sku, text: `Colourway ${sku} needs a colour name, e.g. "Grey".` }
    case 'BAD_COLOUR': return { field: 'colourways', sku, text: `The swatch colour for ${sku} isn't a colour. Pick it with the colour box.` }
    case 'PRICE_DIFFERENCE_INVALID': return { field: 'colourways', sku, text: `The price difference for ${sku} has to be a number, e.g. 0 or 50.` }
    case 'VARIANT_UNKNOWN': return { field: 'colourways', sku, text: `Colourway ${sku} has changed since this page opened. Reload and try again.` }
    case 'NOT_FOUND': return { field: 'form', text: 'This product no longer exists.' }
    case 'NOT_AUTHORISED': return { field: 'form', text: 'You are not signed in as an admin any more. Sign in again.' }
    default: return { field: 'form', text: "That didn't save. Try again in a moment." }
  }
}

/** Why something can't be deleted, from the delete_* functions. */
export function deleteRefusal(message: string, detail: string | null | undefined, what: string): string {
  if (message.includes('PRODUCT_ORDERED')) return 'This product has been ordered, so it can only be hidden, never deleted.'
  if (message.includes('PRODUCT_HAS_REVIEWS')) return `This product has ${detail ?? 'some'} review${detail === '1' ? '' : 's'}. Hide it instead, so the reviews are kept.`
  if (message.includes('IN_USE')) return `This ${what} is still used by ${detail ?? 'something'}. Move ${detail?.startsWith('1 ') ? 'it' : 'them'} first, or hide the ${what} instead.`
  if (message.includes('NOT_FOUND')) return `This ${what} no longer exists.`
  if (message.includes('NOT_AUTHORISED')) return 'You are not signed in as an admin any more. Sign in again.'
  return "That didn't delete. Try again in a moment."
}
