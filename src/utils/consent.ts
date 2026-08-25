// src/utils/consent.ts
//
// One place that owns the cookie choice, so the banner, the tracking scripts
// and the /cookies page can never disagree about it.
//
// The important part is withdrawal. Setting the flag back to 'denied' is not
// enough on its own: by then Google Analytics and the Meta Pixel have already
// run and written their cookies, and unmounting the React components doesn't
// remove them. A withdrawal that leaves the cookies in place isn't a withdrawal,
// so revokeConsent() deletes them and reloads the page.

export type ConsentValue = 'granted' | 'denied'

export const CONSENT_KEY = 'cookie_consent'

/** Fired when consent is granted, so TrackingScripts can mount. */
export const CONSENT_GRANTED_EVENT = 'cookies_accepted'
/** Fired when the choice changes at all, so any listener can re-read it. */
export const CONSENT_CHANGED_EVENT = 'cookie_consent_changed'
/** Asks the banner to reappear - used by the footer link and the /cookies page. */
export const CONSENT_REOPEN_EVENT = 'cookie_preferences_open'

/** Cookie name prefixes written by the tools we load once consent is given. */
const TRACKING_COOKIE_PREFIXES = [
  '_ga',   // Google Analytics: _ga and _ga_<MEASUREMENT_ID>
  '_gid',  // Google Analytics
  '_gat',  // Google Analytics throttling
  '_fbp',  // Meta Pixel browser id
  '_fbc',  // Meta Pixel click id
]

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(CONSENT_KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

/**
 * Removes the analytics and advertising cookies already on the device.
 *
 * They're set on the registrable domain rather than the exact host, so each
 * name has to be expired against every domain variant it might have been
 * written to - otherwise the delete silently does nothing.
 */
export function clearTrackingCookies() {
  if (typeof document === 'undefined') return

  const host = window.location.hostname
  const parts = host.split('.')
  const domains: (string | null)[] = [null, host, `.${host}`]
  for (let i = 1; i < parts.length - 1; i++) {
    const d = parts.slice(i).join('.')
    domains.push(d, `.${d}`)
  }

  const names = document.cookie
    .split(';')
    .map(c => c.split('=')[0].trim())
    .filter(name => TRACKING_COOKIE_PREFIXES.some(p => name === p || name.startsWith(`${p}_`) || name.startsWith(p)))

  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
        (domain ? `; domain=${domain}` : '')
    }
  }
}

export function grantConsent() {
  window.localStorage.setItem(CONSENT_KEY, 'granted')
  window.dispatchEvent(new Event(CONSENT_GRANTED_EVENT))
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT))
}

/**
 * Withdraw consent. Reloads by default because Google Analytics and the Meta
 * Pixel cannot be unloaded once they have run - a fresh page without them is
 * the only honest way to stop them.
 */
export function revokeConsent({ reload = true } = {}) {
  window.localStorage.setItem(CONSENT_KEY, 'denied')
  clearTrackingCookies()
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT))
  if (reload) window.location.reload()
}

/** Clears the stored answer so the banner asks again. */
export function resetConsent() {
  window.localStorage.removeItem(CONSENT_KEY)
  clearTrackingCookies()
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT))
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))
}
