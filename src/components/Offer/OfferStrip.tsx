'use client'
// src/components/Offer/OfferStrip.tsx
//
// The offer, as one line under the price - with the time it has left.
//
// A visitor from a Meta or Google ad holds an entitlement (OfferProvider)
// that takes a fixed amount off the sofa at checkout. This used to be
// announced by a sheet that opened on arrival, over the product, before the
// visitor had seen what they came for; two in three closed it unread. Now
// the product page says it in place: "£30 off this sofa with SOFAEXTRA",
// with the real figure for THIS product's tier, and the sheet opens only if
// they tap for the detail.
//
// THE COUNTDOWN IS REAL. Each visitor's window is 48 hours from their first
// ad click, fixed: a later click does not extend it, and once it ends it is
// not given again (see the 48-hour migration). When the clock reaches zero
// the strip goes, the checkout stops taking the money off, and the code stops
// working. That is the only kind of timer the DMCC Act allows - one that
// restarted, or that the shop ignored, would be a banned practice.
//
// Calm on purpose: a ticking figure in the data face, no red, no flashing,
// and the clock time beside it so the deadline does not depend on reading a
// moving number. The ticking digits are hidden from screen readers, which
// would otherwise announce every second; they get the deadline as text.
//
// Nothing renders for a product in the EXCLUDED tier or with no tier row -
// a strip promising savings on a sofa that gets none would be the one thing
// worse than the sheet.

import { ChevronRight, Tag } from 'lucide-react'
import { OFFER_OPEN_EVENT, OFFER_PUBLIC_CODE, OFFER_TIER_AMOUNTS } from '@/utils/offers/constants'
import type { OfferTier } from '@/types/offers'
import { useOfferCountdown } from './useOfferCountdown'

interface Props {
  /** This product's tier, read on the server. Null when it has no row. */
  tier: OfferTier | null
  className?: string
}

export default function OfferStrip({ tier, className = '' }: Props) {
  const { active, clock, deadline } = useOfferCountdown()
  const amount = tier ? OFFER_TIER_AMOUNTS[tier] : 0
  if (!active || amount <= 0) return null

  const open = () => {
    window.dispatchEvent(new CustomEvent(OFFER_OPEN_EVENT, { detail: { amount } }))
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`hover-btn flex w-full items-center gap-3 rounded-sm border border-ember-500/40 bg-ember-500/[0.08] px-3.5 py-3 text-left transition-colors duration-swift ease-out-expo ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-ember-500 text-ink-900">
        <Tag aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold leading-snug text-ink-900">
          £{amount} off this sofa with <code className="font-data font-extrabold tracking-[0.08em]">{OFFER_PUBLIC_CODE}</code>
        </span>
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
