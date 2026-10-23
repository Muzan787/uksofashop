// src/utils/shopSettingsForm.ts
//
// The rules behind Admin -> Settings (admin upgrade M1-M3), kept apart from the
// page so they can be tested: which figures there are, what each may be, the
// checks that span two figures (a window can't end before it starts; the
// offer tiers stay in order), and one plain sentence for every code the
// database answers with. The database holds the same rules (save_shop_settings
// and the table's checks), so a form that slipped past these is still refused.

import type { ShopSettings } from './shopSettings'

export type FigureKey =
  | 'upstairs_first_floor' | 'upstairs_per_extra_floor' | 'max_floor' | 'assembly_fee'
  | 'removal_base_fee' | 'removal_included_seats'
  | 'removal_per_seat' | 'removal_min_seats' | 'removal_default_seats' | 'removal_max_seats'
  | 'delivery_window_from_days' | 'delivery_window_to_days'
  | 'far_window_from_days' | 'far_window_to_days'
  | 'preferred_earliest_days' | 'preferred_latest_days'
  | 'tier_electric' | 'tier_roma' | 'tier_standard' | 'tier_excluded'
  | 'offer_min_price' | 'offer_window_hours' | 'sample_limit'

export interface FigureField {
  key: FigureKey
  label: string
  /** 'money' takes pounds and pence; 'whole' a whole number. */
  kind: 'money' | 'whole'
  min: number
  max: number
  /** What the number counts, after it: "days", "seats". */
  unit?: string
  hint?: string
}

export interface FigureGroup {
  id: 'extras' | 'dates' | 'offer' | 'samples'
  title: string
  intro: string
  fields: FigureField[]
}

export const FIGURE_GROUPS: FigureGroup[] = [
  {
    id: 'extras',
    title: 'Delivery extras',
    intro: 'What checkout adds for each extra. Delivery itself stays free, apart from the distance fees below.',
    fields: [
      { key: 'upstairs_first_floor', label: 'Upstairs: first floor, or any floor with a lift', kind: 'money', min: 0, max: 1000 },
      { key: 'upstairs_per_extra_floor', label: 'Each extra floor without a lift', kind: 'money', min: 0, max: 1000 },
      { key: 'max_floor', label: 'Highest floor a customer can choose', kind: 'whole', min: 1, max: 50, unit: 'floor' },
      { key: 'assembly_fee', label: 'Assembly in the room', kind: 'money', min: 0, max: 1000 },
      { key: 'removal_base_fee', label: 'Old sofa removal, up to the seats below', kind: 'money', min: 0, max: 1000, hint: 'One fee covers everything up to that many seats. Seats above it add the per-seat rate.' },
      { key: 'removal_included_seats', label: 'Removal: seats that fee covers', kind: 'whole', min: 1, max: 30, unit: 'seats' },
      { key: 'removal_per_seat', label: 'Removal: each seat above that', kind: 'money', min: 0, max: 1000 },
      { key: 'removal_min_seats', label: 'Removal: fewest seats', kind: 'whole', min: 1, max: 30, unit: 'seats' },
      { key: 'removal_default_seats', label: 'Removal: seats chosen to start with', kind: 'whole', min: 1, max: 30, unit: 'seats' },
      { key: 'removal_max_seats', label: 'Removal: most seats', kind: 'whole', min: 1, max: 30, unit: 'seats' },
    ],
  },
  {
    id: 'dates',
    title: 'Delivery dates',
    intro: 'The windows the shop quotes, and the days a customer may ask for at checkout. Days are counted without Mondays, when there is no delivery.',
    fields: [
      { key: 'delivery_window_from_days', label: 'Delivery window starts', kind: 'whole', min: 0, max: 60, unit: 'delivery days', hint: 'The dates shown for most of the UK, on the product page and at checkout.' },
      { key: 'delivery_window_to_days', label: 'Delivery window ends', kind: 'whole', min: 0, max: 60, unit: 'delivery days' },
      { key: 'far_window_from_days', label: 'Charged areas: window starts', kind: 'whole', min: 0, max: 60, unit: 'delivery days', hint: 'Devon, Cornwall, the Aberdeen area and the north of Scotland - the postcodes that pay a distance charge.' },
      { key: 'far_window_to_days', label: 'Charged areas: window ends', kind: 'whole', min: 0, max: 60, unit: 'delivery days', hint: 'Also the earliest day a customer there can choose.' },
      { key: 'preferred_earliest_days', label: 'Earliest day a customer can choose', kind: 'whole', min: 0, max: 365, unit: 'days from today' },
      { key: 'preferred_latest_days', label: 'Latest day a customer can choose', kind: 'whole', min: 1, max: 365, unit: 'days from today' },
    ],
  },
  {
    id: 'offer',
    title: 'The visitor offer',
    intro: 'What each tier takes off a sofa inside a visitor’s window, and how long a window lasts.',
    fields: [
      { key: 'tier_electric', label: 'Electric', kind: 'money', min: 0, max: 1000 },
      { key: 'tier_roma', label: 'Roma', kind: 'money', min: 0, max: 1000 },
      { key: 'tier_standard', label: 'Standard', kind: 'money', min: 0, max: 1000 },
      { key: 'tier_excluded', label: 'Excluded', kind: 'money', min: 0, max: 1000 },
      { key: 'offer_min_price', label: 'Cheapest sofa the offer applies to', kind: 'money', min: 0, max: 9999, hint: 'Nothing under this gets money off, whatever tier it is in. A basket of nothing but cheaper sofas gets no discount at all.' },
      { key: 'offer_window_hours', label: 'How long a window lasts', kind: 'whole', min: 1, max: 720, unit: 'hours', hint: 'For windows given from now on. A window already given keeps its own deadline; it never moves.' },
    ],
  },
  {
    id: 'samples',
    title: 'Fabric samples',
    intro: 'How many samples one request can ask for.',
    fields: [
      { key: 'sample_limit', label: 'Samples per request', kind: 'whole', min: 1, max: 20, unit: 'samples' },
    ],
  },
]

