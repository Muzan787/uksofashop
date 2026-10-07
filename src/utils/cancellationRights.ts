// src/utils/cancellationRights.ts
//
// Who loses the 14-day right to cancel, decided in one place.
//
// WHY THIS EXISTS. Three parts of the site used to answer this differently.
// The product page withheld the right from every product flagged
// `custom_made` - 59 of 72 - the checkout withheld it only when the customer
// had actually chosen a fabric, and the legal pages described a third thing
// ("built to your own specification"). A customer could be told on the
// product page that they had no right to cancel and then told nothing at all
// at checkout, for the same sofa.
//
// THE TEST. Regulation 28(1)(b) of the Consumer Contracts Regulations 2013
// exempts goods "made to the consumer's specifications or clearly
// personalised". Being made to order is not the same thing: a sofa built
// after the order is placed, but to the exact configuration shown on the
// page, is a standard product with a longer lead time. Nothing about it is
// the consumer's specification. The exemption attaches to a CHOICE the
// customer made, not to the manufacturing schedule.
//
// So the line is drawn at the line item, not the product: a basket row counts
// as personalised when the customer picked the fabric, or sent a build
// through /build. Everything else keeps the full 14 days.
//
// Getting this wrong in the other direction is not a neutral error. Telling a
// consumer they have no cancellation right when they do is a misleading
// action under the CPRs, now the DMCC Act 2024.
//
// `products.custom_made` and `orders.has_made_to_order` remain what they
// always were: operational flags that decide whether the workshop and the
// phone call are involved. They are deliberately NOT used here.

/** The parts of a basket row or order line that can carry a customer choice. */
export interface PersonalisableLine {
  /** Set when the customer chose a fabric from the library. */
  fabric_id?: string | null
  /** Set on lines that came from /build. */
  build?: unknown
  /** What `build` is called once it reaches order_items. */
  customisation?: unknown
}

/** True when this one line was built to something the customer chose. */
export function isPersonalisedLine(line: PersonalisableLine): boolean {
  if (line.fabric_id) return true
  if (line.build && typeof line.build === 'object') return true
  if (line.customisation && typeof line.customisation === 'object') return true
  return false
}

/**
 * True when any line in the basket or order is personalised, and the
 * cancellation notice therefore has to be shown.
 */
export function hasPersonalisedLine(lines: readonly PersonalisableLine[]): boolean {
  return lines.some(isPersonalisedLine)
}
