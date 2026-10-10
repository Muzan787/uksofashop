'use client'
// src/components/Offer/OfferAnnouncement.tsx
//
// The announcement bar's line while a paid visitor's offer is open:
// "Your offer ends in 47:12:05". Its own component so the second-by-second
// tick re-renders these few words, not the whole header.
//
// The bar is an aria-live region. The ticking digits are hidden from it -
// otherwise a screen reader would announce every second - and the deadline
// is given once as text instead.

import { useOfferCountdown } from './useOfferCountdown'

export default function OfferAnnouncement() {
  const { clock, deadline } = useOfferCountdown()
  if (!clock) return <>Your online offer is active</>
  return (
    <>
      <span aria-hidden="true">
        Your offer ends in <span className="font-data tabular-nums text-ember-300">{clock}</span>
      </span>
      <span className="sr-only">Your online offer ends {deadline}</span>
    </>
  )
}
