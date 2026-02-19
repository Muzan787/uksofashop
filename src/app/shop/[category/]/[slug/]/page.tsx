// src/app/shop/[category]/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import VariantSelector from '@/components/Product/VariantSelector';

// 1. DYNAMIC METADATA: This injects the exact SEO tags for the specific sofa.
export async function generateMetadata({
  params,
}: {
  params: { slug: string; category: string }
}): Promise<Metadata> {
  const supabase = createClient()
  const { data: product } = await supabase
    .from('products')
    .select('title, description')
    .eq('slug', params.slug)
    .single()

  if (!product) return { title: 'Product Not Found' }

  return {
    title: `${product.title} | UK Sofa Shop`,
    description: product.description || `Buy the best ${product.title} at UK Sofa Shop.`,
    openGraph: {
      title: product.title,
      description: product.description || '',
      type: 'website',
    },
  }
}

// 2. SERVER COMPONENT: Fetches data directly on the server before sending to the browser.
export default async function ProductPage({
  params,
}: {
  params: { slug: string; category: string }
}) {
  const supabase = createClient()

  // Fetch product along with its variants and reviews in a single query
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*),
      reviews (*)
    `)
    .eq('slug', params.slug)
    .single()

  if (error || !product) {
    notFound() // Automatically shows the Next.js 404 page
  }

  // 3. STRUCTURED DATA (JSON-LD): Crucial for Google Rich Snippets (Star ratings in search results)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.product_variants?.[0]?.image_url || '',
    offers: {
      '@type': 'AggregateOffer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'GBP',
      lowPrice: product.base_price,
      highPrice: product.base_price + Math.max(...(product.product_variants?.map((v: any) => v.price_adjustment) || [0])),
    },
    aggregateRating: product.review_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.average_rating,
      reviewCount: product.review_count,
    } : undefined,
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-16">
      {/* Injecting Schema.org JSON-LD into the head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
        <h1>{product.title}</h1>
        <p>Base Price: £{product.base_price}</p>
        
        {/* We will build the interactive UI components here in the next step */}
        <p className="text-gray-500 mt-4">[ <VariantSelector 
          product={product} 
          variants={product.product_variants || []} 
        />]</p>
      </div>
    </main>
  )
}