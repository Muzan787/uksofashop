import { createClient } from '@supabase/supabase-js'
import { canonicalProductPath } from '@/utils/productUrl'
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
  size_label: string | null
  gallery_images: string[] | null
  categories: { slug: string; name: string } | null
  product_categories: { categories: { slug: string } | null }[] | null
  product_variants: ProductVariant[] | null
}

const BASE_URL = 'https://www.uksofashop.co.uk'
const GOOGLE_PRODUCT_CATEGORY = '460'
const SHIPPING = `
            <g:shipping>
              <g:country>GB</g:country>
              <g:price>0.00 GBP</g:price>
            </g:shipping>`

function additionalImages(gallery: string[] | null, main: string): string {
  return (gallery ?? [])
    .filter(url => url && url !== main)
    .slice(0, 10)
    .map(url => `<g:additional_image_link>${url}</g:additional_image_link>`)
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

function itemXml(kind: FeedKind, product: Product, variant: ProductVariant): string {
  const productPath = canonicalProductPath(product)
  const finalPrice = Number(product.base_price) + Number(variant.price_adjustment || 0)
  const attributes = [product.size_label, variant.color, variant.material].filter(Boolean).join(' - ')
  const variantTitle = attributes ? `${product.title} - ${attributes}` : product.title
  const imageUrl = variant.image_url || product.gallery_images?.[0] || ''

  return `
          <item>
            <g:id>${variant.id}</g:id>
            <g:item_group_id>${product.id}</g:item_group_id>
            <g:title><![CDATA[${variantTitle}]]></g:title>
            <g:description><![CDATA[${product.description || product.title}]]></g:description>
            <g:link>${variantLink(kind, productPath, variant.id)}</g:link>
            <g:image_link>${imageUrl}</g:image_link>
            ${additionalImages(product.gallery_images, imageUrl)}
            <g:condition>new</g:condition>
            <g:availability>in_stock</g:availability>
            <g:price>${finalPrice.toFixed(2)} GBP</g:price>
            <g:brand>UK Sofa Shop</g:brand>
            <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
            ${product.categories?.name ? `<g:product_type><![CDATA[${product.categories.name}]]></g:product_type>` : ''}
            ${SHIPPING}
            ${variant.sku ? `<g:mpn><![CDATA[${variant.sku}]]></g:mpn>` : ''}
            ${variant.color ? `<g:color><![CDATA[${variant.color}]]></g:color>` : ''}
            ${variant.material ? `<g:material><![CDATA[${variant.material}]]></g:material>` : ''}
            ${product.size_label ? `<g:size><![CDATA[${product.size_label}]]></g:size>` : ''}
          </item>`
}

function fallbackItemXml(product: Product): string {
  const productPath = canonicalProductPath(product)
  const imageUrl = product.gallery_images?.[0] || ''
  return `
          <item>
            <g:id>${product.id}</g:id>
            <g:title><![CDATA[${product.title}]]></g:title>
            <g:description><![CDATA[${product.description || product.title}]]></g:description>
            <g:link>${BASE_URL}${productPath}</g:link>
            <g:image_link>${imageUrl}</g:image_link>
            ${additionalImages(product.gallery_images, imageUrl)}
            <g:condition>new</g:condition>
            <g:availability>in_stock</g:availability>
            <g:price>${Number(product.base_price).toFixed(2)} GBP</g:price>
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
      id, title, slug, description, base_price, size_label, gallery_images,
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
