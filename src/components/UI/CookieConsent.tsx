'use client'
// src/components/UI/CookieConsent.tsx

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getConsent, grantConsent, revokeConsent,
  CONSENT_GRANTED_EVENT, CONSENT_REOPEN_EVENT,
} from '@/utils/consent'

/**
 * Compact first-arrival consent question.
 *
 * Essential-only and accept-all remain equally easy to reach; the banner stays
 * above the mobile navigation and never blocks the page with a modal overlay.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)

  const show = useCallback(() => {
    setOpen(true)
    requestAnimationFrame(() => setEntered(true))
  }, [])

  useEffect(() => {
    const consent = getConsent()
    if (!consent) show()
    else if (consent === 'granted') window.dispatchEvent(new Event(CONSENT_GRANTED_EVENT))

    window.addEventListener(CONSENT_REOPEN_EVENT, show)
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, show)
  }, [show])

  function answer(status: 'granted' | 'denied') {
    setEntered(false)
    setTimeout(() => {
      setOpen(false)
      if (status === 'granted') grantConsent()
      else revokeConsent({ reload: getConsent() === 'granted' })
    }, 260)
  }

  if (!open) return null

  const button =
    'hover-btn flex min-h-11 flex-1 items-center justify-center rounded-sm border px-4 ' +
    'text-caption font-bold transition-colors duration-swift ease-out-expo sm:flex-none'

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
      className="fixed inset-x-0 z-consent px-3 pb-3 sm:px-5"
      style={{ bottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className={`mx-auto max-w-[760px] rounded-md border border-ink-700 bg-ink-900 px-4 py-3.5 shadow-e3 transition-[transform,opacity] duration-base ease-out-expo ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1">
            <h2 id="consent-heading" className="m-0 text-body-sm font-semibold text-calico-50">
              Cookies on UK Sofa Shop
            </h2>
            <p className="m-0 mt-1 text-caption leading-relaxed text-calico-300">
              Essential cookies keep your basket and checkout working. With your permission,
              analytics and advertising help us improve the shop and measure our ads.{' '}
              <Link href="/cookies" className="hover-link font-semibold text-ember-300">
                Learn more
              </Link>
            </p>
          </div>

          <div className="flex shrink-0 gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => answer('denied')}
              className={`${button} border-calico-50/30 text-calico-50`}
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => answer('granted')}
              className={`${button} border-ember-500 bg-ember-500 text-ink-900`}
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
