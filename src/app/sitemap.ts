export const dynamic = 'force-dynamic'

import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'
import { canonicalProductPath } from '@/utils/productUrl'
import { SITE_URL } from '@/constants/site'
import { ARTICLES } from './journal/articles'

// Every static route that should be indexed. Pages carrying
// `robots: { index: false }` are deliberately absent - listing a noindexed URL
// in a sitemap asks Google to crawl something we have told it to drop, which
// is reported as a "Submitted URL marked noindex" error in Search Console.
//
// Excluded for that reason: /search, /track-order, /checkout, /account,
// /wishlist, /login, /signup, /confirm-order/*, and everything under /admin.
//
// /journal and /careers both used to sit in this array while both sent
// noindex, which Search Console reported as "Submitted URL marked noindex".
// /journal has since earned its place back the only way that counts - three
// articles were written and the noindex came off. Its article URLs are
// appended below from the same registry the pages themselves render from, so
// a fourth article is listed here the moment it exists.
//
// /careers is still out, and still noindex. Opening a real vacancy is what
// puts it back.
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
  '/journal',
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

  // ── Journal ───────────────────────────────────────────────────────────────
  // Hand-written pages rather than database rows, so `updated` on each entry
  // is the lastModified - there is no created_at to read.
  ARTICLES.forEach((article) => {
    routes.push({
      url: `${SITE_URL}/journal/${article.slug}`,
      lastModified: new Date(article.updated),
    })
  })

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
