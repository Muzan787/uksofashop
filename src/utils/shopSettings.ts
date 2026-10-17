// src/utils/shopSettings.ts
//
// The shop's figures (admin upgrade M1): what checkout charges for upstairs,
// assembly and old-sofa removal, the delivery dates, the ad-visitor offer
// and the sample limit. They live in one database row (public.shop_settings)
// that place_order and the other checkout functions read, and the shop reads
// the same row - through getShopSettings() on the server and
// useShopSettings() in the browser - so what a customer is shown is what
// the database charges. Checkout sends its own total and the database
// refuses one that doesn't match, so the two must never disagree.
//
// DEFAULT_SHOP_SETTINGS are the figures before the table existed. They are
// what every function here falls back to when the row can't be read, and
// what the database falls back to as well.

export type OfferTier = 'ELECTRIC' | 'ROMA' | 'STANDARD' | 'EXCLUDED'

/**
 * Admin -> Meta (admin upgrade N2). Live sends as the shop always has; Test
 * sends server events to Meta's Test events and Google's validator only;
 * Dry run builds and logs every server event and sends nothing. The browser
 * tags load only on Live. Whatever the mode, nothing is sent from a server
 * that isn't the production one.
 */
export type TrackingMode = 'dry_run' | 'test' | 'live'

export const TRACKING_MODES: TrackingMode[] = ['dry_run', 'test', 'live']

export interface ShopSettings {
  upstairsFirstFloor: number
  upstairsPerExtraFloor: number
  maxFloor: number
  assemblyFee: number
  removalPerSeat: number
  removalMinSeats: number
  removalDefaultSeats: number
  removalMaxSeats: number
  /** The delivery window, in delivery days (every day but Monday) from today. */
  deliveryWindowFromDays: number
  deliveryWindowToDays: number
  /** The same for the areas that pay a distance charge: Devon, Cornwall, the Aberdeen area, the north of Scotland. */
  farWindowFromDays: number
  farWindowToDays: number
  /** The days a customer can choose, counted from today. */
  preferredEarliestDays: number
  preferredLatestDays: number
  tierAmounts: Record<OfferTier, number>
  offerWindowHours: number
  offerEnabled: boolean
  sampleLimit: number
  orderflowEnabled: boolean
  trackingMode: TrackingMode
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  upstairsFirstFloor: 20,
  upstairsPerExtraFloor: 10,
  maxFloor: 20,
  assemblyFee: 20,
  removalPerSeat: 10,
  removalMinSeats: 1,
  removalDefaultSeats: 3,
  removalMaxSeats: 10,
  deliveryWindowFromDays: 2,
  deliveryWindowToDays: 4,
  farWindowFromDays: 5,
  farWindowToDays: 7,
  preferredEarliestDays: 4,
  preferredLatestDays: 180,
  tierAmounts: { ELECTRIC: 50, ROMA: 30, STANDARD: 20, EXCLUDED: 0 },
  offerWindowHours: 48,
  offerEnabled: true,
  sampleLimit: 5,
  orderflowEnabled: true,
  trackingMode: 'live',
}

export interface ShopSettingsRow {
  upstairs_first_floor: number | string | null
  upstairs_per_extra_floor: number | string | null
  max_floor: number | null
  assembly_fee: number | string | null
  removal_per_seat: number | string | null
  removal_min_seats: number | null
  removal_default_seats: number | null
  removal_max_seats: number | null
  delivery_window_from_days: number | null
  delivery_window_to_days: number | null
  far_window_from_days: number | null
  far_window_to_days: number | null
  preferred_earliest_days: number | null
  preferred_latest_days: number | null
  tier_electric: number | string | null
  tier_roma: number | string | null
  tier_standard: number | string | null
  tier_excluded: number | string | null
  offer_window_hours: number | null
  offer_enabled: boolean | null
  sample_limit: number | null
  orderflow_enabled: boolean | null
  tracking_mode: string | null
}

export const SHOP_SETTINGS_COLUMNS =
  'upstairs_first_floor, upstairs_per_extra_floor, max_floor, assembly_fee, removal_per_seat, removal_min_seats, removal_default_seats, removal_max_seats, delivery_window_from_days, delivery_window_to_days, far_window_from_days, far_window_to_days, preferred_earliest_days, preferred_latest_days, tier_electric, tier_roma, tier_standard, tier_excluded, offer_window_hours, offer_enabled, sample_limit, orderflow_enabled, tracking_mode'

/** A figure from the row, or the default when it is missing or not a number. */
function num(value: number | string | null | undefined, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

export function settingsFromRow(row: Partial<ShopSettingsRow> | null | undefined): ShopSettings {
  const d = DEFAULT_SHOP_SETTINGS
  if (!row) return d
  return {
    upstairsFirstFloor: num(row.upstairs_first_floor, d.upstairsFirstFloor),
    upstairsPerExtraFloor: num(row.upstairs_per_extra_floor, d.upstairsPerExtraFloor),
    maxFloor: num(row.max_floor, d.maxFloor),
    assemblyFee: num(row.assembly_fee, d.assemblyFee),
    removalPerSeat: num(row.removal_per_seat, d.removalPerSeat),
    removalMinSeats: num(row.removal_min_seats, d.removalMinSeats),
    removalDefaultSeats: num(row.removal_default_seats, d.removalDefaultSeats),
    removalMaxSeats: num(row.removal_max_seats, d.removalMaxSeats),
    deliveryWindowFromDays: num(row.delivery_window_from_days, d.deliveryWindowFromDays),
    deliveryWindowToDays: num(row.delivery_window_to_days, d.deliveryWindowToDays),
    farWindowFromDays: num(row.far_window_from_days, d.farWindowFromDays),
    farWindowToDays: num(row.far_window_to_days, d.farWindowToDays),
    preferredEarliestDays: num(row.preferred_earliest_days, d.preferredEarliestDays),
    preferredLatestDays: num(row.preferred_latest_days, d.preferredLatestDays),
    tierAmounts: {
      ELECTRIC: num(row.tier_electric, d.tierAmounts.ELECTRIC),
      ROMA: num(row.tier_roma, d.tierAmounts.ROMA),
      STANDARD: num(row.tier_standard, d.tierAmounts.STANDARD),
      EXCLUDED: num(row.tier_excluded, d.tierAmounts.EXCLUDED),
    },
    offerWindowHours: num(row.offer_window_hours, d.offerWindowHours),
    offerEnabled: row.offer_enabled ?? d.offerEnabled,
    sampleLimit: num(row.sample_limit, d.sampleLimit),
    orderflowEnabled: row.orderflow_enabled ?? d.orderflowEnabled,
    trackingMode: TRACKING_MODES.includes(row.tracking_mode as TrackingMode) ? row.tracking_mode as TrackingMode : d.trackingMode,
  }
}

const COUNT_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

/** "Five" for 5, for a heading that reads better in words; digits past ten. */
export function countWord(n: number): string {
  return COUNT_WORDS[n - 1] ?? String(n)
}

/** "£20", "£12.50": a figure as the shop writes it. */
export function gbpFigure(n: number): string {
  return `£${Number.isInteger(n) ? n : n.toFixed(2)}`
}
