'use client'
// src/app/swatches/SwatchBrowser.tsx

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SwatchTile, useSamples } from '@/components/Product/FabricSamples'
import type { Fabric } from '@/components/Product/types'

/**
 * The whole fabric library, filterable, on one screen.
 *
 * /fabrics answers "what is chenille" and hands you the swatches four
 * paragraphs at a time, which is right for somebody who arrived with a
 * question. This is for somebody who arrived with a link — they asked for
 * swatches on WhatsApp, they were sent here, and they want to see sixty-nine
 * colours and pick three. Reading is not the job.
 *
 * So the filtering is the page's only structure. Two controls, both of which
 * narrow the same grid:
 *
 *   THE COLLECTION CHIPS, because "show me the velvets" is the first thing
 *   anybody says out loud, and sixty-nine squares in one column is a scroll
 *   nobody finishes on a phone.
 *
 *   THE SEARCH BOX, because half of these requests arrive as a code. Somebody
 *   who has already been sent a photograph on WhatsApp is holding "CH14", not
 *   a description, and typing it should land on the tile rather than start a
 *   hunt. It matches the code, the colour name and the collection name, so
 *   "velvet", "mink" and "PL08" all work.
 *
 * Neither control touches the URL. A filter that pushes history means the back
 * button walks a customer through every chip they tapped instead of returning
 * them to the chat they came from.
 */

/** Chips need a stable value for "no collection filter". */
const ALL = 'all'

export default function SwatchBrowser() {
  const { collections, samples } = useSamples()
  const [only, setOnly] = useState<string>(ALL)
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()

  // Grouped rather than flattened, so the headings survive the filter and a
  // customer can still tell a chenille from a marble at a glance. A group that
  // matches nothing drops out entirely rather than leaving an empty heading.
  const groups = useMemo(() => {
    const matches = (f: Fabric, collectionName: string) =>
      !needle ||
      f.name.toLowerCase().includes(needle) ||
      f.code.toLowerCase().includes(needle) ||
      collectionName.toLowerCase().includes(needle)

    return collections
      .filter(c => only === ALL || c.slug === only)
      .map(c => ({ ...c, fabrics: c.fabrics.filter(f => matches(f, c.name)) }))
      .filter(c => c.fabrics.length > 0)
  }, [collections, only, needle])

  const showing = groups.reduce((n, c) => n + c.fabrics.length, 0)
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)

  return (
    <section
      id="swatches"
      aria-labelledby="swatches-heading"
      className="mx-auto w-full max-w-shell px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
    >
      <h2 id="swatches-heading" className="sr-only">
        The fabric range
      </h2>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Scrolls sideways on a phone rather than wrapping to three rows and
            pushing the swatches themselves below the fold. */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul
            role="list"
            className="m-0 flex w-max list-none items-center gap-2 p-0 sm:w-auto sm:flex-wrap"
          >
            {[{ slug: ALL, name: 'Everything', count: total }, ...collections.map(c => ({
              slug: c.slug, name: c.name, count: c.fabrics.length,
            }))].map(chip => {
              const active = only === chip.slug
              return (
                <li key={chip.slug}>
                  <button
                    type="button"
                    onClick={() => setOnly(chip.slug)}
                    aria-pressed={active}
                    className={`hover-btn flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-pill border px-4 text-body-sm font-semibold transition-colors duration-swift ease-out-expo ${
                      active
                        ? 'hover-btn-dark border-ink-900 bg-ink-900 text-calico-50'
                        : 'border-calico-300 bg-calico-100 text-ink-700'
                    }`}
                  >
                    {chip.name}
                    <span
                      className={`font-data text-caption ${
                        active ? 'text-calico-300' : 'text-ink-500'
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="relative lg:w-64 lg:shrink-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Colour or code — mink, CH14"
            aria-label="Search the fabric range by colour or code"
            className="h-10 w-full rounded-pill border-[1.5px] border-calico-300 bg-calico-50 pl-9 pr-9 text-body-sm text-ink-900 outline-none transition-[border-color] duration-swift ease-out-expo focus:border-ember-700"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear the search"
              className="hover-icon absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-ink-500"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Announced rather than only drawn, so a screen reader learns that
          tapping a chip changed what is below it. */}
      <p aria-live="polite" className="m-0 mt-4 text-body-sm text-ink-500">
        {showing === total
          ? `All ${total} colours. Tap up to three.`
          : `${showing} of ${total} colours.`}
        {samples.length > 0 && (
          <span className="text-ink-700">
            {' '}
            {samples.length} in your samples.
          </span>
        )}
      </p>

      {/* ── The range ────────────────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="mt-10 rounded-md border border-calico-300 bg-calico-100 px-6 py-12 text-center">
          <p className="m-0 font-display text-h3 font-semibold text-ink-900">
            Nothing matches “{query.trim()}”.
          </p>
          <p className="m-0 mt-2 text-body-sm leading-relaxed text-ink-500">
            Try the colour on its own — “grey”, “mink”, “teal” — or clear the search and browse a
            collection.
          </p>
        </div>
      ) : (
        groups.map(collection => (
          <div key={collection.id} className="mt-10 first:mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-calico-300 pb-3">
              <h3 className="m-0 font-display text-h3 font-semibold text-ink-900">
                {collection.name}
              </h3>
              <span className="font-data text-caption uppercase tracking-widest text-ink-500">
                {collection.fabrics.length}{' '}
                {collection.fabrics.length === 1 ? 'colour' : 'colours'}
              </span>
            </div>
            {collection.description && (
              <p className="m-0 mt-3 max-w-read text-body-sm leading-relaxed text-ink-700">
                {collection.description}
              </p>
            )}

            <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {collection.fabrics.map(fabric => (
                <li key={fabric.id}>
                  <SwatchTile fabric={fabric} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
