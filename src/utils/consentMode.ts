// src/utils/consentMode.ts
//
// Google Consent Mode v2.
//
// The default state has to be in the document HEAD, ahead of gtag.js and ahead
// of any event. A consent default that arrives after the first tag has fired
// is too late for that tag, and the visitor is measured under whatever state
// Google assumed in the meantime.
//
// That is why this ships as a plain inline <script> in the root layout rather
// than through next/script: `beforeInteractive` is only honoured in the root
// layout and warns elsewhere, and nothing about this snippet needs React.

import type { ConsentValue } from '@/utils/consent'

export const GA_ID = 'G-GTBKG6RSNF'
export const META_PIXEL_ID = '1613016580155004'

/**
 * Dispatched by the Pixel snippet itself, immediately after fbq('init').
 *
 * The snippet is only rendered once consent is granted, which means it is
 * injected a re-render AFTER the page has already mounted - measurably late:
 * fbevents.js starts loading around three seconds in, well past the load
 * event. Anything the page tried to report in the meantime found no fbq and
 * was dropped. utils/tracking.ts holds those events and listens for this to
 * know when they can be sent. See the queue there for why it is bounded.
 *
 * Emitted from inside the snippet rather than from a next/script onLoad
 * because the snippet is where fbq actually becomes callable; onLoad has
 * different semantics for inline scripts and would be a guess about timing
 * rather than a statement of it.
 */
export const META_PIXEL_READY_EVENT = 'meta_pixel_ready'

/**
 * Denied by default, for everything that stores or uses an identifier.
 *
 * In this state gtag writes no cookies and stores nothing, but still sends
 * anonymous cookieless pings. Those pings are what Google's conversion
 * modelling is built from - blocking the script outright, which is what this
 * site did before, means a visitor who declines contributes nothing at all and
 * their conversion can never be attributed even in aggregate.
 *
 * ad_user_data and ad_personalization are the two signals Consent Mode v2
 * added. Without them Google Ads treats UK and EEA traffic as fully
 * non-consented regardless of what the other flags say.
 *
 * wait_for_update gives the banner a moment to answer on a repeat visit before
 * Google settles the state, so a returning visitor who already accepted is not
 * briefly measured as denied.
 *
 * url_passthrough keeps the gclid on internal navigations when cookies are not
 * available, and ads_data_redaction strips ad identifiers while denied.
 */
export const CONSENT_DEFAULT_SNIPPET = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update:500
});
gtag('set','url_passthrough',true);
gtag('set','ads_data_redaction',true);
`.trim()

/** Pushes a stored answer into gtag. Safe to call more than once. */
export function applyGoogleConsent(value: ConsentValue): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag !== 'function') return

  const state = value === 'granted' ? 'granted' : 'denied'
  w.gtag('consent', 'update', {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  })

  // Once consent is given the click id no longer needs carrying in the URL and
  // ad data no longer needs redacting.
  if (value === 'granted') {
    w.gtag('set', 'ads_data_redaction', false)
    w.gtag('set', 'url_passthrough', false)
  }
}
