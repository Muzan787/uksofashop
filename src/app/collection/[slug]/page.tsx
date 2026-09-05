// src/app/collection/[slug]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { socialImageUrl, leadVariantImage, ogImage } from '@/utils/socialImage'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/Product/ProductCard'
import CollectionHero from '@/components/Collection/CollectionHero'
import CollectionEmpty from '@/components/Collection/CollectionEmpty'
import { canonicalProductPath } from '@/utils/productUrl'

type Params = Promise<{ slug: string }>

/** "4 pieces · £529 – £1,299", and the honest shorter versions of it. */
function summarise(pieces: number, from: number | null, to: number | null): string {
  if (pieces === 0) return 'Nothing in this set yet'
  const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
  const label = `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`
  if (from === null || to === null) return label
  if (from === to) return `${label} · ${money(from)}`
  return `${label} · ${money(from)} – ${money(to)}`
}


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
      categories!products_category_id_fkey ( slug ),
      product_categories ( categories ( slug ) )
    `)
    .eq('variant_group_id', group.id)
    .eq('is_active', true)
    .order('base_price', { ascending: true }) // Natural sort by price (e.g., 1 Seater -> 2 Seater -> Corner)
    .order('priority', { referencedTable: 'product_variants', ascending: true })

  // What the header says about the set, counted from the rows just fetched so
  // the summary and the grid below it can never disagree.
  const pieces = products?.length ?? 0
  const prices = (products ?? [])
    .map(p => Number(p.base_price) + (p.product_variants?.[0]?.price_adjustment || 0))
    .filter(n => Number.isFinite(n) && n > 0)
  const priceFrom = prices.length ? Math.min(...prices) : null
  const priceTo = prices.length ? Math.max(...prices) : null

  return (
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50">
      <CollectionHero
        eyebrow="The complete set"
        title={group.name}
        standfirst={`Every size and configuration in the ${group.name}, in the same fabric and the same frame.`}
        summary={summarise(pieces, priceFrom, priceTo)}
        trail={[
          { href: '/', label: 'Home' },
          { href: '/shop/all', label: 'Shop' },
          { href: '/collection', label: 'Collections' },
          { label: group.name },
        ]}
      />

      {/* ── PRODUCTS GRID ── */}
      <div className="relative mx-auto max-w-shell px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-10">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {products.map((product, i) => {
              // Extract the first variant image
              const targetVariant = product.product_variants?.[0]
              const img = targetVariant?.image_url ?? null
              const displayPrice = product.base_price + (targetVariant?.price_adjustment || 0)
              
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
                  // The canonical URL. This was product_categories[0] with a
                  // fallback of 'all' — the first is whichever row the join
                  // returned and need not be the canonical category, and the
                  // second is a virtual segment no product belongs to, so a
                  // piece with no categories at all opened through a 308.
                  href={canonicalProductPath(product)}
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
          <CollectionEmpty
            title="This collection is empty"
            body="We are updating the pieces in this set. Every other sofa is still available in the meantime."
            ctaLabel="Continue shopping"
          />
        )}
      </div>
    </div>
  )
}