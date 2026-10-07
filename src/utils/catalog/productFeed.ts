import { createClient } from '@supabase/supabase-js'
import { canonicalProductPath } from '@/utils/productUrl'
import { sale } from '@/utils/pricing'
import { signOfferEntry } from '@/utils/offers/entryToken'

type FeedKind = 'google' | 'meta'

interface ProductVariant {
  id: string
  sku: string
  color: string | null
  material: string | null
  price_adjustment: number
  image_url: string | null
}

interface Product {
  id: string
  title: string
  slug: string
  description: string | null
  base_price: number
  /** products.was_price. Becomes g:price, with g:sale_price beneath it. */
  was_price: number | null
  size_label: string | null
  gallery_images: string[] | null
  categories: { slug: string; name: string } | null
  product_categories: { categories: { slug: string } | null }[] | null
  product_variants: ProductVariant[] | null
}

const BASE_URL = 'https://www.uksofashop.co.uk'

/**
 * Furniture > Sofas.
 *
 * UNVERIFIED IN THIS REPO: Google's taxonomy file is not reachable from the
 * build environment, so this ID is carried forward as-is rather than changed
 * to a guess. It is optional in the product data spec - Google classifies
 * items itself - but an INVALID id is an item-level error, so if Merchant
 * Centre ever reports one on google_product_category, check the current
 * taxonomy-with-ids file and correct it here, or drop the attribute entirely.
 */
const GOOGLE_PRODUCT_CATEGORY = '460'

/**
 * Free delivery, declared per item.
 *
 * SAME KNOWN OVERSTATEMENT AS THE PRODUCT MARKUP. "GB" is the United Kingdom,
 * and Northern Ireland, the Isle of Man, the Channel Islands, the Scottish
 * islands, the Isle of Wight and the Isles of Scilly are all CUSTOM_QUOTE at
 * checkout rather than free - see classifyDeliveryPostcode in
 * src/utils/postcode.ts, which is what place_order actually enforces.
 *
 * g:shipping can only ADD a rate for a region; the feed specification has no
 * way to exclude one. The exclusion therefore has to be set in Merchant
 * Centre's own shipping settings, and cannot be fixed in this file. Until it
 * is, a Shopping listing can promise free delivery to a Belfast postcode the
 * checkout will then refuse.
 */
const SHIPPING = `
            <g:shipping>
              <g:country>GB</g:country>
              <g:price>0.00 GBP</g:price>
            </g:shipping>`

/**
 * XML-escape a bare attribute value.
 *
 * The URLs below are interpolated into element text rather than wrapped in
 * CDATA, so an "&" in one - a Cloudinary URL carrying two transform params, a
 * second query parameter on a product link - would close nothing and produce a
 * document Merchant Centre rejects wholesale rather than per item. Nothing in
 * the catalogue contains one today, which is exactly why it would be found the
 * hard way.
 */
function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Identifiers, or an explicit statement that there are none.
 *
 * Google wants a GTIN, or an MPN together with a brand, or g:identifier_exists
 * set to "no". The variant branch emitted g:mpn only when the SKU was present
 * and nothing at all when it was not, so a variant saved without a SKU in the
 * admin panel produced an item with no identifiers and no declaration either -
 * which is a warning now and a disapproval when Google tightens. Every variant
 * has a SKU today; this is what keeps that from being load-bearing.
 */
function identifierTags(sku: string | null | undefined): string {
  const trimmed = (sku ?? '').trim()
  return trimmed
    ? `<g:mpn><![CDATA[${trimmed}]]></g:mpn>`
    : '<g:identifier_exists>no</g:identifier_exists>'
}

function additionalImages(gallery: string[] | null, main: string): string {
  return (gallery ?? [])
    .filter(url => url && url !== main)
    .slice(0, 10)
    .map(url => `<g:additional_image_link>${xml(url)}</g:additional_image_link>`)
    .join('')
}

function variantLink(kind: FeedKind, productPath: string, variantId: string): string {
  const destination = `${productPath}?variant=${variantId}`
  if (kind === 'google') return `${BASE_URL}${destination}`

  const token = signOfferEntry({
    v: 1,
    source: 'meta_catalog',
    destination,
    variantId,
  })
  return `${BASE_URL}/offer-entry/${token}`
}

/**
 * A discount, in the two tags Google and Meta both read.
 *
 * The convention is the opposite way round from the page: g:price is the
 * ORIGINAL and g:sale_price is what it costs now, and that is what produces the
 * struck-through price in a Shopping listing and in a Facebook catalogue ad.
 * Putting the current price in g:price and nothing else would advertise the
 * sofa at the sale price with no saving shown — the discount would exist on the
 * site and nowhere in the ads that bring people to it.
 *
 * Without a was price this emits exactly the single g:price it always did.
 */