export const FIGURE_FIELDS: FigureField[] = FIGURE_GROUPS.flatMap(g => g.fields)

/** The tier each offer field prices, for the product counts beside them. */
export const TIER_OF_FIELD: Partial<Record<FigureKey, keyof ShopSettings['tierAmounts']>> = {
  tier_electric: 'ELECTRIC',
  tier_roma: 'ROMA',
  tier_standard: 'STANDARD',
  tier_excluded: 'EXCLUDED',
}

/** The form's starting values: today's figures as the boxes show them. */
export function figuresFromSettings(s: ShopSettings): Record<FigureKey, string> {
  const n = (v: number) => String(v)
  return {
    upstairs_first_floor: n(s.upstairsFirstFloor),
    upstairs_per_extra_floor: n(s.upstairsPerExtraFloor),
    max_floor: n(s.maxFloor),
    assembly_fee: n(s.assemblyFee),
    removal_base_fee: n(s.removalBaseFee),
    removal_included_seats: n(s.removalIncludedSeats),
    removal_per_seat: n(s.removalPerSeat),
    removal_min_seats: n(s.removalMinSeats),
    removal_default_seats: n(s.removalDefaultSeats),
    removal_max_seats: n(s.removalMaxSeats),
    delivery_window_from_days: n(s.deliveryWindowFromDays),
    delivery_window_to_days: n(s.deliveryWindowToDays),
    far_window_from_days: n(s.farWindowFromDays),
    far_window_to_days: n(s.farWindowToDays),
    preferred_earliest_days: n(s.preferredEarliestDays),
    preferred_latest_days: n(s.preferredLatestDays),
    tier_electric: n(s.tierAmounts.ELECTRIC),
    tier_roma: n(s.tierAmounts.ROMA),
    tier_standard: n(s.tierAmounts.STANDARD),
    tier_excluded: n(s.tierAmounts.EXCLUDED),
    offer_min_price: n(s.offerMinPrice),
    offer_window_hours: n(s.offerWindowHours),
    sample_limit: n(s.sampleLimit),
  }
}

export type FiguresCheck =
  | { ok: true; figures: Record<FigureKey, number> }
  | { ok: false; field: FigureKey | 'form'; text: string }

const MONEY = /^\d{1,4}(\.\d{1,2})?$/
const WHOLE = /^\d{1,4}$/

/**
 * Every figure as a number, or the first thing wrong with the form as one
 * sentence and the box it belongs to.
 */
