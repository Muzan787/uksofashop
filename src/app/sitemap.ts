export const dynamic = 'force-dynamic'

import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.uksofashop.co.uk'
  const supabase = await createClient()

  // 1. Static Routes
  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/shop/all`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/delivery-returns`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/track-order`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  // 2. Fetch Categories
  const { data: categories } = await supabase.from('categories').select('slug, created_at')
  
  if (categories) {
    categories.forEach((cat) => {
      routes.push({
        url: `${baseUrl}/shop/${cat.slug}`,
        lastModified: new Date(cat.created_at || new Date()),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    })
  }

  // 3. Fetch Products (FIXED: Explicitly telling Supabase which relationship to use)
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      slug, 
      created_at, 
      categories!products_category_id_fkey ( slug )
    `)
    .eq('is_active', true) // Added the active check back in!
  
  if (error) {
    console.error("🚨 SITEMAP SUPABASE ERROR:", error.message, error.details)
  }

  if (products) {
    products.forEach((product) => {
      // Safely extract the nested category slug
      let categorySlug = 'all'
      if (product.categories && !Array.isArray(product.categories) && product.categories.slug) {
        categorySlug = product.categories.slug
      }
        
      routes.push({
        url: `${baseUrl}/shop/${categorySlug}/${product.slug}`,
        lastModified: new Date(product.created_at || new Date()),
        changeFrequency: 'daily',
        priority: 0.7,
      })
    })
  }

  return routes
}