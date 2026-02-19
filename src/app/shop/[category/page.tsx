// src/app/shop/[category]/page.tsx
import { createClient } from '@/utils/supabase/server'
import FilterSidebar from '@/components/Category/FilterSidebar'
import Link from 'next/link'

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()

  // 1. Get the category ID based on the slug
  const { data: categoryData } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', params.category)
    .single()

  if (!categoryData) {
    return <div>Category not found</div>
  }

  // 2. Start building the Supabase query for products
  let query = supabase
    .from('products')
    .select(`
      id, title, slug, base_price, image_url:product_variants!inner(image_url)
    `)
    .eq('category_id', categoryData.id)

  // 3. Apply JSONB Filters dynamically based on the URL search parameters
  // Supabase uses the ->> operator to query inside JSONB objects
  if (typeof searchParams.style === 'string') {
    query = query.filter('specifications->>style', 'ilike', searchParams.style)
  }
  if (typeof searchParams.material === 'string') {
    query = query.filter('specifications->>material', 'ilike', searchParams.material)
  }

  // Execute the query
  const { data: products, error } = await query

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 capitalize">
        {categoryData.name}
      </h1>

      <div className="flex flex-col md:flex-row">
        {/* Our interactive Client Component */}
        <FilterSidebar />

        {/* Product Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products?.map((product) => (
            <Link href={`/shop/${params.category}/${product.slug}`} key={product.id} className="group">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                <img 
                  // Grabbing the image from the first variant
                  src={Array.isArray(product.image_url) ? product.image_url[0].image_url : '/placeholder.jpg'} 
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="text-lg font-medium text-slate-900">{product.title}</h3>
              <p className="text-slate-600">£{product.base_price}</p>
            </Link>
          ))}

          {(!products || products.length === 0) && (
            <p className="text-slate-500 col-span-full py-12 text-center">
              No products found matching your criteria.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}