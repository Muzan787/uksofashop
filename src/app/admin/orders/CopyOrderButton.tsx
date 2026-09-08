'use client'
// src/app/admin/orders/CopyOrderButton.tsx
//
// The order as a block of plain text, for pasting into the WhatsApp thread the
// order actually came from. The print button next to it produces an invoice,
// which is the wrong shape entirely for a chat message: this is the same
// information, laid out to be read on a phone.
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { formatUkMobileIntl } from '@/utils/phone'
import { isValidUkPostcode, normalisePostcode } from '@/utils/postcode'

/** Every UK Mainland order, whatever it is. There is no per-order estimate. */
const DELIVERY_WINDOW = '2-4 days'

const money = (n: unknown) => `£${Number(n ?? 0).toFixed(2)}`

/**
 * Both checkout paths store the address with the postcode appended after a
 * comma, so the split is usually the last segment - but hand-typed addresses
 * exist, hence the second attempt at a bare trailing postcode. Anything we
 * can't recognise stays in the address line rather than being dropped.
 */
function splitAddress(raw: string): { address: string; postcode: string | null } {
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

function itemBlock(item: any): string {
  const lines = [
    `${item.quantity}x ${item.product_variants?.products?.title ?? 'Item'}`,
    [item.product_variants?.color, item.product_variants?.sku && `SKU: ${item.product_variants.sku}`]
      .filter(Boolean)
      .join(' • '),
    // The fabric it gets built in, when one was chosen. Losing this on the way
    // into a chat is how a made-to-order sofa gets built in the wrong colour.
    item.fabric_code &&
      `Fabric: ${[item.fabric_collection, item.fabric_name].filter(Boolean).join(' ')} (${item.fabric_code})`,
    `Price: ${money(Number(item.price_at_time_of_purchase) * Number(item.quantity))}`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function formatOrderForCopy(order: any): string {
  const { address, postcode } = splitAddress(order.shipping_address)
  const items = (order.order_items ?? []) as any[]

  const extras = [
    Number(order.fee_upstairs ?? 0) > 0 && `Upstairs: ${money(order.fee_upstairs)}`,
    Number(order.fee_assembly ?? 0) > 0 && `Assembly: ${money(order.fee_assembly)}`,
    Number(order.fee_sofa_removal ?? 0) > 0 && `Removal: ${money(order.fee_sofa_removal)}`,
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
      `Order on ${new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      `Delivery: ${DELIVERY_WINDOW}`,
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

export default function CopyOrderButton({ order }: { order: any }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = formatOrderForCopy(order)

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // navigator.clipboard is undefined outside a secure context, and can be
      // refused even inside one. The textarea route still works there.
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(el)
      }
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-sm text-sm font-bold hover:bg-stone-200 active:scale-95 transition"
      title="Copy the whole order as text"
      aria-label="Copy order details"
    >
      {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
    </button>
  )
}
