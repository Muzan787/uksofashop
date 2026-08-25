// src/app/feeds/google-merchant.xml/route.ts
//
// Google Merchant Centre product feed.
//
// Moved here from /api/google-merchant, which robots.ts disallowed via its
// blanket "/api/" rule - Merchant Centre respects robots.txt when fetching a
// scheduled feed, so the old location could never be read.
//
// Feed URL: https://www.uksofashop.co.uk/feeds/google-merchant.xml

import { createAdminClient } from '@/utils/supabase/admin'
import { canonicalProductPath } from '@/utils/productUrl'
import { SITE_URL, ORGANISATION_NAME } from '@/utils/schema'

// Products and prices change rarely - there is no stock to track, because
// everything is made to order. Merchant Centre fetches on its own schedule
// (typically daily), so an hour of caching is plenty and keeps the database
// out of the path for repeat fetches.
export const revalidate = 3600

interface ProductVariant {
  id: string
  sku: string | null
  color: string | null
  material: string | null
  price_adjustment: number | null
  image_url: string | null
}

interface Product {
  id: string
  title: string
  slug: string
  description: string | null
  base_price: number
  size_label: string | null
  gallery_images: string[] | null
  categories: { slug: string; name: string } | null
  product_categories: { categories: { slug: string; name: string } | null }[] | null
  product_variants: ProductVariant[] | null
}

/** XML-escape for attribute and element text outside CDATA. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wrap text in CDATA safely.
 *
 * A literal "]]>" inside the content would close the section early and break
 * the whole feed, so it's split across two CDATA sections - the standard
 * escape. HTML is stripped because Merchant Centre wants plain text and will
 * flag markup in a description.
 */
function cdata(raw: string | null | undefined, maxLength: number): string {
  const text = (raw ?? '')
    .replace(/<[^>]*>/g, ' ')          // strip any HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)

  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/**
 * Google's product taxonomy. Armchairs are Chairs; everything else here is a
 * sofa. Using the most specific matching value materially affects where an
 * item can show in Shopping.
 *   635  Furniture > Sofas
 *   6362 Furniture > Chairs
 */
function googleProductCategory(title: string): number {
  return /\barm\s?chair\b/i.test(title) ? 6362 : 635
}

export async function GET(): Promise<Response> {
  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return new Response('Missing Supabase credentials', { status: 500 })
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, title, slug, description, base_price, size_label, gallery_images,
      categories!products_category_id_fkey ( slug, name ),
      product_categories ( categories ( slug, name ) ),
      product_variants ( id, sku, color, material, price_adjustment, image_url )
    `)
    .eq('is_active', true)

  if (error) {
    console.error('Merchant feed query failed:', error.message)
    return new Response('Error generating feed', { status: 500 })
  }

  const products = data as unknown as Product[]
  let itemsXml = ''
  let skipped = 0

  for (const product of products) {
    // Same helper as the sitemap and the product page, so feed links always
    // match the canonical URL the site itself advertises.
    const productUrl = `${SITE_URL}${canonicalProductPath(product)}`

    const description = cdata(product.description || product.title, 5000)
    const gpc = googleProductCategory(product.title)

    // Our own taxonomy, from the product's primary category.
    const primaryCategory =
      product.categories?.name ??
      product.product_categories?.[0]?.categories?.name ??
      'Sofas'
    const productType = `Sofas > ${primaryCategory}`

    // Free to UK Mainland, ground floor. Must match the account-level shipping
    // settings in Merchant Centre or items get flagged for a mismatch.
    const shipping = `
            <g:shipping>
              <g:country>GB</g:country>
              <g:service>UK Mainland</g:service>
              <g:price>0.00 GBP</g:price>
            </g:shipping>
            <g:min_handling_time>0</g:min_handling_time>
            <g:max_handling_time>1</g:max_handling_time>
            <g:min_transit_time>2</g:min_transit_time>
            <g:max_transit_time>4</g:max_transit_time>`

    const common = (title: string, link: string, imageUrl: string, price: string) => `
            <g:title>${cdata(title, 150)}</g:title>
            <g:description>${description}</g:description>
            <g:link>${esc(link)}</g:link>
            <g:image_link>${esc(imageUrl)}</g:image_link>
            <g:condition>new</g:condition>
            <!-- Everything is made to order, so anything active is available.
                 Stock counts are not tracked. -->
            <g:availability>in_stock</g:availability>
            <g:price>${price} GBP</g:price>
            <g:brand>${esc(ORGANISATION_NAME)}</g:brand>
            <g:google_product_category>${gpc}</g:google_product_category>
            <g:product_type>${cdata(productType, 750)}</g:product_type>${shipping}`

    const variants = product.product_variants ?? []

    if (variants.length > 0) {
      for (const variant of variants) {
        const finalPrice = Number(product.base_price) + Number(variant.price_adjustment || 0)
        const imageUrl = variant.image_url || product.gallery_images?.[0] || ''

        // An item without an image is rejected outright, so skip rather than
        // submit something guaranteed to be disapproved.
        if (!imageUrl) { skipped++; continue }

        const attributes = [product.size_label, variant.color, variant.material].filter(Boolean).join(' - ')
        const variantTitle = attributes ? `${product.title} - ${attributes}` : product.title

        // We have no GTINs. Brand + MPN satisfies Google's identifier
        // requirement; where there is no SKU either, identifier_exists must
        // say so explicitly or the item is disapproved.
        const identifiers = variant.sku
          ? `\n            <g:mpn>${cdata(variant.sku, 70)}</g:mpn>`
          : `\n            <g:identifier_exists>no</g:identifier_exists>`

        itemsXml += `
          <item>
            <g:id>${esc(variant.id)}</g:id>
            <g:item_group_id>${esc(product.id)}</g:item_group_id>${common(variantTitle, `${productUrl}?variant=${variant.id}`, imageUrl, finalPrice.toFixed(2))}${identifiers}${variant.color ? `\n            <g:color>${cdata(variant.color, 100)}</g:color>` : ''}${variant.material ? `\n            <g:material>${cdata(variant.material, 200)}</g:material>` : ''}${product.size_label ? `\n            <g:size>${cdata(product.size_label, 100)}</g:size>` : ''}
          </item>`
      }
    } else {
      const imageUrl = product.gallery_images?.[0] || ''
      if (!imageUrl) { skipped++; continue }

      itemsXml += `
          <item>
            <g:id>${esc(product.id)}</g:id>${common(product.title, productUrl, imageUrl, Number(product.base_price).toFixed(2))}
            <!-- No variant, so no SKU to use as an MPN and no GTIN exists. -->
            <g:identifier_exists>no</g:identifier_exists>${product.size_label ? `\n            <g:size>${cdata(product.size_label, 100)}</g:size>` : ''}
          </item>`
    }
  }

  if (skipped > 0) {
    console.warn(`Merchant feed: skipped ${skipped} item(s) with no image.`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${cdata(ORGANISATION_NAME, 150)}</title>
    <link>${esc(SITE_URL)}</link>
    <description>${cdata('Sofas and recliners with free UK Mainland delivery and cash on delivery.', 5000)}</description>${itemsXml}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Matches `revalidate` above; lets a CDN serve repeat fetches and keep
      // returning the old feed briefly while a new one is generated.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
