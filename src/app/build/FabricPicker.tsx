'use client'
// src/app/build/FabricPicker.tsx

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Maximize2, Package } from 'lucide-react'
import Modal from '@/components/UI/Modal'
import { DUR, EASE } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import { blurDataURL } from '@/utils/cloudinary'
import type { Fabric, FabricCollection } from '@/components/Product/types'

interface Props {
  collections: FabricCollection[]
  selectedId: string | null
  onSelect: (fabric: Fabric) => void
  /**
   * Prefix for every layoutId inside. The builder renders this twice - once
   * for the cover, once for the piping - and two pickers sharing ids would
   * animate their fills into each other.
   */
  id: string
  /** Where "Order free samples" goes, given the fabric in view. Omit to hide the link. */
  samplesHref?: (fabric: Fabric | null) => string
  /** "Fabric" or "Piping colour" - names the group for assistive technology. */
  label: string
}

/**
 * The fabric range, laid into the page rather than behind a dialog.
 *
 * The product page keeps its picker behind a tap because there the fabric is
 * one decision among several on a page whose first job is the photographs.
 * Here the fabric IS the step, so the grid is simply the page: pills for the
 * six collections, the swatches beneath, and the one you tapped held at the
 * top so it is never more than a glance away while you compare it against
 * the rest.
 *
 * A TAP CHOOSES. The dialog version makes a tap zoom and a second button
 * choose, because choosing there puts a sofa in the cart. Nothing here is
 * that final - the choice is just the answer to step three, and the customer
 * can change it until they check out - so the tile does the obvious thing and
 * the close-up moves to a button on the chosen swatch.
 */
