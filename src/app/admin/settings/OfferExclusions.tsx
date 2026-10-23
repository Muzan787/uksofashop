'use client'
// src/app/admin/settings/OfferExclusions.tsx
//
// The sofas the visitor offer never applies to (2026-10-24).
//
// Two halves, because that is how the job actually goes: the list of what is
// currently off the offer, which is the thing worth checking at a glance, and
// a search box for taking something else off it. The whole catalogue as one
// long list of toggles would be 70 rows to scroll past on a phone to find the
// three that matter.
//
// Separate from the tier each sofa is in (set on the sofa's own page in
// Inventory): a sofa keeps its tier while it is off the offer, and gets it
// back when it goes on again. Anything under the price floor already gets
// nothing without being listed here, so the note says so rather than leaving
// Muaz to exclude 20 cheap sofas by hand.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { setProductOfferExcluded } from '@/app/actions/settings'
import { gbpFigure } from '@/utils/shopSettings'

export interface OfferProductRow {
  id: string
  title: string
  /** base_price, as the catalogue lists it. */
  price: number
  /** Its offer tier, or null where it has no row. */
  tier: string | null
  excluded: boolean
}

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-bold disabled:opacity-50'
const input = 'min-h-11 w-full rounded-sm border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-orange-500'

/** How many search results are shown at once. */
const RESULTS = 8

export default function OfferExclusions({
  products,
  minPrice,
}: {
  products: OfferProductRow[]
  /** The floor from the figures above, so the note quotes the live one. */
  minPrice: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [query, setQuery] = useState('')

  const excluded = useMemo(() => products.filter(p => p.excluded), [products])
  const belowFloor = useMemo(() => products.filter(p => p.price < minPrice).length, [products, minPrice])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products.filter(p => !p.excluded && p.title.toLowerCase().includes(q)).slice(0, RESULTS)
  }, [products, query])

  async function toggle(p: OfferProductRow, off: boolean) {
    setBusy(p.id)
    setMessage(null)
    const res = await setProductOfferExcluded(p.id, off)
    setBusy(null)
    setMessage(res.ok
      ? { ok: true, text: off ? `${p.title} is off the offer.` : `${p.title} is back on the offer.` }
      : { ok: false, text: res.text })
    if (res.ok) {
      if (off) setQuery('')
      router.refresh()
    }
  }

  const describe = (p: OfferProductRow) =>
    `${gbpFigure(p.price)}${p.tier ? ` · ${p.tier.charAt(0)}${p.tier.slice(1).toLowerCase()} tier` : ' · no tier'}`

  return (
    <div className="space-y-5">
      <div>
        <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Off the offer</h3>
        {excluded.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-stone-500">
            Nothing is excluded by hand. Every sofa at {gbpFigure(minPrice)} or more gets the money off for its tier.
          </p>
        ) : (
          <ul className="m-0 mt-2 list-none divide-y divide-stone-100 p-0">
            {excluded.map(p => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="m-0 font-semibold text-stone-900">{p.title}</p>
                  <p className="m-0 text-xs text-stone-500">{describe(p)}</p>
                </div>
                <button
                  type="button"
                  disabled={busy !== null}
                  className={`${button} border border-stone-300 bg-white text-stone-800`}
                  onClick={() => void toggle(p, false)}
                >
                  {busy === p.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Put back on
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-sm border border-stone-200 bg-stone-50 p-3">
        <label htmlFor="offer-exclude-search" className="mb-1 block text-sm font-semibold text-stone-800">
          Take a sofa off the offer
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            id="offer-exclude-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            className={`${input} pl-9`}
            placeholder="Type part of the name"
          />
        </div>

        {query.trim() !== '' && (
          matches.length === 0 ? (
            <p className="m-0 mt-2 text-sm text-stone-500">No sofa on the offer matches that.</p>
          ) : (
            <ul className="m-0 mt-2 list-none divide-y divide-stone-100 p-0">
              {matches.map(p => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="m-0 font-semibold text-stone-900">{p.title}</p>
                    <p className="m-0 text-xs text-stone-500">{describe(p)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy !== null}
                    className={`${button} bg-stone-900 text-white`}
                    onClick={() => void toggle(p, true)}
                  >
                    {busy === p.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Take it off
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        <p className="m-0 mt-3 text-xs leading-relaxed text-stone-500">
          No need to list the cheap ones: nothing under {gbpFigure(minPrice)} carries the offer
          anyway{belowFloor > 0 ? `, which is ${belowFloor} of the sofas on sale now` : ''}. Change
          that figure under <strong>The visitor offer</strong> in Figures above.
        </p>
      </div>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </div>
  )
}
