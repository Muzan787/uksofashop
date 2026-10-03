// src/utils/pricing.ts
//
// The one place a "was" price turns into a discount.
//
// products.was_price is display-only. It is struck through beside the live
// price and turned into a rounded percentage, and it is never part of a total:
// the basket, place_order and the offer engine all price a line from
// base_price + price_adjustment exactly as they did before this existed. A
// discount built as a second price is a discount the browser can argue with,
// and nothing here gives it the chance.
//
// Every storefront surface that shows a price goes through `sale()` rather
// than doing the arithmetic itself, because there are three decisions in it
// that have to come out the same on a card, on the product page and in the
// Google feed, or the shop is making different claims in different places.

/** A price, and what it used to be. */
export interface Sale {
  /** What it costs now, variant adjustment included. */
  price: number
  /** What it used to cost, the same adjustment applied. Null = no discount. */
  wasPrice: number | null
  /** Whole percent off, rounded DOWN. 0 where there is nothing to announce. */
  percentOff: number
  /** Whole pounds saved, rounded down to match the percentage. 0 without one. */
  saving: number
}

/**
 * Rounded DOWN, never up.
 *
 * £1,199 down to £899 is 25.02% off, and both "25%" and "26%" are within a
 * rounding of it — but only one of them is a claim we can stand behind if
 * somebody does the division. Understating a saving is always safe; overstating
 * one is an advertising problem. In practice this costs nothing, because prices
 * ending in 99 land just above the round figure rather than just below it.
 */
export function percentOff(price: number, wasPrice: number): number {
  if (!(wasPrice > price) || !(wasPrice > 0)) return 0
  return Math.floor(((wasPrice - price) / wasPrice) * 100)
}

/**
 * DECISION: the variant adjustment is added to BOTH figures.
 *
 * was_price sits on the product, while a colourway can carry +£40. Leaving the
 * was price alone would make the discount shrink as the customer clicked
 * through the swatches — 25% off the grey, 23% off the navy, on what the shop
 * is calling one offer. Moving both keeps the percentage the product's, which
 * is what was meant by entering it.
 *
 * Guards rather than trusts: the column has a CHECK keeping it above
 * base_price, but a null, a zero or a figure that has since been overtaken by a
 * price rise all resolve to "no discount" instead of a negative saving.
 */
export function sale(
  basePrice: number | string | null | undefined,
  wasPrice: number | string | null | undefined,
  adjustment: number | string | null | undefined = 0,
): Sale {
  const adjust = Number(adjustment ?? 0)
  const bump = Number.isFinite(adjust) ? adjust : 0

  const base = Number(basePrice ?? 0)
  const price = (Number.isFinite(base) ? base : 0) + bump

  const was = Number(wasPrice ?? 0)
  const wasTotal = Number.isFinite(was) && was > 0 ? was + bump : 0

  const pct = percentOff(price, wasTotal)
  // A saving too small to round to 1% is a saving not worth striking a price
  // through for. Below that threshold the product simply shows its price.
  if (pct < 1) return { price, wasPrice: null, percentOff: 0, saving: 0 }

  return { price, wasPrice: wasTotal, percentOff: pct, saving: Math.floor(wasTotal - price) }
}

/** "£1,199" — the house format for a was price, in sync across every surface. */
export function pounds(value: number): string {
  return `£${Math.round(value).toLocaleString('en-GB')}`
}
