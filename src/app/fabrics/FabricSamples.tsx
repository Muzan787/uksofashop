'use client'
// src/app/fabrics/FabricSamples.tsx

import { createContext, useContext, useState } from 'react'
import Image from 'next/image'
import { Check, Package, Plus } from 'lucide-react'
import Modal from '@/components/UI/Modal'
import SwatchRequestForm from '@/components/Product/SwatchRequestForm'
import { blurDataURL } from '@/utils/cloudinary'
import { MAX_SAMPLES } from '@/constants/swatches'
import type { Fabric, FabricCollection } from '@/components/Product/types'

/**
 * The fabric guide's one piece of interactivity: picking three to be posted.
 *
 * The product page has a dialog that does two jobs — choose what the sofa is
 * built in, and choose what goes through the letterbox — and has to work hard
 * to keep them apart. This page only has the second job. Nobody arrives at a
 * guide to configure a sofa; they arrive to work out what chenille is. So a
 * tap on a swatch means one thing here, and the page can say so in a sentence
 * and then be quiet about it.
 *
 * State lives in a context rather than in each grid because the limit is three
 * across the whole page, not three per collection — somebody comparing a
 * velvet against a chenille is picking across two sections a screen apart.
 */

interface SampleState {
  collections: FabricCollection[]
  samples: Fabric[]
  toggle: (fabric: Fabric) => void
  remove: (id: string) => void
  full: boolean
  holding: (id: string) => boolean
}

const Ctx = createContext<SampleState | null>(null)

function useSamples() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Fabric swatches must be rendered inside <SamplesProvider>')
  return ctx
}

export function SamplesProvider({ collections, children }: {
  collections: FabricCollection[]
  children: React.ReactNode
}) {
  const [samples, setSamples] = useState<Fabric[]>([])

  const holding = (id: string) => samples.some(s => s.id === id)

  const toggle = (fabric: Fabric) =>
    setSamples(current =>
      current.some(s => s.id === fabric.id)
        ? current.filter(s => s.id !== fabric.id)
        : current.length >= MAX_SAMPLES
          ? current
          : [...current, fabric],
    )

  const remove = (id: string) => setSamples(current => current.filter(s => s.id !== id))

  return (
    <Ctx.Provider
      value={{ collections, samples, toggle, remove, full: samples.length >= MAX_SAMPLES, holding }}
    >
      {children}
    </Ctx.Provider>
  )
}

/**
 * One collection's colours, in the flow of the article.
 *
 * The tiles are square and as large as the column allows rather than the small
 * grid the dialog uses, because this page is for looking at the weave — the
 * whole reason somebody is reading it is that a 96px dot told them nothing.
 *
 * It renders on the server like any other client component, so all sixty-nine
 * fabrics and their names are in the HTML. That matters: this is the only page
 * on the site where the range is crawlable at all.
 */
