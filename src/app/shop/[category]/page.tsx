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
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('name').eq('slug', category).single()
  const name = data?.name ?? 'All Products'
  return {
    title: `${name} | UK Sofa Shop`,
    description: `Shop our premium ${name.toLowerCase()} collection. Free UK delivery over £500. Cash on Delivery.`,
    alternates: { canonical: `/shop/${category}` },
  }
}

export default async function CategoryPage(props: { params: Params; searchParams: SearchParams }) {
  const { category } = await props.params
  const sp          = await props.searchParams
  const supabase    = await createClient()

  let categoryData: { id: string; name: string; image_url?: string | null } | null = null
  if (category !== 'all') {
    const { data } = await supabase.from('categories').select('id, name, image_url').eq('slug', category).single()
    if (!data) return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 18, color: '#78716c' }}>Category not found</p>
      </div>
    )
    categoryData = data
  }

  const currentPage = typeof sp.page === 'string' ? parseInt(sp.page) : 1
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to   = from + ITEMS_PER_PAGE - 1

  let query = supabase
    .from('products')
    .select('id, title, slug, base_price, average_rating, review_count, product_variants!inner(image_url, material), product_categories!inner(category_id)', { count: 'exact' })
    .eq('is_active', true)

  if (categoryData) query = query.eq('product_categories.category_id', categoryData.id)
  if (typeof sp.style === 'string')    query = query.filter('specifications->>style', 'ilike', sp.style)
  if (typeof sp.material === 'string') query = query.filter('product_variants.material', 'ilike', sp.material)

  const { data: products, count } = await query.order('created_at', { ascending: false }).range(from, to)
  const totalPages  = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0
  const pageTitle   = categoryData ? categoryData.name : 'All Sofas'

  // Fetch specs for filter options
  let specsQ = supabase.from('products').select('specifications, product_categories!inner(category_id)').eq('is_active', true)
  if (categoryData) specsQ = specsQ.eq('product_categories.category_id', categoryData.id)
  const { data: allSpecs } = await specsQ
  const uniqueStyles    = [...new Set(allSpecs?.map(p => (p.specifications as any)?.style).filter(Boolean) as string[])]
  const uniqueMaterials = [...new Set(allSpecs?.map(p => (p.specifications as any)?.material).filter(Boolean) as string[])]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>

      {/* Hero banner */}
      <div style={{ position: 'relative', background: '#0c0c0b', overflow: 'hidden' }}>
        {categoryData?.image_url && (
          <Image src={categoryData.image_url} alt={pageTitle} fill style={{ objectFit: 'cover', opacity: 0.3 }} sizes="100vw" />
        )}
        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '40px 16px 32px' }}>
          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link href={href} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
                  className="hover:text-white transition-colors">{label}</Link>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>›</span>
              </span>
            ))}
            <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>{pageTitle}</span>
          </nav>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 6 }}>
                Collection
              </div>
              <h1 className="font-playfair" style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                {pageTitle}
              </h1>
            </div>
            {count !== null && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', alignSelf: 'flex-end' }}>
                {count} {count === 1 ? 'product' : 'products'}
              </span>
            )}
          </div>
        </div>
        <div style={{ height: 2, background: ACCENT }} />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>
        
        {/* Tailwind Flex wrapper for layout: Stack on mobile (Filter on top), row on desktop (Filter on side) */}
        <div className="flex flex-col lg:flex-row gap-0 items-start">

          <FilterSidebar availableStyles={uniqueStyles} availableMaterials={uniqueMaterials} />

          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            {products && products.length > 0 ? (
              <>
                {/* Responsive Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-8">
                  {products.map((product, i) => {
                    const img = product.product_variants?.[0]?.image_url ?? null
                    return (
                      <Link key={product.id} href={`/shop/${category}/${product.slug}`}
                        className="group block"
                        style={{
                          textDecoration: 'none',
                          opacity: 0, animation: `fadeUp 0.4s ease ${i * 40}ms forwards`,
                        }}
                      >
                        {/* Image Container: Square on Mobile, 3/4 aspect on Desktop */}
                        <div className="aspect-square md:aspect-[3/4] relative rounded-[10px] overflow-hidden bg-[#ede8df] mb-[10px]">
                          {img
                            ? <Image src={img} alt={product.title} fill sizes="(max-width:640px) 50vw, 33vw"
                                style={{ objectFit: 'cover', transition: 'transform 0.6s ease' }}
                                className="group-hover:scale-105" />
                            : <div style={{ position: 'absolute', inset: 0, background: '#e7e5e4' }} />
                          }
                          {/* Hover overlay */}
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.3s' }}
                            className="group-hover:bg-black/10" />
                          
                          {/* Quick view - Hidden on mobile so it doesn't get stuck on touch devices */}
                          <div style={{
                            position: 'absolute', bottom: 8, left: 8, right: 8,
                            background: 'rgba(255,255,255,0.95)', borderRadius: 6, padding: '7px 0',
                            textAlign: 'center', fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1c1917',
                            opacity: 0, transform: 'translateY(6px)',
                            transition: 'all 0.25s ease',
                          }} className="group-hover:opacity-100 group-hover:translate-y-0 hidden md:block">
                            Quick View
                          </div>
                        </div>
                        
                        {/* Info */}
                        <div>
                          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', lineHeight: 1.3, marginBottom: 4,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            transition: 'color 0.2s' }}
                            className="group-hover:text-[#d4871a]"
                          >{product.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#1c1917' }}>
                              £{product.base_price.toFixed(0)}
                            </span>
                            {(product.review_count ?? 0) > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Star style={{ width: 11, height: 11, fill: ACCENT, color: ACCENT }} />
                                <span style={{ fontSize: 10, color: '#78716c' }}>
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
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 20px', textAlign: 'center',
                background: '#fff', borderRadius: 12, border: '1px solid #f0ede8',
              }}>
                <PackageSearch style={{ width: 36, height: 36, color: '#d6d3d1', marginBottom: 14 }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>No products found</h3>
                <p style={{ fontSize: 12, color: '#78716c', maxWidth: 300, marginBottom: 20, lineHeight: 1.6 }}>
                  Try removing some filters or browse our full collection.
                </p>
                <Link href="/shop/all" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: ACCENT, color: '#fff', padding: '10px 20px', borderRadius: 7,
                  fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Browse All <ArrowRight style={{ width: 12, height: 12 }} />
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