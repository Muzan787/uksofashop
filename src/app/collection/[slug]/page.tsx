// src/app/collection/[slug]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { socialImageUrl, leadVariantImage, ogImage } from '@/utils/socialImage'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, PackageSearch } from 'lucide-react'
import ProductCard from '@/components/Product/ProductCard'

type Params = Promise<{ slug: string }>


export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params
  const supabase = await createClient()
  
  const { data: group } = await supabase
    .from('variant_groups')
    .select('name, products(product_variants(image_url, priority))')
    .eq('slug', slug)
    .single()

  if (!group) return { title: 'Collection Not Found' }

  const title = `The ${group.name} Collection`
  const description = `Shop the exclusive ${group.name} collection. Luxury sofas with free delivery across UK Mainland and cash on delivery available.`
  const path = `/collection/${slug}`

  // Lead photo from the first product in the collection, so a shared link
  // shows this range rather than the generic site card.
  const variants = (group.products ?? []).flatMap(
    (p: { product_variants?: { image_url?: string | null; priority?: number | null }[] | null }) =>
      p.product_variants ?? [],
  )
  const card = socialImageUrl(leadVariantImage(variants))

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: path,
      images: card
        ? [ogImage(card, title)]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: card ? [card] : undefined,
    },
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
      id, title, slug, base_price, average_rating, review_count, size_label, subgroup_label,
      product_variants (id, image_url, color, color_hex, price_adjustment, priority),
      product_categories ( categories ( slug ) )
    `)
    .eq('variant_group_id', group.id)
    .eq('is_active', true)
    .order('base_price', { ascending: true }) // Natural sort by price (e.g., 1 Seater -> 2 Seater -> Corner)
    .order('priority', { referencedTable: 'product_variants', ascending: true })

  return (
    <div className="min-h-screen bg-calico-50">
      
      {/* ── HERO BANNER ── */}
      <div className="relative bg-ink-900 overflow-hidden">
        {/* We use a subtle gradient and pattern since collections don't have a specific hero image yet */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-600 via-stone-900 to-black" />
        
        <div className="relative max-w-shell mx-auto px-4 pt-8 pb-8 sm:py-16">
          <nav className="flex items-center gap-2 mb-4 flex-wrap">
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} className="flex items-center gap-2">
                <Link href={href} className="text-caption text-calico-300 no-underline hover:text-calico-50 transition-colors">
                  {label}
                </Link>
                <span className="text-calico-300/50 text-caption">›</span>
              </span>
            ))}
            <span className="text-caption text-ember-300 font-semibold">Collection</span>
          </nav>
          
          <div className="eyebrow text-ember-300 tracking-[0.22em] font-bold mb-2">
            The Complete Set
          </div>
          <h1 className="font-display text-h1 font-bold text-white leading-tight">
            {group.name}
          </h1>
          <p className="text-white/50 text-caption sm:text-body-sm mt-3 max-w-md leading-relaxed">
            Explore all available sizes and configurations for the {group.name}.
          </p>
        </div>
        <div className="h-[2px] bg-ember-500" />
      </div>

      {/* ── PRODUCTS GRID ── */}
      <div className="max-w-shell mx-auto px-4 py-8 pb-24">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product, i) => {
              // Extract the first variant image
              const targetVariant = product.product_variants?.[0]
              const img = targetVariant?.image_url ?? null
              const displayPrice = product.base_price + (targetVariant?.price_adjustment || 0)
              
              // Safely extract the category slug to build the correct product URL
              const catSlug = product.product_categories?.[0]?.categories?.slug || 'all'

              const swatches = (product.product_variants ?? [])
                .filter((v) => v.color_hex)
                .map((v) => ({
                  id: v.id, color: v.color ?? null, hex: v.color_hex ?? null, image: v.image_url ?? null,
                }))

              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  slug={product.slug}
                  price={displayPrice}
                  href={`/shop/${catSlug}/${product.slug}`}
                  image={img}
                  badges={[product.size_label, product.subgroup_label].filter(Boolean) as string[]}
                  reviewCount={product.review_count}
                  averageRating={product.average_rating}
                  swatches={swatches}
                  delayMs={i * 50}
                />
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-sm border border-calico-300">
            <PackageSearch className="w-9 h-9 text-stone-300 mb-4" />
            <h2 className="text-body font-bold text-ink-900 mb-2">Collection is currently empty</h2>
            <p className="text-caption text-stone-500 max-w-[300px] mb-4 leading-relaxed">
              We are currently updating our inventory for this collection. Please check back soon.
            </p>
            <Link href="/shop/all" className="inline-flex items-center gap-2 bg-ember-500 text-ink-900 px-4 py-3 rounded-sm eyebrow font-bold no-underline tracking-widest hover:bg-ember-700 hover:text-calico-50 transition-colors">
              Continue Shopping <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}