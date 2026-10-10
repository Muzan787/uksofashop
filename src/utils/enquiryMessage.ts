// src/utils/enquiryMessage.ts
//
// What a WhatsApp enquiry says when it arrives.
//
// WHY THIS IS WORTH ITS OWN FILE. WhatsApp is where this shop actually
// sells, and the first message decided how many messages the sale took. It
// used to read:
//
//     Hi, I'm enquiring about this product: Salone L-Shape.
//
// which is a greeting, not an enquiry. Every one of them cost the same two
// round trips before anything useful could be said — which sofa at what
// price, and where are you — and each round trip is a chance for the
// customer to stop replying.
//
// So the message now carries the price (so the reply can confirm it rather
// than look it up) and leaves the postcode on its own line for the customer
// to fill in. A postcode is the one fact that unlocks the whole answer:
// whether delivery is free, how long it takes, and whether it is mainland at
// all.
//
// Four surfaces send these and they are written here together so they
// cannot drift apart: the buy box's "talk to an agent", the made-to-order
// panel, the floating button, and the "real photos" button on the gallery.

import { offerHoldLine, type OfferHold } from '@/utils/offers/deadline'

/** Money as a customer writes it: £649, not £649.00. */
function gbp(amount: number): string {
  return `£${Math.round(amount).toLocaleString('en-GB')}`
}

/**
 * The blank the customer fills in. Kept on its own line and clearly empty —
 * a prompt they can answer in one tap, rather than a question buried in a
 * sentence that is easy to reply past.
 */
const POSTCODE_PROMPT = 'My postcode is:'

/**
 * The ad offer's line, when the visitor has an open window and this sofa
 * qualifies - placed just above the postcode so the blank stays last. In the
 * chat it is the deadline the shop honours: no later. See offers/deadline.
 */
function withHold(hold: OfferHold | null | undefined): string {
  const line = offerHoldLine(hold)
  return line ? `${line}\n\n` : ''
}

/**
 * A general enquiry about one sofa, from the buy box or the floating button.
 */
export function productEnquiryMessage(title: string, price?: number | null, hold?: OfferHold | null): string {
  const named = price ? `the ${title} (${gbp(price)})` : `the ${title}`
  return `Hi, I'm interested in ${named}.\n\n${withHold(hold)}${POSTCODE_PROMPT}`
}

/**
 * "Can I see the real thing?", from the button on the product photograph.
 *
 * Most of the catalogue has one picture, often a studio render, and the
 * question a cautious buyer asks before anything else is what it really looks
 * like. Asking it here starts the same conversation as any other enquiry -
 * the sofa, the price, the postcode - with the photos as the opening reply.
 */
export function photoRequestMessage(title: string, price?: number | null, hold?: OfferHold | null): string {
  const named = price ? `the ${title} (${gbp(price)})` : `the ${title}`
  return `Hi, could you send me some real photos or a short video of ${named}?\n\n${withHold(hold)}${POSTCODE_PROMPT}`
}

/**
 * A made-to-order enquiry. This one already prompted for the choices; the
 * price is the starting figure before any change the customer asks for, so
 * it is labelled as such rather than stated flatly.
 */
export function customEnquiryMessage(title: string, price?: number | null, hold?: OfferHold | null): string {
  const from = price ? ` (from ${gbp(price)})` : ''
  return (
    `Hi, I'd like a made-to-order ${title}${from}.\n\n` +
    'Colour:\n' +
    'Fabric / material:\n' +
    'Size or layout:\n' +
    'Anything else:\n\n' +
    withHold(hold) +
    POSTCODE_PROMPT
  )
}
