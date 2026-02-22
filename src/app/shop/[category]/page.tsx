// src/app/shop/[category]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import FilterSidebar from '@/components/Category/FilterSidebar'
import Pagination from '@/components/UI/Pagination'
import Link from 'next/link'
import Image from 'next/image'
import { PackageSearch } from 'lucide-react'

type Params = Promise<{ category: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// --- ADD THIS NEW FUNCTION ---
export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const params = await props.params;
  const supabase = await createClient()
  
  const { data: categoryData } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', params.category)
    .single()

  if (!categoryData) return { title: 'Category Not Found | UK Sofa Shop' }

  return {
    title: `Premium ${categoryData.name} | Free UK Delivery | UK Sofa Shop`,
    description: `Shop our premium collection of ${categoryData.name.toLowerCase()}. Free delivery to UK mainland on orders over £500. Cash on delivery available.`,
    alternates: {
      canonical: `/shop/${params.category}`
    }
  }
}

const ITEMS_PER_PAGE = 6; 

export default async function CategoryPage(props: { params: Params; searchParams: SearchParams }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  let categoryData = null;

  // 1. Only fetch category if the slug is NOT "all"
  if (params.category !== 'all') {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('slug', params.category)
      .single()

    if (!data) return <div className="text-center py-20 text-2xl font-semibold">Category not found</div>
    categoryData = data;
  }

  // 2. Determine current page and calculate range
  const currentPage = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  // 3. Setup the base query asking for an exact count
  let query = supabase
    .from('products')
    .select('id, title, slug, base_price, image_url:product_variants!inner(image_url)', { count: 'exact' })
    .eq('is_active', true)

  // 4. Apply category filter ONLY if a specific category was found
  if (categoryData) {
    query = query.eq('category_id', categoryData.id)
  }

  // Apply Filters
  if (typeof searchParams.style === 'string') {
    query = query.filter('specifications->>style', 'ilike', searchParams.style)
  }
  if (typeof searchParams.material === 'string') {
    query = query.filter('specifications->>material', 'ilike', searchParams.material)
  }

  // 5. Apply the range and execute
  const { data: products, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  // Calculate total pages
  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0
  
  // Set display name for header
  const pageTitle = categoryData ? categoryData.name : 'All Products'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 capitalize">{pageTitle}</h1>
      <div className="flex flex-col md:flex-row">
        <FilterSidebar />
        
        <div className="flex-1">
          {products && products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <Link href={`/shop/${params.category}/${product.slug}`} key={product.id} className="group">
                    <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                      <Image 
                        src={Array.isArray(product.image_url) && product.image_url[0]?.image_url ? product.image_url[0].image_url : '/placeholder.svg'} 
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">{product.title}</h3>
                    <p className="text-slate-600">£{product.base_price}</p>
                  </Link>
                ))}
              </div>

              {/* Render Pagination Component */}
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-stone-50 rounded-2xl border border-stone-100">
              <PackageSearch className="w-12 h-12 text-stone-300 mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">No products found</h3>
              <p className="text-stone-500 max-w-md mb-6">
                We couldn't find any products matching your current filters in this category.
              </p>
              <Link href="/shop/all" className="bg-white text-stone-900 border border-stone-300 px-6 py-2.5 rounded-lg font-medium hover:bg-stone-50 transition">
                Clear Filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}