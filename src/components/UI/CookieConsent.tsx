'use client'
// src/components/UI/CookieConsent.tsx

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getConsent, grantConsent, revokeConsent,
  CONSENT_GRANTED_EVENT, CONSENT_REOPEN_EVENT,
} from '@/utils/consent'
import { useDialog } from './useDialog'

/**
 * The cookie question, asked as a modal.
 *
 * It was a non-modal sheet that could be scrolled past, and most people did:
 * of the visitors arriving from Meta ads, 55% never answered it at all - not
 * refused, just never touched - and the Pixel can only see the ones who say
 * yes. A modal asks the question once and gets an answer either way.
 *
 * What keeps it on the right side of PECR and the ICO's guidance is that
 * refusing is exactly as easy as accepting: two buttons of the same size and
 * weight, side by side, one tap each, and Escape counts as "Essential only".
 * There is no cookie wall - the site is fully usable after either answer -
 * and no pre-ticked anything. The backdrop does not dismiss it, because a tap
 * outside is not an answer.
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

  return <ConsentDialog entered={entered} onAnswer={answer} />
}

/**
 * Rendered only while the question is open, because useDialog locks the page
 * and traps focus for as long as it is mounted.
 */
function ConsentDialog({
  entered, onAnswer,
}: {
  entered: boolean
  onAnswer: (status: 'granted' | 'denied') => void
}) {
  // Escape is a refusal, not a dismissal: leaving the question unanswered
  // would just ask it again on the next page, and a keyboard user must be
  // able to get out with one key the way a thumb gets out with one tap.
  const panel = useDialog<HTMLDivElement>(() => onAnswer('denied'))

  const button =
    'hover-btn flex min-h-12 flex-1 items-center justify-center rounded-sm border px-4 ' +
    'text-caption font-bold transition-colors duration-swift ease-out-expo sm:flex-none sm:min-w-[150px]'

  return (
    <div className="fixed inset-0 z-consent">
      {/* The dim. Not a button: tapping it answers nothing, so it does nothing. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-ink-900/55 transition-opacity duration-base ease-out-expo ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-heading"
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-[760px] rounded-t-lg border border-ink-700 bg-ink-900 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 shadow-e3 outline-none transition-[transform,opacity] duration-base ease-out-expo sm:bottom-5 sm:rounded-md sm:px-5 sm:py-4 ${
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
              onClick={() => onAnswer('denied')}
              className={`${button} border-calico-50/30 text-calico-50`}
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => onAnswer('granted')}
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