function priceTags(price: number, wasPrice: number | null): string {
  if (wasPrice && wasPrice > price) {
    return `<g:price>${wasPrice.toFixed(2)} GBP</g:price>
            <g:sale_price>${price.toFixed(2)} GBP</g:sale_price>`
  }
  return `<g:price>${price.toFixed(2)} GBP</g:price>`
}

/**
 * An item with no picture is not a feed entry, it is a disapproval.
 *
 * image_link is required by both Google and Meta, and the old code resolved a
 * missing image to '' and emitted `<g:image_link></g:image_link>` anyway. That
 * does not fail the feed: the document parses, the item is accepted, and then
 * it is rejected downstream where nobody is looking. Returning '' here drops
 * the item from the feed instead, which is the same outcome Merchant Centre
 * would reach but visible in the build log. Every variant has an image today.
 */
function itemXml(kind: FeedKind, product: Product, variant: ProductVariant): string {
  const productPath = canonicalProductPath(product)
  const priced = sale(product.base_price, product.was_price, variant.price_adjustment)
  const finalPrice = priced.price
  const attributes = [product.size_label, variant.color, variant.material].filter(Boolean).join(' - ')
  const variantTitle = attributes ? `${product.title} - ${attributes}` : product.title
  const imageUrl = (variant.image_url || product.gallery_images?.[0] || '').trim()
  if (!imageUrl) {
    console.warn(`[feed] skipped variant ${variant.id} of "${product.title}": no image`)
    return ''
  }

  return `
          <item>
            <g:id>${variant.id}</g:id>
            <g:item_group_id>${product.id}</g:item_group_id>
            <g:title><![CDATA[${variantTitle}]]></g:title>
            <g:description><![CDATA[${product.description || product.title}]]></g:description>
            <g:link>${xml(variantLink(kind, productPath, variant.id))}</g:link>
            <g:image_link>${xml(imageUrl)}</g:image_link>
            ${additionalImages(product.gallery_images, imageUrl)}
            <g:condition>new</g:condition>
            <g:availability>in_stock</g:availability>
            ${priceTags(finalPrice, priced.wasPrice)}
            <g:brand>UK Sofa Shop</g:brand>
            <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
            ${product.categories?.name ? `<g:product_type><![CDATA[${product.categories.name}]]></g:product_type>` : ''}
            ${SHIPPING}
            ${identifierTags(variant.sku)}
            ${variant.color ? `<g:color><![CDATA[${variant.color}]]></g:color>` : ''}
            ${variant.material ? `<g:material><![CDATA[${variant.material}]]></g:material>` : ''}
            ${product.size_label ? `<g:size><![CDATA[${product.size_label}]]></g:size>` : ''}
          </item>`
}

function fallbackItemXml(product: Product): string {
  const productPath = canonicalProductPath(product)
  const imageUrl = (product.gallery_images?.[0] || '').trim()
  if (!imageUrl) {
    console.warn(`[feed] skipped product "${product.title}": no variants and no gallery image`)
    return ''
  }
  const priced = sale(product.base_price, product.was_price)
  return `
          <item>
            <g:id>${product.id}</g:id>
            <g:title><![CDATA[${product.title}]]></g:title>
            <g:description><![CDATA[${product.description || product.title}]]></g:description>
            <g:link>${xml(`${BASE_URL}${productPath}`)}</g:link>
            <g:image_link>${xml(imageUrl)}</g:image_link>
            ${additionalImages(product.gallery_images, imageUrl)}
            <g:condition>new</g:condition>
            <g:availability>in_stock</g:availability>
            ${priceTags(priced.price, priced.wasPrice)}
            <g:brand>UK Sofa Shop</g:brand>
            <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
            ${product.categories?.name ? `<g:product_type><![CDATA[${product.categories.name}]]></g:product_type>` : ''}
            ${SHIPPING}
            <g:identifier_exists>no</g:identifier_exists>
            ${product.size_label ? `<g:size><![CDATA[${product.size_label}]]></g:size>` : ''}
          </item>`
}

export async function buildProductFeed(kind: FeedKind): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing Supabase credentials', { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, title, slug, description, base_price, was_price, size_label, gallery_images,
      categories!products_category_id_fkey ( slug, name ),
      product_categories ( categories ( slug ) ),
      product_variants ( id, sku, color, material, price_adjustment, image_url )
    `)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching products for feed:', error)
    return new Response('Error generating feed', { status: 500 })
  }

  const products = data as unknown as Product[]
  let items = ''
  for (const product of products) {
    if (product.product_variants?.length) {
      for (const variant of product.product_variants) items += itemXml(kind, product, variant)
    } else if (kind === 'google') {
      // Meta's trusted catalogue contract is variant-bound. A product without
      // a sellable variant is deliberately absent there; Google retains the
      // established base-product fallback.
      items += fallbackItemXml(product)
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
      <channel>
        <title>UK Sofa Shop</title>
        <link>${BASE_URL}</link>
        <description>Premium Sofas and Furniture from UK Sofa Shop</description>
        ${items}
      </channel>
    </rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  })
}
