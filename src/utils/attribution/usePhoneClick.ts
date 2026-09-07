'use client'
// src/utils/attribution/usePhoneClick.ts
//
// The phone-click half of trackContactEvent (utils/tracking.ts) - one hook so
// every public tel: link on the site reports the same way. Unlike WhatsApp,
// a phone click mints no reference and creates no enquiry row: there is
// nothing to link a later order back to, so this is a plain, once-per-click
// GA4 phone_click + Meta Contact + attribution_actions 'call_click' row (the
// last piggybacked onto the same request in /api/meta/event/route.ts).

import { useRef } from 'react'
import { trackContactEvent } from '@/utils/tracking'

export function usePhoneClick(): () => void {
  const sent = useRef(false)

  return function onClick() {
    if (sent.current) return
    sent.current = true

    trackContactEvent({
      channel: 'phone',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
    })
  }
}
