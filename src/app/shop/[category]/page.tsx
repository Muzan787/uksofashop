import { createClient } from '@/utils/supabase/server'
import FilterSidebar from '@/components/Category/FilterSidebar'
import Link from 'next/link'
import Image from 'next/image'

type Params = Promise<{ category: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

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

  let query = supabase
    .from('products')
    .select('id, title, slug, base_price, image_url:product_variants!inner(image_url)')
    .eq('category_id', categoryData.id)

  if (typeof searchParams.style === 'string') {
    query = query.filter('specifications->>style', 'ilike', searchParams.style)
  }
  if (typeof searchParams.material === 'string') {
    query = query.filter('specifications->>material', 'ilike', searchParams.material)
  }

  const { data: products } = await query

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 capitalize">{categoryData.name}</h1>
      <div className="flex flex-col md:flex-row">
        <FilterSidebar />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products?.map((product) => (
            <Link href={`/shop/${params.category}/${product.slug}`} key={product.id} className="group">
              {/* --- 2. ADDED 'relative' to the parent div --- */}
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                {/* --- 3. CHANGED TO NEXT/IMAGE --- */}
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
          {(!products || products.length === 0) && (
            <p className="text-slate-500 col-span-full py-12 text-center">No products found.</p>
          )}
        </div>
      </div>
    </main>
  )
}