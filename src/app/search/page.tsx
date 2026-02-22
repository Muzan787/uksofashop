// src/app/search/page.tsx
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Search } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function SearchPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';
  const supabase = await createClient()

  // Initialize an empty array for products
  let products: any[] = [];

  if (query) {
    // Search the products table where the title OR description matches the query
    // We also fetch the related category slug so we can construct the correct URL
    const { data } = await supabase
      .from('products')
      .select(`
        id, 
        title, 
        slug, 
        base_price, 
        product_variants(image_url),
        categories!inner(slug)
      `)
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
      
    if (data) products = data;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10 min-h-screen">
      <div className="mb-8 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-bold text-stone-900">
          Search Results for &quot;<span className="text-amber-600">{query}</span>&quot;
        </h1>
        <p className="text-stone-500 mt-2">
          {products.length} {products.length === 1 ? 'product' : 'products'} found
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            // Safely extract the first variant image if it exists
            const displayImage = Array.isArray(product.product_variants) && product.product_variants.length > 0 
              ? product.product_variants[0].image_url 
              : '/placeholder-sofa.jpg';
            
            // Extract the category slug for the link routing
            const categorySlug = product.categories && !Array.isArray(product.categories) 
              ? product.categories.slug 
              : 'all';

            return (
              <Link href={`/shop/${categorySlug}/${product.slug}`} key={product.id} className="group block">
                <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden mb-4 relative">
                  <img 
                    src={displayImage} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="text-lg font-medium text-stone-900 line-clamp-1">{product.title}</h3>
                <p className="text-amber-700 font-semibold mt-1">£{product.base_price.toFixed(2)}</p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-stone-50 rounded-2xl border border-stone-100">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-stone-200">
            <Search className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">No results found</h2>
          <p className="text-stone-500 max-w-md">
            We couldn't find anything matching "{query}". Try checking for spelling errors or using more general terms.
          </p>
          <Link href="/shop/all" className="mt-6 bg-stone-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-stone-800 transition">
            Browse All Sofas
          </Link>
        </div>
      )}
    </main>
  )
}