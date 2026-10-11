'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ensureVisitorId } from '@/utils/attribution/ids'
import { classifyPaidLanding } from '@/utils/offers/paidTraffic'
import { INACTIVE_OFFER_ENTITLEMENT, type PublicOfferEntitlement } from '@/types/offerEntitlement'
import { useOffer } from './OfferProvider'

/** Pages for people who have already ordered. No new offer window opens here. */
const AFTER_SALE_PATHS = ['/confirm-order', '/track-order', '/account', '/review']

function isPublicState(value: unknown): value is PublicOfferEntitlement {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return typeof v.active === 'boolean' && typeof v.offerAvailable === 'boolean'
}

export default function OfferBoot() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setEntitlement } = useOffer()
  const initialStatusDone = useRef(false)
  const lastQualifiedLanding = useRef<string | null>(null)
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return

    let cancelled = false
    let qualificationRetryTimer: ReturnType<typeof setTimeout> | null = null
    const landingPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const paidSource = classifyPaidLanding(landingPath)

    // Reuse the site's established ~400-day browser visitor identity. This is
    // deliberately an import of the existing helper rather than a second id
    // system, and it closes the first-ever-visit race before qualification.
    ensureVisitorId()

    const installState = (state: PublicOfferEntitlement) => {
      if (cancelled) return
      setEntitlement(state)

      if (expiryTimer.current) clearTimeout(expiryTimer.current)
      expiryTimer.current = null

      if (!state.active || !state.expiresAt) return

      // Server validates the HttpOnly entitlement before writing the event;
      // the client merely prompts that check after attribution cookies have
      // been created on the landing page. A short retry closes the first-load
      // effect-order race without creating duplicates (the entitlement token
      // is the database action id).
      const recordQualification = () => {
        void fetch('/api/offer/qualified-event', {
          method: 'POST',
          cache: 'no-store',
          keepalive: true,
        }).catch(() => {})
      }
      recordQualification()
      qualificationRetryTimer = setTimeout(recordQualification, 300)

      const remaining = Date.parse(state.expiresAt) - Date.now()
      if (!Number.isFinite(remaining) || remaining <= 0) {
        setEntitlement(INACTIVE_OFFER_ENTITLEMENT)
        return
      }

      // A window (48 hours, or what is left of an old seven-day one) is far
      // below the browser timer ceiling. Re-check
      // server authority just after expiry instead of leaving a stale reminder
      // alive until the next navigation.
      expiryTimer.current = setTimeout(() => {
        void fetch('/api/offer/status', { cache: 'no-store' })
          .then(r => r.ok ? r.json() as Promise<unknown> : null)
          .then(value => {
            if (!cancelled && isPublicState(value)) setEntitlement(value)
            else if (!cancelled) setEntitlement(INACTIVE_OFFER_ENTITLEMENT)
          })
          .catch(() => {
            if (!cancelled) setEntitlement(INACTIVE_OFFER_ENTITLEMENT)
          })
      }, Math.min(remaining + 250, 2_147_000_000))
    }

    const readResponse = async (response: Response): Promise<PublicOfferEntitlement> => {
      if (!response.ok) return INACTIVE_OFFER_ENTITLEMENT
      const value: unknown = await response.json()
      return isPublicState(value) ? value : INACTIVE_OFFER_ENTITLEMENT
    }

    const qualify = () => fetch('/api/offer/qualify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ landingPath }),
    })

    // Every visitor gets the 48-hour offer since 2026-10-12, so the first
    // page of a visit asks for a window rather than only reading one. The
    // server returns the visitor's existing window untouched if they have
    // one (an ended one stays ended), or opens a new one. A paid landing
    // later in the visit asks again, which credits the window to the ad
    // without moving its deadline.
    //
    // Not on the after-sale pages: a customer opening their order
    // confirmation, tracking or account should not be shown a countdown to a
    // discount on something they have already bought. They only read status.
    const afterSale = AFTER_SALE_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))

    if (paidSource && lastQualifiedLanding.current !== landingPath) {
      lastQualifiedLanding.current = landingPath
      initialStatusDone.current = true
      void qualify()
        .then(readResponse)
        .then(installState)
        .catch(() => installState(INACTIVE_OFFER_ENTITLEMENT))
    } else if (!initialStatusDone.current) {
      initialStatusDone.current = true
      void (afterSale ? fetch('/api/offer/status', { cache: 'no-store' }) : qualify())
        .then(readResponse)
        .then(installState)
        .catch(() => installState(INACTIVE_OFFER_ENTITLEMENT))
    }

    return () => {
      cancelled = true
      if (qualificationRetryTimer) clearTimeout(qualificationRetryTimer)
    }
  }, [pathname, searchParams, setEntitlement])

  return null
}
