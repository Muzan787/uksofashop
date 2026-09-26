// src/utils/orderText.ts
//
// The order as a block of plain text, for pasting into the WhatsApp thread the
// order actually came from. The printed invoice is the wrong shape entirely for
// a chat message: this is the same information, laid out to be read on a phone.
//
// It lived inside CopyOrderButton while the copy button was the only caller.
// The admin's new-order email now carries the same block, so that Muaz can
// forward an order straight from his inbox instead of opening the admin panel
// to copy it - and an email is rendered on the server, which a file marked
// 'use client' cannot be asked for. Two formatters would have drifted within a
// month; the fabric line alone has been corrected twice.

import { formatUkMobileIntl } from '@/utils/phone'
import { isValidUkPostcode, normalisePostcode } from '@/utils/postcode'
import type { AdminOrderDisplay, AdminOrderItemDisplay } from '@/types/adminOrders'
import { asBuildSnapshot, describeBuild } from '@/types/build'
import { formatPreferredDeliveryDate } from '@/utils/delivery'
import { finishText } from '@/utils/orderFinish'

/** Every UK Mainland order, whatever it is. There is no per-order estimate. */
const DELIVERY_WINDOW = '2-4 days'

const money = (n: unknown) => `£${Number(n ?? 0).toFixed(2)}`

/**
 * Both checkout paths store the address with the postcode appended after a
 * comma, so the split is usually the last segment - but hand-typed addresses
 * exist, hence the second attempt at a bare trailing postcode. Anything we
 * can't recognise stays in the address line rather than being dropped.
 */
export function splitAddress(raw: string): { address: string; postcode: string | null } {
  const flat = (raw || '').replace(/\s*\n\s*/g, ', ').replace(/\s+/g, ' ').trim()

  const parts = flat.split(',')
  const last = parts[parts.length - 1]?.trim() ?? ''
  if (parts.length > 1 && isValidUkPostcode(last)) {
    return {
      address: parts.slice(0, -1).join(',').replace(/[\s,]+$/, '').trim(),
      postcode: normalisePostcode(last),
    }
  }

  const trailing = flat.match(/([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i)
  if (trailing && isValidUkPostcode(trailing[1])) {
    return {
      address: flat.slice(0, flat.length - trailing[1].length).replace(/[\s,]+$/, '').trim(),
      postcode: normalisePostcode(trailing[1]),
    }
  }

  return { address: flat, postcode: null }
}

function itemBlock(item: AdminOrderItemDisplay): string {
  const lines = [
    `${item.quantity}x ${item.product_variants?.products?.title ?? 'Item'}`,
    // The photo colourway, only when no fabric was chosen - a made-to-order
    // sofa is built in the fabric below, and "Grey" above "Chenille Mink"
    // reads as two instructions.
    [!item.fabric_code && item.product_variants?.color, item.product_variants?.sku && `SKU: ${item.product_variants.sku}`]
      .filter(Boolean)
      .join(' • '),
    // The fabric it gets built in, when one was chosen. Losing this on the way
    // into a chat is how a made-to-order sofa gets built in the wrong colour.
    item.fabric_code && `Fabric: ${finishText(item)}`,
    // Everything the customer chose on /build, one line each. Same words the
    // customer read on the summary screen and the basket.
    ...describeBuild(asBuildSnapshot(item.customisation)).map(line => `${line.label}: ${line.value}`),
    `Price: ${money(Number(item.price_at_time_of_purchase) * Number(item.quantity))}`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function formatOrderForCopy(order: AdminOrderDisplay): string {
  const { address, postcode } = splitAddress(order.shipping_address)
  const items = order.order_items ?? []
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Date unavailable'

  const extras = [
    Number(order.fee_upstairs ?? 0) > 0 && `Upstairs: ${money(order.fee_upstairs)}`,
    Number(order.fee_assembly ?? 0) > 0 && `Assembly: ${money(order.fee_assembly)}`,
    Number(order.fee_sofa_removal ?? 0) > 0 && `Removal${order.sofa_removal_seats ? ` (${order.sofa_removal_seats} seats)` : ''}: ${money(order.fee_sofa_removal)}`,
  ].filter(Boolean) as string[]

  const discount = Number(order.discount_amount ?? 0)
  const offerLine = discount > 0
    ? `Offer${order.promotion_code ? ` ${order.promotion_code}` : ''}: −${money(discount)}`
    : null

  // One item reads best inline ("Order: 1x Verona ..."); more than one needs a
  // label of its own with the blocks under it.
  const orderSection =
    items.length === 1
      ? `Order: ${itemBlock(items[0])}`
      : ['Order:', items.map(itemBlock).join('\n\n')].join('\n')

  const blocks = [
    [
      `Order on ${orderDate}`,
      order.preferred_delivery_date
        ? `Delivery: requested for ${formatPreferredDeliveryDate(order.preferred_delivery_date)}`
        : `Delivery: ${DELIVERY_WINDOW}`,
    ].join('\n'),

    [
      `Name: ${order.customer_name}`,
      `Contact: ${formatUkMobileIntl(order.customer_phone)}`,
      order.customer_email && `Email: ${order.customer_email}`,
    ]
      .filter(Boolean)
      .join('\n'),

    [`Address: ${address}`, postcode && `Postcode: ${postcode}`].filter(Boolean).join('\n'),

    orderSection,

    offerLine,

    extras.length ? ['Additional:', ...extras].join('\n') : null,

    `Total: ${money(order.total_amount)}`,
  ].filter(Boolean)

  return blocks.join('\n\n')
}
