// src/app/collection/[slug]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { socialImageUrl, leadVariantImage, ogImage } from '@/utils/socialImage'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/Product/ProductCard'
import CollectionHero from '@/components/Collection/CollectionHero'
import CollectionEmpty from '@/components/Collection/CollectionEmpty'
import { canonicalProductPath } from '@/utils/productUrl'
import { sale } from '@/utils/pricing'
import MainCollectionView from './MainCollectionView'
import type { MainCollectionMember } from '@/utils/mainCollections'

type Params = Promise<{ slug: string }>

/**
 * ONE SEGMENT, TWO KINDS OF THING.
 *
 * /collection/[slug] answers for a main collection — imported-sofas — and for
 * a set within one — verona-sofa. It could have been two routes, and the cost
 * of that would have been moving every existing set to /collection/x/y: a
 * redirect on every indexed collection URL, a new canonical on each, and the
 * mega menu and sitemap rewritten to match. None of that buys the visitor
 * anything.
 *
 * So the main collection is resolved FIRST and a set is the fallback. The
 * precedence is the contract: the two tables share a slug namespace and
 * nothing in the database enforces that they do not collide, so the tie is
 * broken here, in one place, the same way for the page and for its metadata.
 */
async function findMainCollection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
) {
  const { data } = await supabase
    .from('main_collections')
    .select('id, name, slug, standfirst')
    .eq('slug', slug)
    .maybeSingle()
  return data
}

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

  const main = await findMainCollection(supabase, slug)
  if (main) {
    const title = `${main.name} | Collection`
    const description =
      main.standfirst ??
      `Browse every range and design in the ${main.name} collection at UK Sofa Shop. Free UK Mainland delivery and cash on delivery available.`
    return {
      title,
      description,
      alternates: { canonical: `/collection/${slug}` },
      openGraph: { type: 'website', title, description, url: `/collection/${slug}` },
    }
  }

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

  // A main collection wins the slug — see findMainCollection.
  const main = await findMainCollection(supabase, slug)
  if (main) {
    const { data: members } = await supabase
      .from('products')
      .select(`
        id, title, slug, base_price, was_price, average_rating, review_count,
        size_label, variant_group_id, gallery_images, is_active,
        product_variants ( id, image_url, color, color_hex, price_adjustment, priority ),
        variant_groups ( id, name, slug ),
        categories!products_category_id_fkey ( slug ),
        product_categories ( categories ( slug ) )
      `)
      .eq('main_collection_id', main.id)
      .eq('is_active', true)
      .order('base_price', { ascending: true })
      .order('priority', { referencedTable: 'product_variants', ascending: true })

    return (
      <MainCollectionView
        name={main.name}
        standfirst={main.standfirst}
        members={(members ?? []) as unknown as MainCollectionMember[]}
      />
    )
  }

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
      id, title, slug, base_price, was_price, average_rating, review_count, size_label, subgroup_label,
      product_variants (id, image_url, color, color_hex, price_adjustment, priority),
      categories!products_category_id_fkey ( slug ),
      product_categories ( categories ( slug ) ),
      main_collections ( slug, name )
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

  // The set's place in the hierarchy, read off its own products rather than
  // stored on the group: a variant group has no main collection of its own,
  // and the products in one are all from the same part of the shop. Absent
  // where none of them has been assigned, and the trail simply stays as it was.
  const parent = (() => {
    const first = (products ?? [])
      .map(p => (Array.isArray(p.main_collections) ? p.main_collections[0] : p.main_collections))
      .find(Boolean)
    return first ?? null
  })()

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
          ...(parent ? [{ href: `/collection/${parent.slug}`, label: parent.name }] : []),
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
              const priced = sale(product.base_price, product.was_price, targetVariant?.price_adjustment)

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
                  price={priced.price}
                  wasPrice={priced.wasPrice}
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