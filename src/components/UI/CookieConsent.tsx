'use client';
// src/components/UI/CookieConsent.tsx

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import {
  getConsent, grantConsent, revokeConsent,
  CONSENT_GRANTED_EVENT, CONSENT_REOPEN_EVENT,
} from '@/utils/consent';

/**
 * The cookie banner.
 *
 * Three things changed and all three matter.
 *
 * It sat at `bottom: 0` over the bottom navigation, so on a phone the way to
 * get to the cart was underneath the thing asking about cookies. It clears the
 * navigation now.
 *
 * "Accept All" was a filled ember button and "Essential Only" a grey outline —
 * which is a nudge, and under UK GDPR refusing has to be as easy as accepting.
 * The two are the same size, the same shape and the same weight; only the
 * colour differs, and it differs the least it can while still being legible.
 *
 * And the copy said we use cookies to "personalize our furniture
 * recommendations", which the site does not do. It says what actually happens.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
    // A frame's grace so the element exists at its start position before the
    // transition runs; without it the sheet appears already in place.
    requestAnimationFrame(() => setEntered(true));
  }, []);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) show();
    else if (consent === 'granted') window.dispatchEvent(new Event(CONSENT_GRANTED_EVENT));

    // The footer link and the /cookies page ask the banner to come back, so a
    // visitor can change an answer they have already given. UK GDPR wants
    // withdrawing consent to be as easy as giving it.
    window.addEventListener(CONSENT_REOPEN_EVENT, show);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, show);
  }, [show]);

  function answer(status: 'granted' | 'denied') {
    setEntered(false);
    setTimeout(() => {
      setOpen(false);
      if (status === 'granted') grantConsent();
      // Deletes any analytics cookies already written and reloads, because GA
      // and the Meta Pixel cannot be unloaded once they have run.
      else revokeConsent({ reload: getConsent() === 'granted' });
    }, 380);
  }

  if (!open) return null;

  const button =
    'hover-btn hover-btn-dark flex h-12 flex-1 items-center justify-center rounded-sm ' +
    'text-body-sm font-semibold transition-colors duration-swift ease-out-expo sm:flex-none sm:px-8';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
      className="fixed inset-x-0 z-consent px-4 pb-4 sm:px-6"
      // Above the bottom navigation, inset included. It used to sit on top of
      // it — so the one control a phone always needs was behind this.
      style={{ bottom: 'calc(var(--bottom-nav) + env(safe-area-inset-bottom))' }}
    >
      <div
        className={`mx-auto flex max-w-shell flex-col gap-5 rounded-lg border border-ink-700 bg-ink-900 p-5 shadow-e3 transition-[transform,opacity] duration-base ease-out-expo sm:flex-row sm:items-center sm:gap-6 ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="flex flex-1 items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink-700">
            <Cookie aria-hidden="true" className="h-5 w-5 text-ember-300" />
          </span>

          <div className="min-w-0">
            <h2 id="consent-heading" className="m-0 text-body font-semibold text-calico-50">
              Cookies on this site
            </h2>
            <p className="m-0 mt-1.5 text-body-sm leading-relaxed text-calico-300">
              Some are needed for the shop to work — your basket, your session. The rest measure
              how the site is used and how well our ads do. You choose whether we set those.{' '}
              <Link href="/cookies" className="hover-link font-semibold text-ember-300">
                What we set, and why
              </Link>.
            </p>
          </div>
        </div>

        {/* Equal weight, deliberately. Refusing has to be as easy as accepting,
            and a grey outline beside a filled button is not equally easy. */}
        <div className="flex shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => answer('denied')}
            className={`${button} border border-calico-50/30 text-calico-50`}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => answer('granted')}
            className={`${button} border border-ember-500 bg-ember-500 text-ink-900`}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
