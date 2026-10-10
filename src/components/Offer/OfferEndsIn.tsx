'use client'
// src/components/Offer/OfferEndsIn.tsx
//
// "ends in 47:12:05", for a line that already says what the offer is - the
// discount row in the basket and the checkout. Draws nothing unless the
// visitor's window is open, so it can sit beside any discount without
// claiming a deadline the discount does not have.

import { useOfferCountdown } from './useOfferCountdown'

export default function OfferEndsIn({ prefix = ' · ', className = '' }: { prefix?: string; className?: string }) {
  const { active, clock, deadline } = useOfferCountdown()
  if (!active || !clock) return null
  return (
    <span className={className}>
      <span aria-hidden="true">
        {prefix}ends in <span className="font-data tabular-nums">{clock}</span>
      </span>
      <span className="sr-only">{prefix}ends {deadline}</span>
    </span>
  )
}
