export const dynamic = 'force-dynamic'

import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'
import { canonicalProductPath } from '@/utils/productUrl'
import { SITE_URL } from '@/constants/site'

// Every static route that should be indexed. Pages carrying
// `robots: { index: false }` are deliberately absent - listing a noindexed URL
// in a sitemap asks Google to crawl something we have told it to drop, which
// is reported as a "Submitted URL marked noindex" error in Search Console.
//
// Excluded for that reason: /search, /track-order, /checkout, /account,
// /wishlist, /login, /signup, /confirm-order/*, and everything under /admin.
//
// /journal and /careers belong to that list too, and used to be in this array
// anyway - both send noindex, so Search Console reported both as "Submitted URL
// marked noindex". Adding a path here is only correct once the page indexes:
// publishing the first Journal article, or opening a real vacancy, is what
// removes its noindex and earns it a line below.
//
// No changeFrequency or priority: Google has ignored both for years, and
// wrong values are worse than none because they invite the reader to trust
// them. lastModified is the only hint that still carries weight.
const STATIC_PATHS = [
  '/',
  '/shop/all',
  '/collection',
  '/about',
  '/contact',
  '/showroom',
  '/reviews',
  '/delivery-returns',
  '/faq',
  '/size-guide',
  '/care-guide',
  '/fabrics',
  '/terms',
  '/privacy',
  '/cookies',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const now = new Date()

  const routes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified: now,
  }))

  // ── Categories ────────────────────────────────────────────────────────────
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, created_at')

  categories?.forEach((cat) => {
    if (!cat.slug) return
    routes.push({
      url: `${SITE_URL}/shop/${cat.slug}`,
      lastModified: new Date(cat.created_at || now),
    })
  })

  // ── Collections ───────────────────────────────────────────────────────────
  const { data: collections } = await supabase
    .from('variant_groups')
    .select('slug, created_at')

  collections?.forEach((group) => {
    if (!group.slug) return
    routes.push({
      url: `${SITE_URL}/collection/${group.slug}`,
      lastModified: new Date(group.created_at || now),
    })
  })

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      slug,
      created_at,
      categories!products_category_id_fkey ( slug ),
      product_categories ( categories ( slug ) )
    `)
    .eq('is_active', true)

  if (error) {
    console.error('🚨 SITEMAP SUPABASE ERROR:', error.message, error.details)
  }

  products?.forEach((product) => {
    // The same helper the product page and the Merchant feed use, so all three
    // can never disagree about a product URL again.
    routes.push({
      url: `${SITE_URL}${canonicalProductPath(product)}`,
      lastModified: new Date(product.created_at || now),
    })
  })

  return routes
}
