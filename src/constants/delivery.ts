// src/constants/delivery.ts
//
// The delivery pricing model, in one place.
//
// The figures themselves live in one database row, public.shop_settings,
// changed in Admin -> Settings (admin upgrade M1). The place_order database
// function reads that row and recomputes every fee server-side, so the
// browser cannot set its own prices; the functions here take the same row
// (getShopSettings / useShopSettings) so the checkout shows what will be
// charged. place_order raises an exception when the client's expected total
// disagrees with its own, so a drift fails loudly at checkout rather than
// quietly charging the wrong amount. Change a figure in the admin, never here.

import { DEFAULT_SHOP_SETTINGS, gbpFigure, type ShopSettings } from '@/utils/shopSettings'

/**
 * Charged when a confirmed delivery slot is missed and the journey has to be
 * made again. Not computed by place_order, because it is never part of the
 * order total - it is billed afterwards, if it happens at all.
 *
 * It lives here because three surfaces quote it (the terms, the charges table
 * on /delivery-returns, and the checkout) and it was written out by hand in
 * each of them. Under reg 40 of the Consumer Contracts Regulations an
 * additional charge needs the customer's express agreement BEFORE they are
 * bound, which is why the checkout now states it rather than only the
 * confirmation screen.
 */
export const RE_DELIVERY_FEE = 50

/**
 * The figures below are today's defaults. What checkout actually charges comes
 * from Admin -> Settings (public.shop_settings, admin upgrade M1): every
 * function here takes those settings, and falls back to these when it isn't
 * given them. place_order reads the same row, so the two always agree.
 */

/** First floor, or any floor when there's a lift. */
export const UPSTAIRS_FIRST_FLOOR = DEFAULT_SHOP_SETTINGS.upstairsFirstFloor

/** Each floor above the first, when there is no lift. */
export const UPSTAIRS_PER_EXTRA_FLOOR = DEFAULT_SHOP_SETTINGS.upstairsPerExtraFloor

/** Assembling the sofa in the room. */
export const ASSEMBLY_FEE = DEFAULT_SHOP_SETTINGS.assemblyFee

/**
 * Taking the old sofa away, priced per seat so a corner sofa pays more than a
 * two-seater. The customer counts every seat we are taking, so a 3-seater and
 * a 2-seater going together is 5. Unusual items are still confirmed before
 * delivery, and the customer is told this on the checkout.
 */
export const SOFA_REMOVAL_PER_SEAT = DEFAULT_SHOP_SETTINGS.removalPerSeat
export const SOFA_REMOVAL_MIN_SEATS = DEFAULT_SHOP_SETTINGS.removalMinSeats
export const SOFA_REMOVAL_MAX_SEATS = DEFAULT_SHOP_SETTINGS.removalMaxSeats

/** The delivery figures a calculation needs: a subset of the shop settings. */
export type DeliverySettings = Pick<ShopSettings,
  'upstairsFirstFloor' | 'upstairsPerExtraFloor' | 'maxFloor' | 'assemblyFee' |
  'removalPerSeat' | 'removalMinSeats' | 'removalDefaultSeats' | 'removalMaxSeats'>

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

/** Nothing extra; the seat stepper opens on a 3-seater, the most common old sofa. */
export const NO_EXTRAS: DeliveryOptions = {
  floor: 0,
  hasLift: false,
  assembly: false,
  sofaRemoval: false,
  sofaRemovalSeats: DEFAULT_SHOP_SETTINGS.removalDefaultSeats,
}

/** Seat count held to the range the checkout and place_order both accept. */
function clampRemovalSeats(seats: number, s: DeliverySettings): number {
  if (!Number.isFinite(seats)) return s.removalDefaultSeats
  return Math.min(s.removalMaxSeats, Math.max(s.removalMinSeats, Math.floor(seats)))
}

/** Removal charge for a given number of seats. */
export function sofaRemovalFee(seats: number, s: DeliverySettings = DEFAULT_SHOP_SETTINGS): number {
  return clampRemovalSeats(seats, s) * s.removalPerSeat
}

/**
 * Carrying charge for the chosen floor. Ground floor is free. The floor is
 * held to the highest one we carry to, as place_order holds it.
 */
function upstairsFee(floor: number, hasLift: boolean, s: DeliverySettings): number {
  if (!Number.isFinite(floor) || floor <= 0) return 0
  if (hasLift) return s.upstairsFirstFloor
  return s.upstairsFirstFloor + (Math.min(Math.floor(floor), s.maxFloor) - 1) * s.upstairsPerExtraFloor
}

interface DeliveryBreakdownLine {
  /**
   * 'agreed' is the one negotiated figure on a WhatsApp order, in place of the
   * extras. 'distance' is the delivery charge for Devon, Cornwall and the far
   * north of Scotland (delivery_distance_fees), added once place_order has
   * settled it.
   */
  key: 'upstairs' | 'assembly' | 'sofaRemoval' | 'agreed' | 'distance'
  label: string
  detail?: string
  amount: number
}

export interface DeliveryBreakdown {
  lines: DeliveryBreakdownLine[]
  total: number
}

/** Every chargeable extra, ready to render as its own line. */
export function deliveryBreakdown(opts: DeliveryOptions, s: DeliverySettings = DEFAULT_SHOP_SETTINGS): DeliveryBreakdown {
  const lines: DeliveryBreakdownLine[] = []

  const upstairs = upstairsFee(opts.floor, opts.hasLift, s)
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
    lines.push({ key: 'assembly', label: 'Assembly', amount: s.assemblyFee })
  }

  if (opts.sofaRemoval) {
    const seats = clampRemovalSeats(opts.sofaRemovalSeats, s)
    lines.push({
      key: 'sofaRemoval',
      label: 'Old sofa removal',
      detail: `${seats} ${seats === 1 ? 'seat' : 'seats'} at ${gbpFigure(s.removalPerSeat)} each`,
      amount: sofaRemovalFee(seats, s),
    })
  }

  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0) }
}

/** Total of the chargeable extras. Base delivery is always free. */
export function deliveryTotal(opts: DeliveryOptions, s: DeliverySettings = DEFAULT_SHOP_SETTINGS): number {
  return deliveryBreakdown(opts, s).total
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
  'FREE delivery to most of UK Mainland in 2–4 days; Devon, Cornwall, the Aberdeen area and the north of Scotland pay £40 to £100 and take 5–7 days. No deliveries on Mondays. Website orders are for UK Mainland only: for Northern Ireland, the Isle of Man, Channel Islands, Scottish islands, Isle of Wight, Isles of Scilly and anywhere else off the mainland, message us for the details and a custom delivery quote first.'