export function checkFigures(raw: Partial<Record<string, unknown>>): FiguresCheck {
  const figures = {} as Record<FigureKey, number>
  for (const f of FIGURE_FIELDS) {
    const value = typeof raw[f.key] === 'string' ? (raw[f.key] as string).trim().replace(/^£/, '') : ''
    if (value === '') return { ok: false, field: f.key, text: `${f.label}: fill this in.` }
    if (f.kind === 'money' && !MONEY.test(value)) return { ok: false, field: f.key, text: `${f.label}: a figure in pounds, like 20 or 12.50.` }
    if (f.kind === 'whole' && !WHOLE.test(value)) return { ok: false, field: f.key, text: `${f.label}: a whole number.` }
    const n = Number(value)
    if (n < f.min || n > f.max) return { ok: false, field: f.key, text: `${f.label}: between ${f.min} and ${f.max}.` }
    figures[f.key] = n
  }
  if (figures.delivery_window_to_days < figures.delivery_window_from_days) {
    return { ok: false, field: 'delivery_window_to_days', text: SETTINGS_REFUSALS.WINDOW_ORDER }
  }
  if (figures.far_window_to_days < figures.far_window_from_days) {
    return { ok: false, field: 'far_window_to_days', text: SETTINGS_REFUSALS.WINDOW_ORDER }
  }
  if (figures.preferred_latest_days <= figures.preferred_earliest_days) {
    return { ok: false, field: 'preferred_latest_days', text: SETTINGS_REFUSALS.DATES_ORDER }
  }
  if (!(figures.tier_electric >= figures.tier_roma && figures.tier_roma >= figures.tier_standard && figures.tier_standard >= figures.tier_excluded)) {
    return { ok: false, field: 'tier_roma', text: SETTINGS_REFUSALS.TIERS_ORDER }
  }
  if (!(figures.removal_min_seats <= figures.removal_default_seats && figures.removal_default_seats <= figures.removal_max_seats)) {
    return { ok: false, field: 'removal_default_seats', text: SETTINGS_REFUSALS.SEATS_ORDER }
  }
  if (!(figures.removal_included_seats >= figures.removal_min_seats && figures.removal_included_seats <= figures.removal_max_seats)) {
    return { ok: false, field: 'removal_included_seats', text: SETTINGS_REFUSALS.BAND_SEATS }
  }
  return { ok: true, figures }
}

/** One sentence for each code save_shop_settings and the OrderFlow functions answer with. */
export const SETTINGS_REFUSALS = {
  BAD_NUMBER: 'One of the figures isn’t a number of pounds.',
  BAD_WHOLE_NUMBER: 'One of the figures needs to be a whole number.',
  WINDOW_ORDER: 'The delivery window can’t end before it starts.',
  DATES_ORDER: 'The latest day a customer can choose has to come after the earliest.',
  TIERS_ORDER: 'The tiers have to stay in order: Electric at least as much as Roma, Roma at least as much as Standard, Standard at least as much as Excluded.',
  SEATS_ORDER: 'Removal seats have to go fewest ≤ to start with ≤ most.',
  BAND_SEATS: 'The seats the removal fee covers have to be between the fewest and the most a customer can pick.',
  OUT_OF_RANGE: 'One of the figures is outside what the shop allows.',
  ORDERFLOW_NOT_CONNECTED: 'OrderFlow isn’t connected: its address and key aren’t in Supabase Vault, so it can’t be switched on.',
  ORDERFLOW_SWITCHED_OFF: 'Sending to OrderFlow is switched off. Switch it on first.',
  NO_TEST_ORDER: 'There’s no order marked as a test to send. Mark one as a test on its order page first.',
  NOT_AUTHORISED: 'You are not signed in as an admin any more. Sign in again.',
} as const

/** The sentence for a database error, or a general one. */
export function settingsRefusal(message: string | null | undefined): string {
  const text = message ?? ''
  for (const [code, sentence] of Object.entries(SETTINGS_REFUSALS)) {
    if (text.includes(code)) return sentence
  }
  if (/not.authori[sz]ed|NOT_ADMIN|permission denied/i.test(text)) return SETTINGS_REFUSALS.NOT_AUTHORISED
  return 'That didn’t save. Try again in a minute.'
}

// ── Offer codes (M3) ─────────────────────────────────────────────────────────

/** "sofa extra" -> "SOFAEXTRA". Orders and the database compare codes in capitals. */
export function normaliseOfferCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

export function offerCodeProblem(code: string): string | null {
  if (code.length < 4 || code.length > 24) return 'A code is 4 to 24 letters and numbers.'
  if (!/^[A-Z0-9]+$/.test(code)) return 'Letters and numbers only: no spaces, dashes or symbols.'
  return null
}
