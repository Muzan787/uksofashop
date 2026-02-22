// src/app/shop/[category]/page.tsx
import { createClient } from '@/utils/supabase/server'
import FilterSidebar from '@/components/Category/FilterSidebar'
import Pagination from '@/components/UI/Pagination' // <-- 1. Import Pagination
import Link from 'next/link'
import Image from 'next/image'
import { PackageSearch } from 'lucide-react'

type Params = Promise<{ category: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const ITEMS_PER_PAGE = 6; // Set to 6 or 9 for a grid layout

export default async function CategoryPage(props: { params: Params; searchParams: SearchParams }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  const { data: categoryData } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', params.category)
    .single()

  if (!categoryData) return <div>Category not found</div>

  // 2. Determine current page and calculate range
  const currentPage = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  // 3. Setup the base query asking for an exact count
  let query = supabase
    .from('products')
    .select('id, title, slug, base_price, image_url:product_variants!inner(image_url)', { count: 'exact' })
    .eq('category_id', categoryData.id)
    .eq('is_active', true)

  // Apply Filters
  if (typeof searchParams.style === 'string') {
    query = query.filter('specifications->>style', 'ilike', searchParams.style)
  }
  if (typeof searchParams.material === 'string') {
    query = query.filter('specifications->>material', 'ilike', searchParams.material)
  }

  // 4. Apply the range and execute
  const { data: products, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  // Calculate total pages
  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 capitalize">{categoryData.name}</h1>
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
                        src={Array.isArray(product.image_url) ? product.image_url[0].image_url : '/placeholder.jpg'} 
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

              {/* 5. Render Pagination Component */}
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