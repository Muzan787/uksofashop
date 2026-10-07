'use client'
// src/components/UI/CookieConsent.tsx

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  getConsent, grantConsent, revokeConsent,
  CONSENT_CHANGED_EVENT, CONSENT_GRANTED_EVENT, CONSENT_REOPEN_EVENT,
} from '@/utils/consent'
import { useDialog } from './useDialog'

/**
 * The stored answer, as an external store. consent.ts already fires
 * CONSENT_CHANGED_EVENT whenever the value moves, so it subscribes cleanly
 * and the first client render knows the answer rather than discovering it one
 * render later.
 */
function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
}

/**
 * The server, and the hydrating client, cannot read localStorage - and
 * "cannot tell yet" is not the same answer as "never asked". Returning null
 * here would make the banner render during hydration for every visitor who
 * has already answered, and then vanish: a flash of a modal on every page
 * load. UNKNOWN keeps it closed until the real value is readable.
 */
const UNKNOWN = 'unknown'
const unknownConsent = () => UNKNOWN

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
  // The stored answer: 'granted', 'denied', null for never asked, or UNKNOWN
  // while the value is not yet readable. Read from the store rather than
  // assigned inside an effect, which is what made the first-time render
  // cascade.
  const stored = useSyncExternalStore(subscribeConsent, getConsent, unknownConsent)

  const [reopened, setReopened] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [entered, setEntered] = useState(false)

  // Asked only when we know nobody has answered, or when the footer link
  // asks for it back. UNKNOWN deliberately does not open it.
  const open = (reopened || stored === null) && !dismissed

  // Already granted when the page loaded: tell TrackingScripts and
  // AttributionBoot they may run. On arrival only - grantConsent() dispatches
  // this itself when the answer is given here, and keying the effect to the
  // stored value instead would fire it a second time and re-run the
  // attribution capture behind it.
  useEffect(() => {
    if (getConsent() === 'granted') window.dispatchEvent(new Event(CONSENT_GRANTED_EVENT))
  }, [])

  // The footer link and the /cookies page ask for it back.
  useEffect(() => {
    const onReopen = () => { setDismissed(false); setReopened(true) }
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen)
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen)
  }, [])

  // The entrance transition, one frame after the dialog is in the DOM.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  function answer(status: 'granted' | 'denied') {
    setEntered(false)
    setTimeout(() => {
      setDismissed(true)
      setReopened(false)
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
