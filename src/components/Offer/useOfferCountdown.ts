'use client'
// src/components/Offer/useOfferCountdown.ts
//
// The visitor's offer window as something to draw: the time left, ticking,
// and the deadline as a clock time.
//
// Reads OfferProvider, which OfferBoot keeps in step with the server - and
// which goes inactive by itself when the window ends (OfferBoot re-checks
// just after expiry). So a consumer only has to stop drawing when `active`
// is false; it never decides on its own that the offer is over or still on.
//
// Ticks once a second while there is something to count, and not at all
// otherwise. `remainingMs` is null until mounted, so the server render and
// the first client render agree and the clock appears a frame later rather
// than flashing a wrong value.

import { useEffect, useState } from 'react'
import { formatCountdown, formatOfferDeadline } from '@/utils/offers/deadline'
import { useOffer } from './OfferProvider'

export interface OfferCountdown {
  active: boolean
  expiresAt: string | null
  /** Milliseconds left, or null before the first tick. */
  remainingMs: number | null
  /** "47:12:05", or '' before the first tick. */
  clock: string
  /** "Sun 12 Oct, 2:05pm", or ''. */
  deadline: string
}

export function useOfferCountdown(): OfferCountdown {
  const { active, expiresAt } = useOffer()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (!active || !expiresAt) return
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [active, expiresAt])

  const ends = expiresAt ? Date.parse(expiresAt) : Number.NaN
  const remainingMs = active && now !== null && Number.isFinite(ends) ? Math.max(0, ends - now) : null

  return {
    active: active && Boolean(expiresAt),
    expiresAt,
    remainingMs,
    clock: remainingMs === null ? '' : formatCountdown(remainingMs),
    deadline: expiresAt ? formatOfferDeadline(expiresAt) : '',
  }
}
