'use client'
// src/components/Season/SeasonalStrip.tsx
//
// The homepage's seasonal band, between the trust marquee and the first rail.
// Words come from utils/seasonal.ts, which states no price, no percentage, no
// stock level and no Christmas cut-off. Renders nothing off-season.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { seasonStrip } from '@/utils/seasonal'
import SeasonalSnow from './SeasonalSnow'
import { useSeasonPhase } from './useSeasonPhase'

export default function SeasonalStrip() {
  const phase = useSeasonPhase()
  const strip = seasonStrip(phase)
  if (!strip) return null
  return (
    <section data-ground="dark" aria-label="Seasonal" className="relative overflow-hidden bg-ink-900">
      <SeasonalSnow className="h-full" />
      <div className="relative mx-auto flex max-w-shell flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0 max-w-2xl">
          <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-300">{strip.eyebrow}</p>
          <h2 className="m-0 mt-2 font-display text-h3 font-semibold text-calico-50">{strip.headline}</h2>
          <p className="m-0 mt-2 text-body-sm leading-relaxed text-calico-300">{strip.body}</p>
        </div>
        <Link
          href={strip.href}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-ember-500 px-6 py-3 text-body-sm font-bold text-ink-900 no-underline hover:bg-ember-300"
        >
          {strip.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
