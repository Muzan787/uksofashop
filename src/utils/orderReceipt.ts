// src/utils/orderReceipt.ts
//
// The receipt, worked out once. The printed receipt (admin/orders/
// DirectPrintButton) and the receipt email (sendOrderReceipt in email.ts) both
// draw from this, so the two cannot disagree about a line, a fee or the amount
// paid - the printed one used to leave out an agreed delivery charge and any
// fee the checkout had not itemised, so its rows did not add up to its total.
//
// Pure: no server-only imports, because the print button runs in the browser
// and the email on the server.
//
// What "paid" means here. The shop takes the money on delivery, and the
// database holds no payment record - no amount received, no method. So the
// receipt says the order was paid in full once it is marked Delivered, and
// says what is due until then. A deposit, where one was agreed on the call,
// is part of the price and is not recorded either; the "due" note says so.

import type { AdminOrderDisplay } from '@/types/adminOrders'
import { describeCustomisation } from '@/utils/productOptions'
import { describeFinish } from '@/utils/orderFinish'
import { itemTitle } from '@/utils/orderItemTitle'
import { PROMISES } from '@/constants/promises'

const money = (n: unknown) => `£${Number(n ?? 0).toFixed(2)}`
const num = (n: unknown) => Number(n ?? 0) || 0
const cents = (n: number) => Math.round(n * 100)

export interface ReceiptLine {
  title: string
  quantity: number
  /** Price of one. */
  unit: number
  /** Price of the line. */
  total: number
  /** Fabric or colour, and the SKU: the line under the title. */
  summary: string[]
  /** Everything chosen on the line: size, seats, feet, extras, mattress upgrade. */
  details: { label: string; value: string }[]
}

export interface ReceiptRow {
  label: string
  /** Where it applies: a region, a floor, a number of seats. */
  detail?: string
  amount: number
  kind: 'charge' | 'discount'
  /** Print "FREE" or "Included" instead of £0.00. */
  zeroText?: string
}

export interface Receipt {
  /** The 8-character order code, upper case. */
  ref: string
  orderedOn: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string
  address: string
  lines: ReceiptLine[]
  /** The goods before any offer or delivery. */
  itemsSubtotal: number
  /** The offer, delivery and each extra, in the order they are printed. */
  rows: ReceiptRow[]
  /** What the order comes to: the figure on the order. */
  total: number
  status: 'delivered' | 'cancelled' | 'open'
  deliveredOn: string | null
  payment: {
    kind: 'paid' | 'due' | 'cancelled'
    /** "Amount paid", "Total due on delivery", "Cancelled". */
    heading: string
    /** The figure beside the heading, null for a cancelled order. */
    amount: number | null
    note: string
  }
  guarantee: {
    /** "1-year guarantee on the frame and springs." */
    summary: string
    /** The first and last day it covers, once delivered. */
    from: string | null
    to: string | null
    /** The sentence for the customer. */
    text: string
    /** What it does not cover. */
    exclusions: string
  }
}

export const formatMoney = money

const LONDON = 'Europe/London'

/** The calendar day an instant falls on in the UK, not in the server's zone. */
function ukDay(value: string | Date | null | undefined): { y: number; m: number; d: number } | null {
  if (!value) return null
  const at = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(at.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(at)
  const pick = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return { y: pick('year'), m: pick('month'), d: pick('day') }
}

/** "12 November 2026". The date is a plain calendar day, so UTC keeps it exact. */
function longDay(utcMidnight: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utcMidnight)
}

export function formatReceiptDate(value: string | Date | null | undefined): string | null {
  const day = ukDay(value)
  return day ? longDay(new Date(Date.UTC(day.y, day.m - 1, day.d))) : null
}

/** One year of cover from the day of delivery, to the day before its anniversary. */
export function guaranteePeriod(deliveredAt: string | Date | null | undefined): { from: string; to: string } | null {
  const day = ukDay(deliveredAt)
  if (!day) return null
  return {
    from: longDay(new Date(Date.UTC(day.y, day.m - 1, day.d))),
    to: longDay(new Date(Date.UTC(day.y + 1, day.m - 1, day.d - 1))),
  }
}

export const GUARANTEE_EXCLUSIONS =
  'It does not cover wear and tear, accidental damage or fabric fading, and it sits alongside your statutory rights rather than replacing them.'