export default function FabricPicker({ collections, selectedId, onSelect, id, samplesHref, label }: Props) {
  const reduced = useReducedMotionSafe()
  const all = collections.flatMap(c => c.fabrics)
  const selected = all.find(f => f.id === selectedId) ?? null

  // Open on the chosen fabric's collection, so a returning customer sees
  // their swatch rather than the first tab.
  const [activeSlug, setActiveSlug] = useState(
    () => collections.find(c => c.fabrics.some(f => f.id === selectedId))?.slug ?? collections[0]?.slug ?? '',
  )
  const [zoomed, setZoomed] = useState<Fabric | null>(null)

  const active = collections.find(c => c.slug === activeSlug) ?? collections[0]
  const transition = { duration: reduced ? 0 : DUR.base, ease: EASE.out }

  if (!active) return null

  return (
    <div>
      {/* ── The chosen swatch, held at the top ───────────────────────────── */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key={selected.id}
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={transition}
            className="mb-5 flex items-center gap-3 rounded-md border border-calico-300 bg-calico-100 p-2.5 shadow-e1"
          >
            <span
              aria-hidden="true"
              className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-calico-200 shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]"
              style={selected.hex ? { background: selected.hex } : undefined}
            >
              {selected.image && (
                <Image
                  src={selected.image}
                  alt=""
                  fill
                  sizes="64px"
                  placeholder="blur"
                  blurDataURL={blurDataURL(selected.image)}
                  className="object-cover"
                />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="eyebrow block text-ember-700">Chosen</span>
              <span className="mt-1 block truncate text-body-sm font-semibold text-ink-900">
                {selected.collectionName} {selected.name}
              </span>
              <span className="mt-0.5 block font-data text-caption uppercase tracking-widest text-ink-500">
                {selected.code}
              </span>
            </span>

            <button
              type="button"
              onClick={() => setZoomed(selected)}
              className="hover-btn flex h-11 shrink-0 items-center gap-2 rounded-pill border border-calico-300 bg-calico-50 px-4 text-body-sm font-semibold text-ink-900"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
              Close-up
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collections ───────────────────────────────────────────────────── */}
      {/* One row that scrolls sideways on a phone. Six pills wrap to three
          rows at 375px and push the first swatch below the fold. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="group" aria-label={`${label} collection`} className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {collections.map(c => {
            const on = c.slug === active.slug
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={on}
                onClick={() => setActiveSlug(c.slug)}
                className={`hover-btn relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-sm font-semibold whitespace-nowrap transition-colors duration-swift ease-out-expo ${
                  on ? 'border-ember-500 text-ink-900' : 'border-calico-300 text-ink-700'
                }`}
              >
                {on && (
                  <motion.span
                    aria-hidden="true"
                    layoutId={`${id}-collection`}
                    transition={transition}
                    className="absolute -inset-px rounded-pill bg-ember-500"
                  />
                )}
                <span className="relative">{c.name}</span>
                <span className={`relative font-data text-caption ${on ? 'text-ink-900/70' : 'text-ink-500'}`}>
                  {c.fabrics.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {active.description && (
        <p className="m-0 mt-4 max-w-read text-body-sm leading-relaxed text-ink-700">
          {active.description}
        </p>
      )}
      <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500" aria-live="polite">
        {active.fabrics.length} colours in {active.name}. Tap one to choose it — every fabric is the
        same price.
      </p>

      {/* ── The swatches ──────────────────────────────────────────────────── */}
      <ul role="list" aria-label={`${label}: ${active.name}`} className="m-0 mt-4 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4 lg:grid-cols-6">
        {active.fabrics.map(fabric => {
          const on = fabric.id === selectedId
          return (
            <li key={fabric.id}>
              <button
                type="button"
                onClick={() => onSelect(fabric)}
                aria-pressed={on}
                aria-label={`${fabric.collectionName} ${fabric.name}, ${fabric.code}`}
                className="group w-full cursor-pointer border-0 bg-transparent p-0 text-left"
              >
                <motion.span
                  {...(reduced ? {} : { layoutId: `${id}-swatch-${fabric.id}` })}
                  transition={transition}
                  className={`relative block aspect-square w-full overflow-hidden rounded-sm bg-calico-200 transition-shadow duration-swift ease-out-expo ${
                    on
                      ? 'shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_4px_var(--color-ink-900)]'
                      : 'shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)] group-hover:shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_3px_var(--color-calico-300)]'
                  }`}
                  style={fabric.hex ? { background: fabric.hex } : undefined}
                >
                  {fabric.image && (
                    <Image
                      src={fabric.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 160px"
                      placeholder="blur"
                      blurDataURL={blurDataURL(fabric.image)}
                      className="object-cover"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-pill bg-sage-700 text-calico-50 transition-[opacity,transform] duration-swift ease-out-expo ${
                      on ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                    }`}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </motion.span>

                <span className="mt-2 block truncate text-caption font-semibold text-ink-900">
                  {fabric.name}
                </span>
                <span className="block truncate font-data text-caption text-ink-500">
                  {fabric.code}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {samplesHref && (
        <div className="mt-6 flex flex-col gap-3 rounded-md border border-calico-300 bg-calico-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-body-sm leading-relaxed text-ink-700">
            <strong className="font-semibold text-ink-900">Not sure from a screen?</strong>{' '}
            Order up to three free samples and we&apos;ll post them. Your build is saved — you&apos;ll
            come straight back to this step.
          </p>
          <Link
            href={samplesHref(selected)}
            className="hover-btn flex h-11 shrink-0 items-center justify-center gap-2 rounded-pill border border-calico-300 bg-calico-50 px-5 text-body-sm font-semibold text-ink-900 no-underline"
          >
            <Package aria-hidden="true" className="h-4 w-4" />
            Free samples
          </Link>
        </div>
      )}

      {/* ── The close-up ──────────────────────────────────────────────────── */}
      {zoomed && (
        <Modal
          title={`${zoomed.collectionName} ${zoomed.name}`}
          onClose={() => setZoomed(null)}
          size="lg"
          footer={
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
              {samplesHref && (
                <Link
                  href={samplesHref(zoomed)}
                  className="hover-btn flex h-12 items-center justify-center gap-2 rounded-pill border border-calico-300 bg-calico-50 px-6 text-body-sm font-semibold text-ink-900 no-underline"
                >
                  <Package aria-hidden="true" className="h-4 w-4" />
                  Order a free sample
                </Link>
              )}
              <button
                type="button"
                onClick={() => setZoomed(null)}
                className="hover-btn hover-btn-dark flex h-12 items-center justify-center gap-2 rounded-pill border-0 bg-ink-900 px-6 text-body-sm font-semibold text-calico-50"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
                Keep this one
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <motion.div
              {...(reduced ? {} : { layoutId: `${id}-swatch-${zoomed.id}` })}
              transition={transition}
              className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md bg-calico-200 sm:w-[320px]"
              style={zoomed.hex ? { background: zoomed.hex } : undefined}
            >
              {zoomed.image && (
                <Image
                  src={zoomed.image}
                  alt={`${zoomed.collectionName} ${zoomed.name} fabric, close up`}
                  fill
                  sizes="(max-width: 640px) 90vw, 320px"
                  placeholder="blur"
                  blurDataURL={blurDataURL(zoomed.image)}
                  className="object-cover"
                />
              )}
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow m-0 text-ember-700">{zoomed.collectionName}</p>
              <h3 className="m-0 mt-1.5 font-display text-h2 font-semibold leading-tight text-ink-900">
                {zoomed.name}
              </h3>
              <p className="m-0 mt-2 font-data text-caption uppercase tracking-widest text-ink-500">
                {zoomed.code}
              </p>
              <p className="m-0 mt-4 max-w-[46ch] text-body-sm leading-relaxed text-ink-500">
                What a screen shows you is never quite the colour. If it matters — and on a sofa it
                does — hold a sample against your own wall before we cut anything.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
