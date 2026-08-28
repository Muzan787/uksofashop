'use client'
// src/app/faq/FaqList.tsx

import { useMemo, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import EmptyState from '@/components/UI/EmptyState'
import { faqGroups, type Faq } from './faqData'

/**
 * The questions, searchable.
 *
 * Two things about how this is built matter.
 *
 * Every answer is in the DOM at all times. The panels collapse with
 * `grid-template-rows: 0fr → 1fr` and `overflow: hidden`, not by being
 * unmounted — so the text is there for search engines, for the browser's own
 * find-on-page, and for anybody whose JavaScript never arrived. The previous
 * version used <details>, which had the same property; a version that mounted
 * the answer on click would have quietly removed twenty answers from the page.
 *
 * The filter matches questions AND answers. Somebody searching "stairs" is
 * looking for the upstairs delivery answer, and the word "stairs" is not in
 * that question — only in the answer to it.
 */
export default function FaqList() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const needle = query.trim().toLowerCase()

  const groups = useMemo(() => {
    if (!needle) return faqGroups
    return faqGroups
      .map(g => ({
        ...g,
        items: g.items.filter(
          f => f.q.toLowerCase().includes(needle) || f.a.toLowerCase().includes(needle),
        ),
      }))
      .filter(g => g.items.length > 0)
  }, [needle])

  const hits = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div>
      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="group relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
        />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search the questions…"
          aria-label="Search frequently asked questions"
          className="h-14 w-full rounded-sm border border-calico-300 bg-calico-100 pl-11 pr-11 text-body text-ink-900 outline-none transition-[border-color,box-shadow] duration-swift ease-out-expo placeholder:text-ink-500 focus:border-ember-700 focus:shadow-[0_0_0_1px_var(--color-ember-700)] [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear the search"
            className="hover-icon absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-sm text-ink-500"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Announced, not just shown: somebody filtering with a screen reader
          needs to hear that the list under them changed. */}
      <p aria-live="polite" className="m-0 mt-3 min-h-5 font-data text-caption text-ink-500">
        {needle
          ? `${hits} ${hits === 1 ? 'answer' : 'answers'} matching “${query.trim()}”`
          : ''}
      </p>

      {/* ── The questions ─────────────────────────────────────────────── */}
      {hits === 0 ? (
        <EmptyState
          icon={Search}
          heading="Nothing matches that"
          line="Try a plainer word — “stairs”, “refund”, “fabric” — or just ask us directly."
          action={{ label: 'Ask us', href: '/contact' }}
          className="mt-6"
        />
      ) : (
        <div className="mt-6 flex flex-col gap-10">
          {groups.map(({ group, items }) => (
            <section key={group}>
              <h2 className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-700">
                {group}
              </h2>

              <div className="mt-4 flex flex-col gap-2">
                {items.map(f => (
                  <Item
                    key={f.q}
                    faq={f}
                    // While filtering, everything left is opened: a single
                    // result that still needs a click to reveal the answer is
                    // one interaction too many.
                    open={Boolean(needle) || open === f.q}
                    onToggle={() => setOpen(o => (o === f.q ? null : f.q))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Item({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  const id = `faq-${faq.q.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`

  return (
    <div className="overflow-hidden rounded-md border border-calico-300 bg-calico-50">
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-swift ease-out-expo hover:bg-calico-100"
        >
          <span className={`text-body font-semibold leading-snug ${open ? 'text-ember-700' : 'text-ink-900'}`}>
            {faq.q}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-ember-700 transition-transform duration-base ease-out-expo ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>

      {/* 0fr → 1fr, which the browser interpolates without anyone measuring
          anything. The inner div must be min-h-0 or the row refuses to shrink
          below its content and nothing ever closes. */}
      <div
        id={id}
        role="region"
        className="grid transition-[grid-template-rows] duration-base ease-out-expo"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="m-0 border-t border-calico-300 px-4 py-4 text-body-sm leading-relaxed text-ink-700">
            {faq.a}
          </p>
        </div>
      </div>
    </div>
  )
}
