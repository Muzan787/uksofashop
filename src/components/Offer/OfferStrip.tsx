'use client'
// src/components/Offer/OfferStrip.tsx
//
// The offer, as one line under the price - with the time it has left.
//
// Every visitor holds an entitlement (OfferProvider) - since 2026-10-12, not
// only those from a Meta or Google ad -
// that takes a fixed amount off the sofa at checkout. This used to be
// announced by a sheet that opened on arrival, over the product, before the
// visitor had seen what they came for; two in three closed it unread. Now
// the product page says it in place: "£30 off this sofa with SOFAEXTRA",
// with the real figure for THIS product's tier, and the sheet opens only if
// they tap for the detail.
//
// THE COUNTDOWN IS REAL. Each visitor's window is the length set in Admin ->
// Settings (72 hours since 13 Nov 2026) from their first
// ad click, fixed: a later click does not extend it, and once it ends it is
// not given again (see the fixed-window migration). When the clock reaches zero
// the strip goes, the checkout stops taking the money off, and the code stops
// working. That is the only kind of timer the DMCC Act allows - one that
// restarted, or that the shop ignored, would be a banned practice.
//
// Calm on purpose: a ticking figure in the data face, no red, no flashing,
// and the clock time beside it so the deadline does not depend on reading a
// moving number. The ticking digits are hidden from screen readers, which
// would otherwise announce every second; they get the deadline as text.
//
// Nothing renders for a product in the EXCLUDED tier, with no tier row, taken
// off the offer by hand in Admin -> Settings, or priced under the floor in
// those settings (£400 since 2026-10-24) - a strip promising savings on a
// sofa that gets none would be the one thing worse than the sheet.

import { ChevronRight, Tag } from 'lucide-react'
import { OFFER_OPEN_EVENT, OFFER_PUBLIC_CODE } from '@/utils/offers/constants'
import { useShopSettings } from '@/components/ShopSettingsProvider'
import type { OfferTier } from '@/types/offers'
import { offerAmountFor } from '@/utils/offers/amount'
import { seasonCode } from '@/utils/seasonal'
import { useSeasonPhase } from '@/components/Season/useSeasonPhase'
import { useOfferCountdown } from './useOfferCountdown'
import { useOffer } from './OfferProvider'
import LogoHat from '@/components/Season/LogoHat'
import { formatOfferDeadline } from '@/utils/offers/deadline'

const money = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`

interface Props {
  /**
   * This product's tier, read on the server. Null when it has no row, or when
   * it is on the excluded list.
   */
  tier: OfferTier | null
  /**
   * The price of the colourway on screen. Under the offer's floor nothing is
   * shown, because calculate_order_offer will take nothing off it - and a
   * £399 sofa with a £450 colourway is two different answers, which is why
   * this is checked here rather than on the server.
   */
  price?: number
  className?: string
}

export default function OfferStrip({ tier, price, className = '' }: Props) {
  const { active, clock, deadline } = useOfferCountdown()
  // The tier amounts and the floor from Admin -> Settings, the same ones
  // checkout prices by.
  const { tierAmounts, offerMinPrice } = useShopSettings()
  const phase = useSeasonPhase()
  // In season the shop shows BLACKFRIDAY or CHRISTMAS; all spellings are one offer.
  const code = seasonCode(phase) ?? OFFER_PUBLIC_CODE
  const madeToOrder = tier === 'MADE_TO_ORDER'
  // The same rule as checkout: a flat £50 on Made-To-Order, otherwise the
  // tier amount and the floor (see utils/offers/amount.ts).
  const amount = offerAmountFor(tier, price ?? 0, tierAmounts, price === undefined ? 0 : offerMinPrice)
  const { endedAt } = useOffer()
  if (amount <= 0) return null
  // A returning visitor whose one-time window has ended (Run 8): say so
  // plainly, with the date, rather than show nothing. The window is NOT
  // reopened - it was promised to run once, from the first visit.
  if (!active) {
    if (!endedAt) return null
    return (
      <p className={`m-0 rounded-sm border border-calico-300 bg-calico-100 px-3.5 py-2.5 text-caption text-ink-700 ${className}`}>
        Your one-time online offer ended on {formatOfferDeadline(endedAt)}. The price shown is the price today. Questions about it? Message us on WhatsApp.
      </p>
    )
  }

  const open = () => {
    window.dispatchEvent(new CustomEvent(OFFER_OPEN_EVENT, { detail: { amount } }))
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`hover-btn flex w-full items-center gap-3 rounded-sm border border-ember-500/40 bg-ember-500/[0.08] px-3.5 py-3 text-left transition-colors duration-swift ease-out-expo ${className}`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-ember-500 text-ink-900">
        {/* Seasonal hat on the tag (14 Nov to 25 Dec; owner request, 15 Nov). */}
        <LogoHat placement="-left-2 -top-3 h-[18px] w-[22px] -rotate-[22deg]" />
        <Tag aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold leading-snug text-ink-900">
          £{amount} off this {madeToOrder ? 'made-to-order sofa' : 'sofa'} with <code className="font-data font-extrabold tracking-[0.08em]">{code}</code>
        </span>
        {/* The price actually payable. Nothing is estimated: it is the price on
            screen minus the same amount checkout takes off, so the two can
            never disagree and the saving is no surprise at the end. */}
        {price !== undefined && (
          <span className="mt-0.5 block text-caption font-semibold text-ink-900">
            You pay <span className="tabular-nums">{money(price - amount)}</span> with the offer
            <span className="font-normal text-ink-500"> (listed price <span className="tabular-nums">{money(price)}</span>)</span>
          </span>
        )}
        <span className="mt-0.5 block text-caption text-ink-500">
          {clock ? (
            <>
              Ends in{' '}
              <span aria-hidden="true" className="font-data font-bold tabular-nums text-ember-700">{clock}</span>
              <span className="sr-only">{deadline}</span>
              <span aria-hidden="true"> · {deadline}</span>
            </>
          ) : (
            'Taken off automatically at checkout'
          )}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
    </button>
  )
}
