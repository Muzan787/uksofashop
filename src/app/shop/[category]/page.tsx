// src/app/shop/[category]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import FilterSidebar from '@/components/Category/FilterSidebar'
import Pagination from '@/components/UI/Pagination'
import Link from 'next/link'
import Image from 'next/image'
import { PackageSearch, Star, ArrowRight } from 'lucide-react'

type Params       = Promise<{ category: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const ACCENT      = '#d4871a'
const ITEMS_PER_PAGE = 9

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { category } = await props.params
  
  const decodedCategory = decodeURIComponent(category)
  const slugWithPlus = decodedCategory.replace(/ /g, '+') 

  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('name')
    .in('slug', [decodedCategory, slugWithPlus])
    .limit(1)
    .maybeSingle()

  const name = data?.name ?? 'All Products'
  return {
    title: `${name} | UK Sofa Shop`,
    description: `Shop our premium ${name.toLowerCase()} collection. Free UK delivery over £500. Cash on Delivery.`,
    alternates: { canonical: `/shop/${decodedCategory}` },
  }
}

export default async function CategoryPage(props: { params: Params; searchParams: SearchParams }) {
  const { category } = await props.params
  const decodedCategory = decodeURIComponent(category)
  const slugWithPlus = decodedCategory.replace(/ /g, '+') 
  
  const sp          = await props.searchParams
  const supabase    = await createClient()

  let categoryData: { id: string; name: string; image_url?: string | null } | null = null
  
  if (decodedCategory !== 'all') {
    const { data } = await supabase
      .from('categories')
      .select('id, name, image_url')
      .in('slug', [decodedCategory, slugWithPlus])
      .limit(1)
      .maybeSingle()
      
    if (!data) return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-lg text-stone-500">Category not found</p>
      </div>
    )
    categoryData = data
  }

  const currentPage = typeof sp.page === 'string' ? parseInt(sp.page) : 1
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to   = from + ITEMS_PER_PAGE - 1

  let query = supabase
    .from('products')
    .select('id, title, slug, base_price, average_rating, review_count, product_variants!inner(image_url, material, color, price_adjustment, priority), product_categories!inner(category_id)', { count: 'exact' })
    .eq('is_active', true)

  if (categoryData) query = query.eq('product_categories.category_id', categoryData.id)
  
  // Apply URL Filters
  if (typeof sp.style === 'string')    query = query.filter('specifications->>style', 'ilike', sp.style)
  if (typeof sp.material === 'string') query = query.filter('product_variants.material', 'ilike', sp.material)
  if (typeof sp.color === 'string')    query = query.filter('product_variants.color', 'ilike', sp.color)

  const { data: products, count } = await query
    .order('created_at', { ascending: false })
    // Tell Supabase to sort the joined variants array by priority!
    .order('priority', { referencedTable: 'product_variants', ascending: true }) 
    .range(from, to)
  const totalPages  = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0
  const pageTitle   = categoryData ? categoryData.name : 'All Sofas'

  // Fetch specs for filter options globally for this category
  let specsQ = supabase
    .from('products')
    .select('specifications, product_variants(material, color), product_categories!inner(category_id)')
    .eq('is_active', true)
    
  if (categoryData) specsQ = specsQ.eq('product_categories.category_id', categoryData.id)
  const { data: allSpecs } = await specsQ
  
  // Extract unique filter options
  const uniqueStyles = [...new Set(allSpecs?.map(p => (p.specifications as any)?.style).filter(Boolean) as string[])]
  const uniqueMaterials = [...new Set(allSpecs?.flatMap(p => p.product_variants.map((v: any) => v.material)).filter(Boolean) as string[])]
  const uniqueColors = [...new Set(allSpecs?.flatMap(p => p.product_variants.map((v: any) => v.color)).filter(Boolean) as string[])]

  return (
    <div className="min-h-screen bg-[#f8f6f2]">

      {/* Hero banner */}
      <div className="relative bg-[#0c0c0b] overflow-hidden">
        {categoryData?.image_url && (
          <Image src={categoryData.image_url} alt={pageTitle} fill className="object-cover opacity-30" sizes="100vw" />
        )}
        <div className="relative max-w-[1100px] mx-auto px-4 pt-10 pb-8">
          <nav className="flex items-center gap-1.5 mb-3.5 flex-wrap">
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} className="flex items-center gap-1.5">
                <Link href={href} className="text-[11px] text-white/40 no-underline hover:text-white transition-colors">
                  {label}
                </Link>
                <span className="text-white/20 text-[10px]">›</span>
              </span>
            ))}
            <span className="text-[11px] text-[#d4871a] font-semibold">{pageTitle}</span>
          </nav>
          <div className="flex items-baseline justify-between flex-wrap gap-2.5">
            <div>
              <div className="text-[9px] text-[#d4871a] uppercase tracking-[0.22em] font-bold mb-1.5">
                Collection
              </div>
              <h1 className="font-playfair text-[clamp(26px,5vw,44px)] font-bold text-white leading-tight">
                {pageTitle}
              </h1>
            </div>
            {count !== null && (
              <span className="text-xs text-white/35 self-end">
                {count} {count === 1 ? 'product' : 'products'}
              </span>
            )}
          </div>
        </div>
        <div className="h-[2px] bg-[#d4871a]" />
      </div>

      {/* Main content */}
      <div className="max-w-[1100px] mx-auto px-4 py-8 pb-20">
        
        {/* BULLETPROOF GRID: Sidebar is exactly 200px, Product grid gets the remaining 1fr */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-8 items-start">

          <div className="w-full">
            <FilterSidebar 
              availableStyles={uniqueStyles} 
              availableMaterials={uniqueMaterials} 
              availableColors={uniqueColors} 
            />
          </div>

          <div className="w-full min-w-0">
            {products && products.length > 0 ? (
              <>
                {/* STRICT GRID: 2 columns on mobile, 3 columns on tablet/desktop */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mb-10 w-full">
                  {products.map((product, i) => {
                    
                    let targetVariant = product.product_variants?.[0]
                    
                    if (typeof sp.color === 'string' || typeof sp.material === 'string') {
                      const match = product.product_variants?.find(v => {
                        const colorMatch = typeof sp.color === 'string' ? v.color?.toLowerCase() === sp.color.toLowerCase() : true;
                        const matMatch = typeof sp.material === 'string' ? v.material?.toLowerCase() === sp.material.toLowerCase() : true;
                        return colorMatch && matMatch;
                      })
                      if (match) targetVariant = match;
                    }

                    const img = targetVariant?.image_url ?? null
                    const displayPrice = product.base_price + (targetVariant?.price_adjustment || 0)

                    return (
                      <Link key={product.id} href={`/shop/${category}/${product.slug}`}
                        className="group block w-full outline-none"
                        style={{
                          opacity: 0, animation: `fadeUp 0.4s ease ${i * 40}ms forwards`,
                        }}
                      >
                        <div className="relative w-full aspect-square md:aspect-[3/4] bg-[#ede8df] rounded-[10px] overflow-hidden mb-3">
                          {img ? (
                            <Image src={img} alt={product.title} fill sizes="(max-width:768px) 50vw, 33vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="absolute inset-0 bg-[#e7e5e4]" />
                          )}
                          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                          
                          <div className="hidden md:block absolute bottom-2 left-2 right-2 bg-white/95 rounded-md py-2 text-center text-[10px] font-bold tracking-[0.1em] uppercase text-stone-900 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                            Quick View
                          </div>
                        </div>
                        
                        <div className="w-full px-1">
                          {/* Built-in Tailwind line-clamp ensures long text wraps neatly without breaking the layout */}
                          <h3 className="text-[13px] font-bold text-stone-900 leading-snug mb-1.5 line-clamp-2 transition-colors duration-200 group-hover:text-[#d4871a]">
                            {product.title}
                          </h3>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[15px] font-extrabold text-stone-900">
                              £{displayPrice.toFixed(0)}
                            </span>
                            {(product.review_count ?? 0) > 0 && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Star className="w-[11px] h-[11px] fill-[#d4871a] text-[#d4871a]" />
                                <span className="text-[10px] font-medium text-stone-500">
                                  {(product.average_rating ?? 0).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-white rounded-xl border border-[#f0ede8]">
                <PackageSearch className="w-9 h-9 text-stone-300 mb-3.5" />
                <h3 className="text-[17px] font-bold text-stone-900 mb-2">No products found</h3>
                <p className="text-xs text-stone-500 max-w-[300px] mb-5 leading-relaxed">
                  Try removing some filters or browse our full collection.
                </p>
                <Link href="/shop/all" className="inline-flex items-center gap-1.5 bg-[#d4871a] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold no-underline tracking-widest uppercase hover:bg-[#b67316] transition-colors">
                  Browse All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}