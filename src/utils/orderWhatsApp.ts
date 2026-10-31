// src/utils/orderWhatsApp.ts
//
// The WhatsApp message the order page offers for each status (admin upgrade
// E3): tap the button and WhatsApp opens on the customer's chat with this
// already written. In the shop's own voice - the waiting and confirmed ones
// are word for word what the shop's emails have always put on their WhatsApp
// buttons, so a customer hears the same thing whichever one was pressed.
//
// Pure, so it can be tested and used anywhere. Links are absolute, built from
// SITE_URL, because they leave the site.

export interface WhatsAppOrder {
  id: string
  status: string | null
  customer_name: string | null
  total_amount: number | null
  shipping_address: string | null
  cancellation_reason?: string | null
}

const POSTCODE = /([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})\s*$/

/** The postcode off the end of a stored address, "BB1 1AA", or ''. */
export function postcodeOf(address: string | null | undefined): string {
  const m = (address ?? '').toUpperCase().trim().match(POSTCODE)
  return m ? `${m[1]} ${m[2]}` : ''
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'there'
}

/**
 * The message for an order at its current status, or for `status` if given.
 * `reviewLink` is the Trustpilot (or own) review link for the delivered one.
 */
export function orderWhatsAppMessage(
  order: WhatsAppOrder,
  siteUrl: string,
  options: { status?: string; reviewLink?: string } = {},
): string {
  const status = options.status ?? order.status ?? 'pending_cod'
  const name = firstName(order.customer_name)
  const code = order.id.substring(0, 8).toUpperCase()
  const postcode = postcodeOf(order.shipping_address)
  const trackLink = postcode
    ? `${siteUrl}/track-order?ref=${encodeURIComponent(code)}&postcode=${encodeURIComponent(postcode)}`
    : `${siteUrl}/track-order?ref=${encodeURIComponent(code)}`

  switch (status) {
    case 'pending_cod':
      return `Hi ${name}, thanks for your order (#${code}) with UK Sofa Shop. Tap this link to check the details and confirm it: ${siteUrl}/confirm-order/${order.id}

Once it is confirmed we will ring you to arrange delivery.`
    case 'confirmed':
      return `Hi ${name}, thanks for confirming your order (#${code}) with UK Sofa Shop. When is a good time to ring you about a delivery day?`
    case 'on_hold':
      return `Hi ${name}, no problem - we've put your order (#${code}) on hold for now. Nothing is cancelled.

Just message us here when you're ready and we'll book a new delivery day. You can see your order here: ${trackLink}`
    case 'delivered':
      return `Hi ${name}, thank you for choosing UK Sofa Shop - we hope your new sofa has settled in well.${options.reviewLink ? `

If you have a minute, a quick review would mean a lot to us: ${options.reviewLink}` : ''}`
    case 'cancelled':
      return `Hi ${name}, your order (#${code}) has been cancelled${order.cancellation_reason ? `: ${order.cancellation_reason.trim().replace(/[.\s]+$/, '')}` : ''}.

If this isn't what you expected, just reply here and we'll sort it out.`
    default:
      return `Hi ${name}, there's an update on your order (#${code}) with UK Sofa Shop.`
  }
}
