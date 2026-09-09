// src/utils/postcode.ts
//
// Canonical postcode + delivery-zone policy for public checkout.
//
// Phase D deliberately separates two questions:
//   1. does this look like a UK postcode we can reason about?
//   2. does the normal FREE UK Mainland checkout apply?
//
// The browser may ask these helpers for presentation, but the public order
// server action runs the same resolver again before it is allowed to call the
// service-role-only place_order RPC. A browser-supplied boolean is never an
// authority input.

/** Uppercased, single space before the inward code. "bb67ls" → "BB6 7LS". */
export function normalisePostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/\s+/g, '')
  if (clean.length < 5) return clean
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`
}

/**
 * Recognised Royal Mail-style UK postcode formats used by this site.
 *
 * The explicit overseas formats are accepted syntactically so that we can
 * route them to CUSTOM_QUOTE instead of accidentally letting them fall through
 * as mainland. Republic of Ireland Eircodes do not match this format.
 */
const UK_POSTCODE =
  /^([A-Z]{1,2}\d[A-Z\d]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA)\s?\d[A-Z]{2}$/

export function isValidUkPostcode(raw: string): boolean {
  return UK_POSTCODE.test(normalisePostcode(raw))
}

/** "BB6 7LS" → "BB6". */
export function outwardCode(raw: string): string {
  return normalisePostcode(raw).split(' ')[0] ?? ''
}

export type DeliveryZone = 'MAINLAND_STANDARD' | 'CUSTOM_QUOTE'

export type DeliveryClassification =
  | {
      kind: 'invalid'
      postcode: string
      reason: 'invalid_format' | 'postcode_not_found'
    }
  | {
      kind: 'ambiguous'
      postcode: string
      reason: 'mixed_geography'
    }
  | {
      kind: 'classified'
      postcode: string
      zone: DeliveryZone
      reason:
        | 'mainland'
        | 'northern_ireland'
        | 'channel_islands'
        | 'isle_of_man'
        | 'scottish_island'
        | 'isle_of_wight'
        | 'isles_of_scilly'
        | 'special_or_overseas'
        | 'mixed_geography_island'
        | 'mixed_geography_mainland'
        | 'mixed_geography_unavailable'
    }

const SPECIAL_OR_OVERSEAS_AREAS = new Set([
  // British Forces / non-geographic business routing.
  'BF', 'BX', 'ZZ',
  // British Overseas Territories that use UK-style special postcodes.
  'ASCN', 'STHL', 'TDCU', 'BBND', 'BIQQ', 'FIQQ', 'SIQQ', 'PCRN', 'TKCA',
])

/** Isle of Raasay units in the otherwise mixed IV40 district. */
const RAASAY_POSTCODES = new Set([
  'IV40 8NG', 'IV40 8NS', 'IV40 8NT', 'IV40 8NU',
  'IV40 8NX', 'IV40 8NY', 'IV40 8NZ',
  'IV40 8PA', 'IV40 8PB', 'IV40 8PD', 'IV40 8PE', 'IV40 8PF', 'IV40 8PG',
])

/**
 * PA34 is genuinely mixed: Oban/Kilmelford are mainland, while the same
 * district also contains Lismore, Kerrera, Easdale, Luing and Seil. The terms
 * below are matched only against address data returned by the postcode lookup,
 * never against customer-entered free text.
 */
const PA34_ISLAND_TERMS = [
  'EASDALE',
  'KERRERA',
  'LISMORE',
  'LUING',
  'SEIL',
  'BALVICAR',
  'ELLENABEICH',
  'SOUTH CUAN',
  'CUAN FERRY',
  'CULLIPOOL',
  'TOBERONOCHY',
  'SHUNA',
  'PORT RAMSAY',
  'ACHNACROISH',
  'ACHINDUIN',
  'BALIGRUNDLE',
]

function postcodeArea(outward: string): string {
  return outward.match(/^[A-Z]+/)?.[0] ?? ''
}

function districtNumber(outward: string): number | null {
  const area = postcodeArea(outward)
  const match = outward.slice(area.length).match(/^\d{1,2}/)
  return match ? Number(match[0]) : null
}

function inRange(value: number | null, lo: number, hi: number): boolean {
  return value !== null && value >= lo && value <= hi
}

function trustedAddressShowsIsland(addresses: string[], outward: string): boolean {
  const evidence = addresses.join('\n').toUpperCase()
  if (outward === 'IV40') return evidence.includes('RAASAY')
  if (outward === 'PA34') return PA34_ISLAND_TERMS.some(term => evidence.includes(term))
  return false
}

/**
 * Synchronous part of the canonical delivery policy.
 *
 * trustedAddresses must come from the postcode service. Customer-entered
 * address text must never be passed here as evidence because that would turn a
 * browser-controlled string into delivery authority.
 */
export function classifyDeliveryPostcode(
  raw: string,
  trustedAddresses: string[] = [],
): DeliveryClassification {
  const postcode = normalisePostcode(raw)
  if (!isValidUkPostcode(postcode)) {
    return { kind: 'invalid', postcode, reason: 'invalid_format' }
  }

  const outward = outwardCode(postcode)
  const area = postcodeArea(outward)
  const district = districtNumber(outward)

  // Northern Ireland is UK, but not UK Mainland.
  if (area === 'BT') {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'northern_ireland' }
  }
  if (area === 'IM') {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'isle_of_man' }
  }
  if (area === 'JE' || area === 'GY') {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'channel_islands' }
  }

  // Never let special/non-geographic/overseas formats inherit mainland simply
  // because they resemble a UK postcode. GX11 1AA is Gibraltar.
  if (SPECIAL_OR_OVERSEAS_AREAS.has(area) || outward === 'GX11') {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'special_or_overseas' }
  }

  // England offshore islands that are outside the commercial "UK Mainland"
  // promise even though their postcode areas also contain mainland addresses.
  if (area === 'PO' && inRange(district, 30, 41)) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'isle_of_wight' }
  }
  if (area === 'TR' && inRange(district, 21, 25)) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'isles_of_scilly' }
  }

  // Scottish island-only areas/districts. Deliberately do NOT use courier
  // "Highlands" surcharge zones here: mainland Highlands are still mainland.
  if (area === 'HS' || area === 'ZE') {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'scottish_island' }
  }
  if (area === 'KA' && inRange(district, 27, 28)) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'scottish_island' }
  }
  if (area === 'KW' && inRange(district, 15, 17)) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'scottish_island' }
  }
  if (area === 'PH' && inRange(district, 42, 44)) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'scottish_island' }
  }
  if (area === 'PA' && (
    district === 20 ||
    inRange(district, 41, 49) ||
    inRange(district, 60, 78)
  )) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'scottish_island' }
  }
  if (area === 'IV' && (
    inRange(district, 41, 49) ||
    district === 51 ||
    inRange(district, 55, 56)
  )) {
    return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'scottish_island' }
  }

  // IV40 and PA34 cannot safely be classified by district. Each contains both
  // mainland and island addresses, so use exact known units and/or trusted
  // address evidence. With no evidence, deliberately fail toward review.
  if (outward === 'IV40') {
    if (RAASAY_POSTCODES.has(postcode) || trustedAddressShowsIsland(trustedAddresses, outward)) {
      return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'mixed_geography_island' }
    }
    if (trustedAddresses.length > 0) {
      return { kind: 'classified', postcode, zone: 'MAINLAND_STANDARD', reason: 'mixed_geography_mainland' }
    }
    return { kind: 'ambiguous', postcode, reason: 'mixed_geography' }
  }

  if (outward === 'PA34') {
    if (trustedAddressShowsIsland(trustedAddresses, outward)) {
      return { kind: 'classified', postcode, zone: 'CUSTOM_QUOTE', reason: 'mixed_geography_island' }
    }
    if (trustedAddresses.length > 0) {
      return { kind: 'classified', postcode, zone: 'MAINLAND_STANDARD', reason: 'mixed_geography_mainland' }
    }
    return { kind: 'ambiguous', postcode, reason: 'mixed_geography' }
  }

  return { kind: 'classified', postcode, zone: 'MAINLAND_STANDARD', reason: 'mainland' }
}

/**
 * Resolve a postcode all the way to a checkout decision.
 *
 * Only the two mixed Scottish districts need external evidence. If that lookup
 * is unavailable, we do not guess: the destination becomes CUSTOM_QUOTE. A
 * genuine "not found" from Homedata remains an invalid postcode.
 */
export async function resolveDeliveryPostcode(raw: string): Promise<DeliveryClassification> {
  const first = classifyDeliveryPostcode(raw)
  if (first.kind !== 'ambiguous') return first

  try {
    const addresses = await lookupAddresses(first.postcode)
    return classifyDeliveryPostcode(first.postcode, addresses)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/not found|no addresses found/i.test(message)) {
      return { kind: 'invalid', postcode: first.postcode, reason: 'postcode_not_found' }
    }
    return {
      kind: 'classified',
      postcode: first.postcode,
      zone: 'CUSTOM_QUOTE',
      reason: 'mixed_geography_unavailable',
    }
  }
}

/** Backward-compatible convenience for presentation code. Ambiguous = not safe to promise free mainland delivery. */
export function isMainland(raw: string, trustedAddresses: string[] = []): boolean {
  const result = classifyDeliveryPostcode(raw, trustedAddresses)
  return result.kind === 'classified' && result.zone === 'MAINLAND_STANDARD'
}

/**
 * Addresses at a postcode, from Homedata.
 *
 * Throws with a message written for a customer to read, because callers put it
 * straight on screen. Homedata has been seen to answer with the list under
 * `suggestions` and under `results`, and each entry with either `address` or
 * `full_address`.
 */
export async function lookupAddresses(postcode: string): Promise<string[]> {
  const apiKey = process.env.NEXT_PUBLIC_HOMEDATA_API_KEY
  if (!apiKey) throw new Error('Address lookup is unavailable. Please type your address.')

  const res = await fetch(
    `https://api.homedata.co.uk/api/address/find/?q=${encodeURIComponent(normalisePostcode(postcode))}`,
    { headers: { Authorization: `Api-Key ${apiKey}` } },
  )

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Address lookup is unavailable. Please type your address.')
    if (res.status === 404) throw new Error('Postcode not found.')
    throw new Error('Could not fetch addresses. Please enter manually.')
  }

  const data = await res.json()
  const list = data.suggestions || data.results || []
  if (!list.length) throw new Error('No addresses found for this postcode.')

  return list
    .map((item: { address?: string; full_address?: string }) => item.address || item.full_address)
    .filter(Boolean) as string[]
}
