import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Replace with your actual live domain later
  const baseUrl = 'https://uksofashop.co.uk'
  const supabase = await createClient()

  // 1. Static Base Routes
  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/shop/all`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/delivery-returns`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // 2. Dynamic Category Routes
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

  // 3. Dynamic Product Routes
  const { data: products } = await supabase
    .from('products')
    .select('slug, created_at, categories(slug)')
    .eq('is_active', true)
  
  if (products) {
    products.forEach((product) => {
      const categorySlug = product.categories && !Array.isArray(product.categories) 
        ? product.categories.slug 
        : 'all'
        
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