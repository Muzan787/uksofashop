// src/constants/delivery.ts
//
// The delivery pricing model, in one place.
//
// IMPORTANT: these figures are duplicated inside the place_order database
// function, which recomputes every fee server-side so the browser cannot set
// its own prices. If you change a price here you MUST change it there too -
// see supabase/migrations/*_delivery_extras.sql. place_order raises an
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
 * Taking the old sofa away. Indicative: very large items may cost more, and the
 * team confirms before delivery, so the customer is told this on the checkout.
 */
export const SOFA_REMOVAL_FEE = 30

export interface DeliveryOptions {
  /** 0 = ground floor. 1 = first floor, 2 = second, and so on. */
  floor: number
  /** A lift makes the floor number irrelevant - it's the first-floor rate. */
  hasLift: boolean
  assembly: boolean
  sofaRemoval: boolean
}

export const NO_EXTRAS: DeliveryOptions = {
  floor: 0,
  hasLift: false,
  assembly: false,
  sofaRemoval: false,
}

/** Carrying charge for the chosen floor. Ground floor is free. */
export function upstairsFee(floor: number, hasLift: boolean): number {
  if (!Number.isFinite(floor) || floor <= 0) return 0
  if (hasLift) return UPSTAIRS_FIRST_FLOOR
  return UPSTAIRS_FIRST_FLOOR + (Math.floor(floor) - 1) * UPSTAIRS_PER_EXTRA_FLOOR
}

export interface DeliveryBreakdownLine {
  key: 'upstairs' | 'assembly' | 'sofaRemoval'
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
    lines.push({
      key: 'sofaRemoval',
      label: 'Old sofa removal',
      detail: 'Estimate - we confirm before delivery',
      amount: SOFA_REMOVAL_FEE,
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
