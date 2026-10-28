'use client'
// src/components/Halloween/HalloweenAnnouncement.tsx
//
// The announcement bar's line for Halloween 2026.
//
// While the visitor's offer window is open the countdown stays - it is the
// deadline the shop honours, and the bar is where it is seen on every page -
// with a pumpkin beside it and the midnight-sofas link after it where there
// is room. Without an open window the whole line is the link.
//
// One line at 375px, as the bar has to be (see Header). The bar leaves 279px
// between its gutters, and the pumpkin takes 22 of them, so the countdown
// reads "Offer ends in" rather than OfferAnnouncement's "Your offer ends in" -
// which, with the pumpkin, wrapped. Same clock, same deadline for screen
// readers.

import Link from 'next/link'
import { useOfferCountdown } from '@/components/Offer/useOfferCountdown'
import { MIDNIGHT_HREF } from '@/constants/halloween'
import { Pumpkin } from './Icons'

// py-3 grows the tap area to the full height of the bar, and -my-3 gives the
// same back, so the bar stays 36px whether the link is inline or a flex item.
const link = 'hover-link -my-3 py-3 text-ember-300 no-underline'

export default function HalloweenAnnouncement({ offerActive }: { offerActive: boolean }) {
  const { clock, deadline } = useOfferCountdown()

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Pumpkin className="h-3.5 w-3.5 shrink-0 text-ember-500" />
      {offerActive ? (
        <span>
          {clock ? (
            <>
              <span aria-hidden="true">
                Offer ends in <span className="font-data tabular-nums text-ember-300">{clock}</span>
              </span>
              <span className="sr-only">Your online offer ends {deadline}</span>
            </>
          ) : (
            'Online offer active'
          )}
          <span className="hidden sm:inline">
            <span aria-hidden="true" className="mx-2.5 text-calico-50/30">·</span>
            <Link href={MIDNIGHT_HREF} className={link}>
              Midnight sofas <span aria-hidden="true">→</span>
            </Link>
          </span>
        </span>
      ) : (
        <Link href={MIDNIGHT_HREF} className={link}>
          <span className="sm:hidden">Halloween picks</span>
          <span className="hidden sm:inline">Halloween night in? Shop our midnight sofas</span>
          <span aria-hidden="true"> →</span>
        </Link>
      )}
    </span>
  )
}