export function buildReceipt(order: AdminOrderDisplay): Receipt {
  const items = order.order_items ?? []

  const lines: ReceiptLine[] = items.map(item => {
    const finish = describeFinish({ ...item, color: item.product_variants?.color })
    return {
      title: itemTitle(item),
      quantity: item.quantity,
      unit: num(item.price_at_time_of_purchase),
      total: num(item.price_at_time_of_purchase) * num(item.quantity),
      // The photo colourway is only said when no fabric was chosen: a sofa built
      // in "Chenille Mink" is not also "Grey".
      summary: [
        item.fabric_code
          ? `Fabric: ${finish.label ? `${finish.label} ` : ''}(${item.fabric_code})`
          : item.product_variants?.color ? `Colour: ${item.product_variants.color}` : '',
        item.product_variants?.sku ? `SKU ${item.product_variants.sku}` : '',
      ].filter(Boolean),
      details: describeCustomisation(item.customisation),
    }
  })

  const itemsTotal = lines.reduce((sum, l) => sum + l.total, 0)
  const itemsSubtotal = order.items_subtotal != null ? num(order.items_subtotal) : itemsTotal
  const total = num(order.total_amount)

  const rows: ReceiptRow[] = []
  const discount = num(order.discount_amount)
  if (discount > 0) {
    rows.push({ label: `Offer${order.promotion_code ? ` · ${order.promotion_code}` : ''}`, amount: discount, kind: 'discount' })
  }

  const distance = num(order.fee_distance)
  const upstairs = num(order.fee_upstairs)
  const assembly = num(order.fee_assembly)
  const removal = num(order.fee_sofa_removal)
  const itemisedDelivery = distance + upstairs + assembly + removal
  // A WhatsApp or phone order carries one delivery figure that was agreed on
  // the call, with none of the checkout's separate fees.
  const agreedDelivery = num(order.delivery_total) > 0 && itemisedDelivery === 0

  if (distance > 0) {
    rows.push({ label: 'Delivery', detail: order.delivery_region ? `to ${order.delivery_region}` : undefined, amount: distance, kind: 'charge' })
  } else if (agreedDelivery) {
    rows.push({ label: 'Delivery', detail: 'as agreed', amount: num(order.delivery_total), kind: 'charge' })
  } else {
    rows.push({ label: 'Delivery', detail: 'ground floor', amount: 0, kind: 'charge', zeroText: 'FREE' })
  }
  if (upstairs > 0) {
    rows.push({
      label: 'Upstairs delivery',
      detail: order.delivery_has_lift ? 'lift available' : order.delivery_floor ? `floor ${order.delivery_floor}` : undefined,
      amount: upstairs,
      kind: 'charge',
    })
  }
  if (assembly > 0 || order.wants_assembly) {
    rows.push({ label: 'Assembly', amount: assembly, kind: 'charge', zeroText: 'Included' })
  }
  if (removal > 0 || order.wants_sofa_removal) {
    rows.push({
      label: 'Old sofa removal',
      detail: order.sofa_removal_seats ? `${order.sofa_removal_seats} seats` : undefined,
      amount: removal,
      kind: 'charge',
      zeroText: 'Included',
    })
  }

  // Whatever the order total holds that the rows above do not explain (a price
  // corrected by hand, say): shown, so the receipt always adds up.
  const explained = itemsSubtotal - discount + rows.filter(r => r.kind === 'charge').reduce((sum, r) => sum + r.amount, 0)
  const gap = total - explained
  if (cents(gap) !== 0) {
    rows.push({ label: 'Adjustment', amount: Math.abs(gap), kind: gap > 0 ? 'charge' : 'discount' })
  }

  const status: Receipt['status'] = order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' ? 'cancelled' : 'open'
  const deliveredOn = status === 'delivered' ? formatReceiptDate(order.delivered_at) : null

  const payment: Receipt['payment'] =
    status === 'delivered'
      ? {
          kind: 'paid',
          heading: 'Amount paid',
          amount: total,
          note: `Paid in full${deliveredOn ? ` on delivery, ${deliveredOn}` : ' on delivery'}. Nothing more to pay.`,
        }
      : status === 'cancelled'
        ? { kind: 'cancelled', heading: 'Order cancelled', amount: null, note: 'This order was cancelled, so nothing is due.' }
        : {
            kind: 'due',
            heading: 'Total due on delivery',
            amount: total,
            note: 'Paid in cash or by bank transfer once it is in the room. If you paid a deposit when we confirmed the order, it comes off this amount.',
          }

  const period = status === 'delivered' ? guaranteePeriod(order.delivered_at) : null
  const guarantee: Receipt['guarantee'] = {
    summary: PROMISES.guarantee.short,
    from: period?.from ?? null,
    to: period?.to ?? null,
    text: period
      ? `Your ${PROMISES.guarantee.short} is valid from ${period.from} to ${period.to}.`
      : `Your ${PROMISES.guarantee.short} starts on the day it is delivered and runs for one year from then.`,
    exclusions: GUARANTEE_EXCLUSIONS,
  }

  return {
    ref: order.id.split('-')[0].toUpperCase(),
    orderedOn: formatReceiptDate(order.created_at),
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    address: order.shipping_address,
    lines,
    itemsSubtotal,
    rows,
    total,
    status,
    deliveredOn,
    payment,
    guarantee,
  }
}

/** "£12.00", or the row's own word ("FREE", "Included") when it costs nothing. */
export function rowAmountText(row: ReceiptRow): string {
  if (row.amount === 0 && row.zeroText) return row.zeroText
  return `${row.kind === 'discount' ? '−' : ''}${money(row.amount)}`
}

/** "Delivery to Cornwall", "Upstairs delivery (floor 3)". */
export function rowLabelText(row: ReceiptRow): string {
  if (!row.detail) return row.label
  return row.detail.startsWith('to ') ? `${row.label} ${row.detail}` : `${row.label} (${row.detail})`
}
