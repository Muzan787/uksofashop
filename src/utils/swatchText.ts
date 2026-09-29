// src/utils/swatchText.ts
//
// What a swatch request reads like outside the admin panel: as a block pasted
// into a chat, and as the follow-up message itself.
//
// Same arrangement as orderText.ts and for the same reason — the admin screen
// and the admin email both render these, and one of the two is built on the
// server, so neither can own the wording.

import { formatUkMobileIntl } from '@/utils/phone'

export interface SwatchCopyLine {
  code: string
  name: string
  collection: string
}

export interface SwatchCopyInput {
  customerName: string
  customerEmail: string
  customerPhone: string | null
  postcode: string
  shippingAddress: string
  /** ISO. Omitted on the email, which is the request arriving. */
  createdAt?: string | null
  items: SwatchCopyLine[]
}

/** The codes as one line, which is the whole picking list: "CH04, PL17, MB08". */
export const swatchCodes = (items: SwatchCopyLine[]) => items.map(i => i.code).join(', ')

/**
 * The request as plain text.
 *
 * Laid out picking-list first, the same order the admin screen puts it in: the
 * codes are what gets read at the shelf, and everything else is only needed
 * once the samples are already in your hand.
 */
export function formatSwatchForCopy(r: SwatchCopyInput): string {
  const asked = r.createdAt
    ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  const blocks = [
    asked ? `Swatch request — ${asked}` : 'Swatch request',

    ['Pull these:', ...r.items.map(i => `${i.code} — ${i.collection} ${i.name}`)].join('\n'),

    [
      `Name: ${r.customerName}`,
      r.customerPhone && `Contact: ${formatUkMobileIntl(r.customerPhone)}`,
      `Email: ${r.customerEmail}`,
    ]
      .filter(Boolean)
      .join('\n'),

    [`Post to: ${r.shippingAddress}`, `Postcode: ${r.postcode}`].join('\n'),
  ]

  return blocks.join('\n\n')
}

/** "Sarah Jones" -> "Sarah". Falls back to something addressable. */
function firstName(full: string): string {
  return (full || '').trim().split(/\s+/)[0] || 'there'
}

/** "Chenille Cream, Marble Ocean and Naple Sand" */
function readableList(items: SwatchCopyLine[]): string {
  const names = items.map(i => `${i.collection} ${i.name}`)
  if (names.length <= 1) return names[0] ?? 'your samples'
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The follow-up, for the button on the admin screen.
 *
 * It names the actual fabrics rather than saying "your samples", because the
 * customer chose five of seventy a week ago and will not remember which — and
 * because a message that proves somebody looked at their request before typing
 * it does not read as a bulk send, which is the whole difference between this
 * and marketing.
 *
 * Written as one paragraph. WhatsApp shows about two lines before "Read more",
 * and a question buried under a fold does not get answered.
 */
export function swatchFollowUpMessage(customerName: string, items: SwatchCopyLine[]): string {
  // Three is the usual request and the maximum, but one is allowed, and "did
  // your samples arrive, what did you think of them" sent to somebody holding
  // a single square is the tell that nobody wrote it.
  const one = items.length === 1

  return (
    `Hi ${firstName(customerName)}, it's UK Sofa Shop — did your fabric ${one ? 'sample' : 'samples'} arrive alright? ` +
    `You picked ${readableList(items)}. ` +
    `Let us know what you thought of ${one ? 'it' : 'them'}. ` +
    `If you'd like to order, or you have any questions at all, just say and we'll help.`
  )
}
