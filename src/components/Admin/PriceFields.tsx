'use client'
// src/components/Admin/PriceFields.tsx
//
// The two price fields, and a live preview of what they do to the shop.
//
// One component rather than the same block pasted into AddProductForm and
// EditProductForm, because the pairing is the whole point: a was price only
// means anything relative to the price beside it, and the percentage the
// customer will read is worked out from both. Seeing "25% OFF" before saving
// is what stops £1,199 / £899 going live as "26%", or as nothing at all
// because the two figures were entered the wrong way round.
//
// The inputs keep their original `name`s, so the server action's FormData
// reading is untouched.

import { AlertTriangle, Tag } from 'lucide-react'
import { useState } from 'react'
import { percentOff, pounds } from '@/utils/pricing'

interface Props {
  /** products.base_price. Blank on a new product. */
  basePrice?: number | string | null
  /** products.was_price. Null or blank means no discount is shown. */
  wasPrice?: number | string | null
}

const INPUT =
  'w-full p-3.5 bg-white border border-stone-200 rounded-sm focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg'
const LABEL = 'block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2'
const HINT = 'text-[11px] text-stone-400 mt-1.5 leading-relaxed'

export default function PriceFields({ basePrice: initialBase, wasPrice: initialWas }: Props) {
  const [basePrice, setBasePrice] = useState(
    initialBase === null || initialBase === undefined ? '' : String(initialBase),
  )
  const [wasPrice, setWasPrice] = useState(
    initialWas === null || initialWas === undefined ? '' : String(initialWas),
  )

  const base = Number(basePrice)
  const was = Number(wasPrice)
  const haveBase = basePrice.trim() !== '' && Number.isFinite(base) && base > 0
  const haveWas = wasPrice.trim() !== '' && Number.isFinite(was) && was > 0

  // The same floor-rounded figure the storefront will print — see
  // utils/pricing.ts for why it rounds down.
  const pct = haveBase && haveWas ? percentOff(base, was) : 0
  const tooLow = haveWas && haveBase && was <= base
  const tooSmall = haveWas && haveBase && !tooLow && pct < 1

  return (
    <div className="md:col-span-2 grid grid-cols-1 gap-5 rounded-sm border border-stone-200 bg-stone-50 p-5 sm:grid-cols-2">
      <div>
        <label className={LABEL} htmlFor="basePrice">Price now (£)</label>
        <input
          id="basePrice"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          name="basePrice"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          placeholder="899.00"
          required
          className={INPUT}
        />
        <p className={HINT}>
          What the customer pays. Every order is priced from this figure, whatever the page shows.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="wasPrice">
          Was price (£) <span className="text-stone-400">— optional</span>
        </label>
        <input
          id="wasPrice"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          name="wasPrice"
          value={wasPrice}
          onChange={(e) => setWasPrice(e.target.value)}
          placeholder="Leave blank — no discount"
          className={INPUT}
        />
        <p className={HINT}>
          The old price, crossed out beside the new one. Clear the box to end the sale.
        </p>
      </div>

      {/* ── What the customer will see ──────────────────────────────────── */}
      <div className="sm:col-span-2">
        {!haveWas ? (
          <p className="m-0 flex items-center gap-2 text-xs font-medium text-stone-500">
            <Tag className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
            No discount. The price shows on its own, exactly as it does now.
          </p>
        ) : tooLow ? (
          <p className="m-0 flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            The was price has to be higher than the price now
            {haveBase ? ` (${pounds(base)})` : ''}. This will not save.
          </p>
        ) : tooSmall ? (
          <p className="m-0 flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            Under 1% off — too small to round to a percentage, so nothing will be crossed out.
          </p>
        ) : (
          <div className="rounded-sm border border-stone-200 bg-white p-4">
            <p className="m-0 mb-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
              What the customer sees
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-black tracking-tight text-stone-900">{pounds(base)}</span>
              <span className="text-lg font-bold text-stone-400 line-through">{pounds(was)}</span>
              <span className="rounded-sm bg-orange-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                {pct}% off
              </span>
            </div>
            <p className="m-0 mt-2.5 text-[11px] leading-relaxed text-stone-500">
              They save <strong className="font-bold text-stone-700">{pounds(was - base)}</strong>. The
              same crossed-out price and badge appear on the product page, on every listing card, and
              in the Google and Facebook product feeds.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
