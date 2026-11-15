'use client'
// src/components/Season/ChristmasShowcase.tsx
//
// "Made for Christmas": one band on the homepage, lower down, between 14 Nov
// and 25 Dec. Three real made-to-order sofas (never imported ones), chosen by
// utils/seasonProducts.ts, with their real prices and photographs. It is a
// short row, not a second rail: the homepage already has a product carousel.
// No price claim beyond each sofa's own price, no countdown, no delivery
// promise (the link goes to the page that explains Christmas timing).
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductCard from '@/components/Product/ProductCard'
import { MADE_TO_ORDER_HREF } from '@/utils/seasonal'
import type { SeasonProduct, SeasonShape } from '@/utils/seasonProducts'
import { useSeasonPhase } from './useSeasonPhase'

const LABEL: Record<SeasonShape, string> = {
  family: 'Family set', u_shape: 'U-shape', corner: 'Corner sofa', three_two: '3 + 2 set', other: '',
}

export default function ChristmasShowcase({ items }: { items: SeasonProduct[] }) {
  const phase = useSeasonPhase()
  if (phase === 'off' || items.length === 0) return null
  // One of each shape first (the list is already round-robin), three cards.
  const shown = items.slice(0, 3)
  return (
    <section aria-labelledby="made-for-christmas" className="relative bg-calico-100 py-14 sm:py-20">
      <div className="mx-auto grid max-w-shell items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.6fr] lg:gap-12 lg:px-8">
        <div className="min-w-0">
          <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-700">Made for Christmas</p>
          <h2 id="made-for-christmas" className="m-0 mt-2 font-display text-h2 font-semibold text-ink-900">
            Room for everyone at the table, and on the sofa.
          </h2>
          <p className="m-0 mt-3 max-w-[40ch] text-body text-ink-700">
            Family sets, corners and U-shapes, built to your measurements in the fabric you choose.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={MADE_TO_ORDER_HREF} className="hover-btn inline-flex h-12 items-center gap-2 rounded-pill bg-ink-900 px-6 text-body-sm font-semibold text-calico-50 no-underline">
              See made-to-order sofas <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/christmas" className="hover-link text-body-sm font-semibold text-ink-900">Check Christmas delivery</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
          {shown.map((p, i) => (
            <div key={p.id} className={i === 2 ? 'hidden lg:block' : ''}>
              <ProductCard
                id={p.id}
                title={p.title}
                slug={p.slug}
                price={p.price}
                href={p.href}
                image={p.image}
                badges={[LABEL[p.shape]].filter(Boolean)}
                delayMs={i * 40}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
