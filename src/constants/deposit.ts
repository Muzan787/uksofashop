// src/constants/deposit.ts
//
// The deposit, written once (Muaz, 2026-11-01).
//
// Everything on the site is paid on delivery, with one exception: a sofa built
// to a custom size or layout, or in a fabric from the library that we have to
// order in, carries a small deposit. Six fabrics are kept in and carry none.
//
// Nothing about the order flow changes. The website still takes no money; the
// deposit is agreed and taken on the call that confirms the order, and it is
// part of the price, not a charge on top. What this file changes is what the
// site SAYS, because "no deposit" written flatly across the shop stops being
// true for those orders.
//
// No figure is quoted: the amount is agreed on the call.

/** The library fabrics that need no deposit, by code - the codes are stable
 *  where names and collection titles are not. */
export const NO_DEPOSIT_FABRICS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'CH02', label: 'Chenille Mink' },
  { code: 'CH04', label: 'Chenille Silver' },
  { code: 'CH05', label: 'Chenille Charcoal' },
  { code: 'CH12', label: 'Chenille Grey' },
  { code: 'CH11', label: 'Chenille Black' },
  { code: 'PL09', label: 'Plush Soft Velvet Blue' },
];

const NO_DEPOSIT_CODES = new Set(NO_DEPOSIT_FABRICS.map(f => f.code));

/** True for a fabric chosen from the library that is not one of the six. */
export function fabricNeedsDeposit(code: string | null | undefined): boolean {
  return Boolean(code) && !NO_DEPOSIT_CODES.has(code as string);
}

/** True when any basket line was built in a fabric that carries a deposit. */
export function hasDepositLine(lines: readonly { fabric_code?: string | null }[]): boolean {
  return lines.some(line => fabricNeedsDeposit(line.fabric_code));
}

/** "Chenille Mink, Chenille Silver, … and Plush Soft Velvet Blue". */
const sixNames = (() => {
  const names = NO_DEPOSIT_FABRICS.map(f => f.label);
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
})();

export const DEPOSIT = {
  /** Beside a chosen fabric. */
  fabric:
    'A small deposit applies to this colour. We take it when we ring to confirm your order, and it comes off the price; the rest is paid on delivery.',
  /** In the fabric picker's footer, for the fabric being looked at. */
  fabricShort: 'A small deposit applies to this colour, taken when we confirm your order.',
  /** In the custom size dialog. */
  custom:
    'A custom size or layout is built just for you, so we take a small deposit when we confirm it. It comes off the price; the rest is paid on delivery.',
  /** At the checkout, when a line in the basket carries one. */
  checkout:
    'Nothing to pay today. One of your choices needs a small deposit, which we take when we ring to confirm your order; it comes off the price and the rest is paid on arrival.',
  /** The exception, for pages that describe payment across the whole shop. */
  exception:
    'The one exception is a sofa built to a custom size or layout, or in a fabric we order in for you, which needs a small deposit when we confirm the order.',
  /** For the terms of sale. */
  terms:
    `If you choose a custom size or layout, or a fabric from our library other than ${sixNames}, we ask for a small deposit before your sofa is made. We agree the amount with you on the call that confirms your order. The deposit is part of the price, not an extra charge: it comes off what you pay on delivery. If we cannot make your sofa, the deposit is refunded in full. Everything else, including a made-to-order sofa in the colour shown on its page, is paid in full on delivery with nothing upfront.`,
} as const;
