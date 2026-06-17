// src/app/collection/[slug]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ChevronRight, PackageSearch } from 'lucide-react'

type Params = Promise<{ slug: string }>

const ACCENT = '#d4871a'

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params
  const supabase = await createClient()
  
  const { data: group } = await supabase
    .from('variant_groups')
    .select('name')
    .eq('slug', slug)
    .single()

  if (!group) return { title: 'Collection Not Found' }

  return {
    title: `The ${group.name} Collection | UK Sofa Shop`,
    description: `Shop the exclusive ${group.name} collection. Handcrafted luxury British sofas with free white-glove delivery.`,
    alternates: { canonical: `/collection/${slug}` },
  }
}

export default async function CollectionPage(props: { params: Params }) {
  const { slug } = await props.params
  const supabase = await createClient()

  // 1. Fetch the Group
  const { data: group } = await supabase
    .from('variant_groups')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!group) notFound()

  // 2. Fetch all active products in this group
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, title, slug, base_price, average_rating, review_count, size_label,
      product_variants (image_url, price_adjustment),
      product_categories ( categories ( slug ) )
    `)
    .eq('variant_group_id', group.id)
    .eq('is_active', true)
    .order('base_price', { ascending: true }) // Natural sort by price (e.g., 1 Seater -> 2 Seater -> Corner)

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      
      {/* ── HERO BANNER ── */}
      <div className="relative bg-[#0c0c0b] overflow-hidden">
        {/* We use a subtle gradient and pattern since collections don't have a specific hero image yet */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-600 via-stone-900 to-black" />
        
        <div className="relative max-w-[1100px] mx-auto px-4 pt-10 pb-10 sm:py-16">
          <nav className="flex items-center gap-1.5 mb-4 flex-wrap">
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} className="flex items-center gap-1.5">
                <Link href={href} className="text-[11px] text-white/40 no-underline hover:text-white transition-colors">
                  {label}
                </Link>
                <span className="text-white/20 text-[10px]">›</span>
              </span>
            ))}
            <span className="text-[11px] text-[#d4871a] font-semibold">Collection</span>
          </nav>
          
          <div className="text-[9px] text-[#d4871a] uppercase tracking-[0.22em] font-bold mb-2">
            The Complete Set
          </div>
          <h1 className="font-playfair text-[clamp(28px,6vw,48px)] font-bold text-white leading-tight">
            {group.name}
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-3 max-w-md leading-relaxed">
            Explore all available sizes and configurations for the {group.name}. Handcrafted to order.
          </p>
        </div>
        <div className="h-[2px] bg-[#d4871a]" />
      </div>

      {/* ── PRODUCTS GRID ── */}
      <div className="max-w-[1100px] mx-auto px-4 py-10 pb-24">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product, i) => {
              // Extract the first variant image
              const targetVariant = product.product_variants?.[0]
              const img = targetVariant?.image_url ?? null
              const displayPrice = product.base_price + (targetVariant?.price_adjustment || 0)
              
              // Safely extract the category slug to build the correct product URL
              // @ts-ignore - Supabase nested types can be tricky
              const catSlug = product.product_categories?.[0]?.categories?.slug || 'all'

              return (
                <Link 
                  key={product.id} 
                  href={`/shop/${catSlug}/${product.slug}`}
                  className="group block w-full outline-none"
                  style={{ opacity: 0, animation: `fadeUp 0.4s ease ${i * 50}ms forwards` }}
                >
                  <div className="relative w-full aspect-square md:aspect-[3/4] bg-[#ede8df] rounded-[10px] overflow-hidden mb-3">
                    {img ? (
                      <Image src={img} alt={product.title} fill sizes="(max-width:768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 bg-[#e7e5e4]" />
                    )}
                    
                    {/* Size Label Overlay */}
                    {product.size_label && (
                      <div className="absolute top-2 left-2 bg-[#d4871a] text-white font-bold uppercase text-[9px] tracking-wider px-2 py-1 rounded shadow-sm z-10">
                        {product.size_label}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                    
                    <div className="hidden md:block absolute bottom-2 left-2 right-2 bg-white/95 rounded-md py-2 text-center text-[10px] font-bold tracking-[0.1em] uppercase text-stone-900 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                      View Details
                    </div>
                  </div>
                  
                  <div className="w-full px-1">
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
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-white rounded-xl border border-[#f0ede8]">
            <PackageSearch className="w-9 h-9 text-stone-300 mb-3.5" />
            <h3 className="text-[17px] font-bold text-stone-900 mb-2">Collection is currently empty</h3>
            <p className="text-xs text-stone-500 max-w-[300px] mb-5 leading-relaxed">
              We are currently updating our inventory for this collection. Please check back soon.
            </p>
            <Link href="/shop/all" className="inline-flex items-center gap-1.5 bg-[#d4871a] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold no-underline tracking-widest uppercase hover:bg-[#b67316] transition-colors">
              Continue Shopping <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}