export function CollectionSwatches({ slug }: { slug: string }) {
  const { collections, toggle, full, holding } = useSamples()
  const collection = collections.find(c => c.slug === slug)

  if (!collection) return null

  return (
    <ul className="not-prose m-0 mt-6 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {collection.fabrics.map(fabric => {
        const chosen = holding(fabric.id)
        // A full basket disables everything except taking one back out, so the
        // limit is discovered by a button that will not press rather than by a
        // fourth swatch silently failing to appear.
        const locked = full && !chosen

        return (
          <li key={fabric.id}>
            <button
              type="button"
              onClick={() => toggle(fabric)}
              disabled={locked || !fabric.swatchable}
              aria-pressed={chosen}
              aria-label={`${collection.name} ${fabric.name}, ${fabric.code}${
                chosen ? ' — in your samples' : ''
              }`}
              className="group w-full cursor-pointer border-0 bg-transparent p-0 text-left disabled:cursor-not-allowed"
            >
              <span
                className={`relative block aspect-square w-full overflow-hidden rounded-sm bg-calico-200 transition-shadow duration-swift ease-out-expo ${
                  chosen
                    ? 'shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_4px_var(--color-ink-900)]'
                    : 'shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)] group-enabled:group-hover:shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_3px_var(--color-calico-300)]'
                } ${locked ? 'opacity-45' : ''}`}
                style={fabric.hex ? { background: fabric.hex } : undefined}
              >
                {fabric.image && (
                  <Image
                    src={fabric.image}
                    alt={`${collection.name} ${fabric.name} upholstery fabric, close up`}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                    placeholder="blur"
                    blurDataURL={blurDataURL(fabric.image)}
                    className="object-cover"
                  />
                )}

                <span
                  aria-hidden="true"
                  className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-pill transition-opacity duration-swift ease-out-expo ${
                    chosen
                      ? 'bg-sage-700 opacity-100'
                      : 'bg-ink-900/70 opacity-0 group-enabled:group-hover:opacity-100'
                  }`}
                >
                  {chosen ? (
                    <Check className="h-4 w-4 text-calico-50" strokeWidth={3} />
                  ) : (
                    <Plus className="h-4 w-4 text-calico-50" strokeWidth={2.5} />
                  )}
                </span>
              </span>

              <span className="mt-2 block truncate text-body-sm font-semibold text-ink-900">
                {fabric.name}
              </span>
              <span className="block truncate font-data text-caption uppercase tracking-widest text-ink-500">
                {fabric.code}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The basket, pinned to the bottom of the window once there is something in it.
 *
 * Absent until the first swatch is picked. A bar that sits there empty from the
 * moment the page loads is a permanent instruction to do something the reader
 * has not decided to do yet, on a page whose first job is to be read.
 */
export function SampleBar() {
  const { samples, remove } = useSamples()
  const [asking, setAsking] = useState(false)
  const [sent, setSent] = useState(false)

  if (samples.length === 0 && !sent) return null

  return (
    <>
      {!sent && (
        <div className="sticky bottom-0 z-30 border-t border-calico-300 bg-calico-50/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 font-data text-caption uppercase tracking-widest text-ink-500">
                {samples.length} of {MAX_SAMPLES}
              </span>
              <ul className="m-0 flex list-none gap-1.5 p-0">
                {samples.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      aria-label={`Remove ${s.collectionName} ${s.name} from your samples`}
                      title={`${s.collectionName} ${s.name} — remove`}
                      className="hover-swatch relative block h-9 w-9 cursor-pointer overflow-hidden rounded-sm border-0 bg-calico-200 shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]"
                      style={s.hex ? { background: s.hex } : undefined}
                    >
                      {s.image && (
                        <Image
                          src={s.image}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setAsking(true)}
              className="hover-btn hover-btn-dark flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-pill border-0 bg-ink-900 px-5 text-body-sm font-semibold text-calico-50"
            >
              <Package aria-hidden="true" className="h-4 w-4" />
              Post {samples.length === 1 ? 'it' : 'them'} to me, free
            </button>
          </div>
        </div>
      )}

      {asking && !sent && (
        <Modal
          title={`Order ${samples.length} free ${samples.length === 1 ? 'sample' : 'samples'}`}
          onClose={() => setAsking(false)}
          size="md"
          icon={<Package aria-hidden="true" className="h-4 w-4 text-ember-700" />}
        >
          <SwatchRequestForm
            samples={samples}
            onRemove={remove}
            onSent={() => { setSent(true); setAsking(false) }}
          />
        </Modal>
      )}

      {sent && (
        <div className="sticky bottom-0 z-30 border-t border-sage-700/30 bg-sage-50">
          <div className="mx-auto flex max-w-shell items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sage-700"
            >
              <Check className="h-4 w-4 text-calico-50" strokeWidth={3} />
            </span>
            <p className="m-0 text-body-sm leading-relaxed text-ink-700">
              <strong className="font-semibold text-ink-900">That&apos;s gone through.</strong>{' '}
              We&apos;ll give you a ring to check we&apos;ve understood what you&apos;re after,
              then post them. Nothing to pay, nothing to send back.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
