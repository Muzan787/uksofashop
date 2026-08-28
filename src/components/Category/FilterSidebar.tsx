'use client'
// src/components/Category/FilterSidebar.tsx

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, SlidersHorizontal } from 'lucide-react'
import PriceRange from './PriceRange'
import Sheet from '@/components/UI/Sheet'

export interface FilterOption {
  value: string
  /** How many products in this category would match. */
  count: number
}

interface Props {
  styles: FilterOption[]
  materials: FilterOption[]
  colors: FilterOption[]
  /** The category's own price bounds, and where the handles sit now. */
  priceFloor: number
  priceCeiling: number
  priceFrom: number
  priceTo: number
  /** Matching the current selection — the number on the sheet's button. */
  resultCount: number
}

export default function FilterSidebar({
  styles, materials, colors,
  priceFloor, priceCeiling, priceFrom, priceTo,
  resultCount,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [open, setOpen] = useState(false)

  const toggle = useCallback((key: string, val: string) => {
    const params = new URLSearchParams(sp.toString())
    if (params.get(key) === val) params.delete(key)
    else params.set(key, val)
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [sp, router, pathname])

  const clearAll = useCallback(() => {
    // Sort survives: it is how the customer wants to read the shop, not a
    // narrowing of it, and throwing it away with the filters is a surprise.
    const params = new URLSearchParams()
    const sort = sp.get('sort')
    if (sort) params.set('sort', sort)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [sp, router, pathname])

  const activeCount =
    (sp.get('style') ? 1 : 0) +
    (sp.get('material') ? 1 : 0) +
    (sp.get('color') ? 1 : 0) +
    (sp.get('min') || sp.get('max') ? 1 : 0)

  const groups = [
    { key: 'style', label: 'Style', options: styles },
    { key: 'material', label: 'Material', options: materials },
    { key: 'color', label: 'Colour', options: colors },
  ].filter(g => g.options.length > 0)

  const controls = (
    <div className="flex flex-col gap-7">
      {priceCeiling > priceFloor && (
        <div>
          <p className="eyebrow mb-3 text-ink-500">Price</p>
          <PriceRange floor={priceFloor} ceiling={priceCeiling} from={priceFrom} to={priceTo} />
        </div>
      )}

      {groups.map(({ key, label, options }) => (
        <div key={key}>
          <p className="eyebrow mb-2 text-ink-500">{label}</p>
          <div className="flex flex-col">
            {options.map(({ value, count }) => {
              const active = sp.get(key) === value.toLowerCase()
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(key, value.toLowerCase())}
                  // 44px minimum. These were 8px-padded 12px rows — under every
                  // touch-target guideline there is, and the main control on
                  // the page for narrowing a listing.
                  className={`flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left transition-colors duration-swift ease-out-expo ${
                    active ? 'bg-ember-500/10' : 'hover:bg-calico-100'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-2 transition-colors duration-swift ${
                      active ? 'border-ember-500 bg-ember-500' : 'border-calico-300'
                    }`}
                  >
                    {active && <Check className="h-3 w-3 text-ink-900" strokeWidth={3} />}
                  </span>

                  <span className={`flex-1 text-body-sm ${active ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                    {value}
                  </span>

                  {/* How many you would be left with. Without it the only way
                      to find out an option returns nothing is to try it. */}
                  <span className="font-data text-caption tabular-nums text-ink-500">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* ── The trigger, phones only ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-sm border text-body-sm font-semibold transition-colors duration-swift ease-out-expo lg:hidden ${
          activeCount
            ? 'border-ember-500 bg-ember-500/10 text-ember-700'
            : 'border-calico-300 bg-calico-50 text-ink-700'
        }`}
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-ember-500 px-1.5 font-data text-caption font-bold tabular-nums text-ink-900">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── The sheet ─────────────────────────────────────────────────────
          A bottom sheet, not a 290px side drawer. A drawer that narrow put
          the controls in a column too tight for a 44px row, and it arrived
          from the side — the direction a phone's own sheets never come from. */}
      {open && (
        <Sheet
          title="Filters"
          onClose={() => setOpen(false)}
          className="lg:hidden"
          footer={
            <div className="flex gap-3">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="hover-btn h-12 shrink-0 rounded-sm border border-calico-300 px-4 text-body-sm font-semibold text-ink-700"
                >
                  Clear
                </button>
              )}
              {/* It used to say "Apply Filters", which it never did — every
                  tap had already applied. Now it says what pressing it
                  actually gets you. */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="hover-btn h-12 flex-1 rounded-sm bg-ember-500 text-body-sm font-bold text-ink-900"
              >
                {resultCount === 0
                  ? 'No sofas match'
                  : `Show ${resultCount} ${resultCount === 1 ? 'sofa' : 'sofas'}`}
              </button>
            </div>
          }
        >
          {controls}
        </Sheet>
      )}

      {/* ── The desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow text-ember-700">Filters</span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="hover-link text-caption text-ink-500"
            >
              Clear all
            </button>
          )}
        </div>
        {controls}
      </aside>
    </>
  )
}
