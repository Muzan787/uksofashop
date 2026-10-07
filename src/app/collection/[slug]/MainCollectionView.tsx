// src/app/collection/[slug]/MainCollectionView.tsx
//
// A main collection's own page: the ranges inside it, then the designs that
// do not belong to a range. Rendered by [slug]/page.tsx when the slug names a
// main collection rather than a set — see the note there about why both live
// under one segment.

import CollectionCard from '@/components/Product/CollectionCard'
import CollectionEmpty from '@/components/Collection/CollectionEmpty'
import CollectionHero from '@/components/Collection/CollectionHero'
import ProductCard from '@/components/Product/ProductCard'
import SectionHeading from '@/components/UI/SectionHeading'
import { Reveal } from '@/components/Motion'
import { staggerDelay } from '@/components/Motion/tokens'
import { canonicalProductPath } from '@/utils/productUrl'
import { priceAnchors } from '@/utils/collections'
import { sale } from '@/utils/pricing'
import {
  mainCollectionSummaryLine,
  splitCollectionMembers,
  type MainCollectionMember,
} from '@/utils/mainCollections'

interface MainCollectionViewProps {
  name: string
  standfirst: string | null
  members: MainCollectionMember[]
}

/**
 * The same line, in the same words and the same order, as the card on
 * /collection that leads here — mainCollectionSummaryLine builds it, this
 * supplies the three numbers from what the page actually drew. A visitor who
 * reads "51 designs · 5 ranges" on the card and then "15 pieces" at the top of
 * the page has been told the shop cannot count.
 */
function summarise(designs: number, ranges: number, from: number | null): string {
  if (designs === 0) return 'Nothing in this collection yet'
  return mainCollectionSummaryLine({
    status: 'live',
    productCount: designs,
    setCount: ranges,
    fromPrice: from,
  })
}

export default function MainCollectionView({ name, standfirst, members }: MainCollectionViewProps) {
  const { sets, singles } = splitCollectionMembers(members)

  const active = members.filter(m => m.is_active !== false)

  // The anchor comes off every design in the collection, not off the fifteen
  // cards below — a Verona 2-seater inside a range is still the cheapest thing
  // here even though it has no card of its own. Footstools and armchairs are
  // excluded from setting it; see priceAnchors.
  const prices = active
    .filter(m => priceAnchors(m.title))
    .map(m => Number(m.base_price))
    .filter(n => Number.isFinite(n) && n > 0)
  const from = prices.length ? Math.min(...prices) : null

  const empty = sets.length === 0 && singles.length === 0

  return (
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50">
      <CollectionHero
        eyebrow="Collection"
        title={name}
        standfirst={standfirst ?? undefined}
        summary={summarise(active.length, sets.length, from)}
        trail={[
          { href: '/', label: 'Home' },
          { href: '/shop/all', label: 'Shop' },
          { href: '/collection', label: 'Collections' },
          { label: name },
        ]}
      />

      <div className="relative mx-auto max-w-shell px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-10">
        {empty ? (
          <CollectionEmpty
            title="This collection is empty"
            body="We are updating what is in it. Every other sofa is still available in the meantime."
            ctaLabel="Continue shopping"
          />
        ) : (
          <>
            {sets.length > 0 && (
              <section aria-label={`Ranges in ${name}`}>
                <SectionHeading
                  eyebrow="Sold as a set"
                  heading="The ranges."
                  emphasise="ranges."
                  level="section"
                  className="mb-6 lg:mb-8"
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {sets.map((set, i) => (
                    <Reveal key={set.id} delay={staggerDelay(i)} distance={20} amount={0.12}>
                      <CollectionCard {...set} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {singles.length > 0 && (
              <section
                aria-label={`Individual designs in ${name}`}
                className={sets.length > 0 ? 'mt-14 lg:mt-20' : ''}
              >
                <SectionHeading
                  eyebrow="On their own"
                  heading="Every other design."
                  emphasise="design."
                  level="section"
                  className="mb-6 lg:mb-8"
                />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                  {singles.map((product, i) => {
                    const variants = product.product_variants ?? []
                    const variant = variants[0]
                    const priced = sale(product.base_price, product.was_price, variant?.price_adjustment)

                    return (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        title={product.title}
                        slug={product.slug}
                        price={priced.price}
                        wasPrice={priced.wasPrice}
                        href={canonicalProductPath(product)}
                        image={variant?.image_url ?? null}
                        badges={product.size_label ? [product.size_label] : undefined}
                        reviewCount={product.review_count}
                        averageRating={product.average_rating}
                        swatches={variants
                          .filter(v => v.color_hex)
                          .map(v => ({
                            id: v.id ?? '',
                            color: v.color ?? null,
                            hex: v.color_hex ?? null,
                            image: v.image_url ?? null,
                          }))}
                        delayMs={Math.min(i, 5) * 70}
                      />
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
