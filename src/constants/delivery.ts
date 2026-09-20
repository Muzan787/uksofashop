// src/constants/delivery.ts
//
// The delivery pricing model, in one place.
//
// IMPORTANT: these figures are duplicated inside the place_order database
// function, which recomputes every fee server-side so the browser cannot set
// its own prices. If you change a price here you MUST change it there too -
// see the latest supabase/migrations/*place_order* definition (currently
// 20260916120000_sofa_removal_per_seat.sql). place_order raises an
// exception when the client's expected delivery total disagrees with its own
// calculation, so a drift between the two fails loudly at checkout rather than
// quietly charging the wrong amount.

/** Base delivery to a UK Mainland ground floor. Free, with no order threshold. */
export const DELIVERY_BASE = 0

/** First floor, or any floor when there's a lift. */
export const UPSTAIRS_FIRST_FLOOR = 20

/** Each floor above the first, when there is no lift. */
export const UPSTAIRS_PER_EXTRA_FLOOR = 10

/** Assembling the sofa in the room. */
export const ASSEMBLY_FEE = 20

/**
 * Taking the old sofa away, priced per seat so a corner sofa pays more than a
 * two-seater. The customer counts every seat we are taking, so a 3-seater and
 * a 2-seater going together is 5. Unusual items are still confirmed before
 * delivery, and the customer is told this on the checkout.
 */
export const SOFA_REMOVAL_PER_SEAT = 10
export const SOFA_REMOVAL_MIN_SEATS = 1
export const SOFA_REMOVAL_MAX_SEATS = 10
/** What the seat stepper opens on: a 3-seater is the most common old sofa. */
export const SOFA_REMOVAL_DEFAULT_SEATS = 3

export interface DeliveryOptions {
  /** 0 = ground floor. 1 = first floor, 2 = second, and so on. */
  floor: number
  /** A lift makes the floor number irrelevant - it's the first-floor rate. */
  hasLift: boolean
  assembly: boolean
  sofaRemoval: boolean
  /** Seats being taken away. Only charged when sofaRemoval is on. */
  sofaRemovalSeats: number
}

export const NO_EXTRAS: DeliveryOptions = {
  floor: 0,
  hasLift: false,
  assembly: false,
  sofaRemoval: false,
  sofaRemovalSeats: SOFA_REMOVAL_DEFAULT_SEATS,
}

/** Seat count held to the range the checkout and place_order both accept. */
export function clampRemovalSeats(seats: number): number {
  if (!Number.isFinite(seats)) return SOFA_REMOVAL_DEFAULT_SEATS
  return Math.min(SOFA_REMOVAL_MAX_SEATS, Math.max(SOFA_REMOVAL_MIN_SEATS, Math.floor(seats)))
}

/** Removal charge for a given number of seats. */
export function sofaRemovalFee(seats: number): number {
  return clampRemovalSeats(seats) * SOFA_REMOVAL_PER_SEAT
}

/** Carrying charge for the chosen floor. Ground floor is free. */
export function upstairsFee(floor: number, hasLift: boolean): number {
  if (!Number.isFinite(floor) || floor <= 0) return 0
  if (hasLift) return UPSTAIRS_FIRST_FLOOR
  return UPSTAIRS_FIRST_FLOOR + (Math.floor(floor) - 1) * UPSTAIRS_PER_EXTRA_FLOOR
}

export interface DeliveryBreakdownLine {
  /** 'agreed' is the one negotiated figure on a WhatsApp order, in place of the extras. */
  key: 'upstairs' | 'assembly' | 'sofaRemoval' | 'agreed'
  label: string
  detail?: string
  amount: number
}

export interface DeliveryBreakdown {
  lines: DeliveryBreakdownLine[]
  total: number
}

/** Every chargeable extra, ready to render as its own line. */
export function deliveryBreakdown(opts: DeliveryOptions): DeliveryBreakdown {
  const lines: DeliveryBreakdownLine[] = []

  const upstairs = upstairsFee(opts.floor, opts.hasLift)
  if (upstairs > 0) {
    lines.push({
      key: 'upstairs',
      label: 'Upstairs delivery',
      detail: opts.hasLift
        ? `Floor ${opts.floor}, lift available`
        : floorName(opts.floor),
      amount: upstairs,
    })
  }

  if (opts.assembly) {
    lines.push({ key: 'assembly', label: 'Assembly', amount: ASSEMBLY_FEE })
  }

  if (opts.sofaRemoval) {
    const seats = clampRemovalSeats(opts.sofaRemovalSeats)
    lines.push({
      key: 'sofaRemoval',
      label: 'Old sofa removal',
      detail: `${seats} ${seats === 1 ? 'seat' : 'seats'} at £${SOFA_REMOVAL_PER_SEAT} each`,
      amount: sofaRemovalFee(seats),
    })
  }

  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0) }
}

/** Total of the chargeable extras. Base delivery is always free. */
export function deliveryTotal(opts: DeliveryOptions): number {
  return deliveryBreakdown(opts).total
}

export function floorName(floor: number): string {
  if (floor <= 0) return 'Ground floor'
  if (floor === 1) return '1st floor'
  if (floor === 2) return '2nd floor'
  if (floor === 3) return '3rd floor'
  return `${floor}th floor`
}

/**
 * Where the standard checkout applies. Non-mainland addresses are not refused:
 * they move to a custom quote so the team can confirm both availability and the
 * delivery charge before taking the order.
 */
export const DELIVERY_AREA_NOTE =
  'FREE delivery applies to UK Mainland. Northern Ireland, the Isle of Man, Channel Islands, Scottish islands, Isle of Wight, Isles of Scilly and other non-mainland destinations need a custom delivery quote first.'
