import type { PaidOfferSource } from './constants'

const GOOGLE_SOURCE = 'google'
const GOOGLE_MEDIUM = 'cpc'
const META_SOURCES = new Set(['facebook', 'instagram', 'meta'])
const META_MEDIUM = 'paid_social'

function clean(value: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function hasNonEmpty(params: URLSearchParams, key: string): boolean {
  return (params.get(key) ?? '').trim().length > 0
}

/**
 * Classifies only explicit paid evidence carried by the landing URL.
 *
 * Referrer hosts, fbclid by itself, _fbp and _fbc are deliberately not proof.
 * This is shared by the client boot only to decide whether a qualification
 * request is worth making; the server runs the same function again and is the
 * only side that can issue financial authority.
 */
export function classifyPaidLanding(landingPath: string): PaidOfferSource | null {
  let url: URL
  try {
    url = new URL(landingPath, 'https://uksofashop.invalid')
  } catch {
    return null
  }

  const params = url.searchParams

  if (
    hasNonEmpty(params, 'gclid') ||
    hasNonEmpty(params, 'gbraid') ||
    hasNonEmpty(params, 'wbraid')
  ) {
    return 'google_ads'
  }

  const source = clean(params.get('utm_source'))
  const medium = clean(params.get('utm_medium'))

  if (source === GOOGLE_SOURCE && medium === GOOGLE_MEDIUM) {
    return 'google_ads'
  }

  if (META_SOURCES.has(source) && medium === META_MEDIUM) {
    return 'meta_ads'
  }

  return null
}
