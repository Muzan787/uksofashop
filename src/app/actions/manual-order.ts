'use server'

// src/app/actions/manual-order.ts
//
// Taking an order that was agreed in a WhatsApp conversation.
//
// WHY IT EXISTS. Click-to-WhatsApp campaigns send people into a chat, and Meta
// counts the chat. Until now nothing ever told it which chats became sales, so
// it has been optimising for people who message rather than people who buy -
// the same mistake, one channel over, that utils/orderConversions.ts exists to
// correct for the website. It could not be told, because a WhatsApp sale was
// not recorded anywhere: the orders table had exactly one writer, place_order,
// called from the website checkout.
//
// So this is first an operational record - a reference, a delivery address, a
// status the driver's day is planned from - and second an advertising signal.
// It earns its place on the first count alone.
//
// PRICING. place_order prices the basket itself and refuses any other figure,
// because it is callable by anyone. That guard cannot be relaxed, so the
// negotiated price goes through place_manual_order instead, which refuses
// anyone who is not an admin before it reads a thing. See the migration
// 20260904120000_whatsapp_orders.sql for the reasoning in full.
//
// THE SAME EMAILS AS A WEBSITE ORDER. Muaz asked (2026-09-20) for an order
// entered here to behave exactly as one from the checkout: it lands as
// pending_cod, the customer gets the receipt with the confirm link (when
// there is an email to send it to), and the shop gets the new-order email
// with the WhatsApp button that carries the same link - so the customer's
// yes is on record in the chat either way. Every later status change then
// emails through updateOrderStatus like any other order.

import { z } from 'zod'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendOrderConfirmation, sendAdminOrderNotification } from '@/utils/email'
import { isValidAgreedDeliveryDate } from '@/utils/delivery'
import type { DeliveryBreakdown } from '@/constants/delivery'
import { isAdmin } from '@/utils/auth'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import { isValidWhatsAppReference } from '@/utils/attribution/whatsapp'
import { createAdminClient } from '@/utils/supabase/admin'

const itemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  /**
   * The agreed per-unit price, or null to charge the catalogue price.
   *
   * Null rather than a pre-filled number, so "no discount" is recorded as a
   * decision to sell at list price rather than as a figure that happened to be
   * typed - and so a price change in the catalogue is not silently frozen into
   * an order taken before it.
   */
  unit_price: z.number().nonnegative().max(1_000_000).nullable(),
  fabric_id: z.string().uuid().nullish(),
})

const schema = z.object({
  customerName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  /**
   * Optional, unlike the website.
   *
   * On WhatsApp the number is what you have and the email is what you might
   * get. Requiring one would mean either inventing it or not recording the
   * order - and an order with a phone number is a perfectly good order. It is
   * worth asking for, though: a hashed email is the single strongest thing
   * Meta can match a person on.
   */
  customerEmail: z.union([z.string().trim().email('That email address is not valid.'), z.literal('')]),
  customerPhone: z.string().trim().refine(isValidUkMobile, UK_MOBILE_ERROR),
  shippingAddress: z.string().trim().min(6, 'Please give a delivery address.'),
  postcode: z.string().trim().min(5, 'Please give a valid UK postcode.').max(16),
  specialInstructions: z.string().trim().max(1000).optional(),
  /** One negotiated figure. There is no extras matrix on a phone call. */
  deliveryCharge: z.number().nonnegative().max(10_000),
  /**
   * The delivery day agreed in the chat, YYYY-MM-DD, or empty. Any day from
   * today to a year ahead - the website's four-day lead is for customers
   * choosing unaided, not for a day the shop has agreed.
   */
  preferredDeliveryDate: z.string().trim().optional().transform(v => (v ? v : undefined)).refine(
    v => v === undefined || isValidAgreedDeliveryDate(v),
    { error: 'The delivery day must be today or later, and within a year.' },
  ),
  items: z.array(itemSchema).min(1, 'Add at least one sofa.'),
  /**
   * Optional. Most WhatsApp sales still won't carry one - direct WhatsApp,
   * referrals, repeat customers, a phone call - and the order must save
   * exactly as it did before this field existed either way. See
   * 20260906160000_manual_order_whatsapp_reference.sql.
   */
  whatsappReference: z.string().trim().max(32).optional(),
  /**
   * Fallback when the customer did not paste the reference into WhatsApp.
   * This is the timestamp visible beside their first message, interpreted in
   * the timezone the admin says that WhatsApp screen was showing.
   */
  contactTime: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the contact date.'),
    hour: z.number().int().min(1).max(12),
    minute: z.number().int().min(0).max(59),
    meridiem: z.enum(['AM', 'PM']),
    timezone: z.enum(['Asia/Karachi', 'Europe/London']),
  }).optional(),
})

export type ManualOrderInput = z.input<typeof schema>

export type WhatsAppAttributionMatch = {
  reference: string
  method: 'reference' | 'contact_time'
  gapMinutes: number | null
  pageContext: string | null
  utmSource: string | null
  utmContent: string | null
}

export type ManualOrderResult =
  | { success?: undefined; error: string }
  | {
      success: true
      error?: undefined
      orderId: string
      total: number
      attributionMatch: WhatsAppAttributionMatch | null
      contactTimeSearched: boolean
    }

const WHATSAPP_TIME_MATCH_MINUTES = 10

/**
 * Convert a wall-clock time from the admin's WhatsApp screen into UTC.
 * Intl is used rather than a fixed +05/+01 offset so Europe/London keeps
 * working across BST/GMT automatically.
 */
function localWallClockToUtc(input: {
  date: string
  hour: number
  minute: number
  meridiem: 'AM' | 'PM'
  timezone: 'Asia/Karachi' | 'Europe/London'
}): Date | null {
  const [year, month, day] = input.date.split('-').map(Number)
  let hour = input.hour % 12
  if (input.meridiem === 'PM') hour += 12
  if (![year, month, day, hour, input.minute].every(Number.isFinite)) return null

  const desired = Date.UTC(year, month - 1, day, hour, input.minute, 0)
  let guess = desired
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: input.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })

  // Two passes are enough to converge across normal timezone offsets and DST.
  for (let i = 0; i < 2; i += 1) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(guess))
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, p.value]),
    )
    const seenAsUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), 0,
    )
    guess -= seenAsUtc - desired
  }

  const result = new Date(guess)
  if (Number.isNaN(result.getTime())) return null
  return result
}

async function resolveWhatsAppMatch(
  exactReference: string | undefined,
  contactTime: z.infer<typeof schema>['contactTime'],
): Promise<{ reference: string | null; match: WhatsAppAttributionMatch | null; searchedTime: boolean }> {
  const admin = createAdminClient()

  if (exactReference && isValidWhatsAppReference(exactReference)) {
    const reference = exactReference.trim().toUpperCase()
    const { data } = await admin
      .from('whatsapp_enquiries')
      .select('reference, created_at, page_context, utm_source, utm_content, converted_order_id')
      .eq('reference', reference)
      .maybeSingle()

    return {
      reference,
      searchedTime: false,
      match: data && !data.converted_order_id
        ? {
            reference,
            method: 'reference',
            gapMinutes: null,
            pageContext: data.page_context,
            utmSource: data.utm_source,
            utmContent: data.utm_content,
          }
        : null,
    }
  }

  if (!contactTime) return { reference: null, match: null, searchedTime: false }

  const target = localWallClockToUtc(contactTime)
  if (!target) return { reference: null, match: null, searchedTime: true }

  const earliest = new Date(target.getTime() - WHATSAPP_TIME_MATCH_MINUTES * 60_000)
  const { data } = await admin
    .from('whatsapp_enquiries')
    .select('reference, created_at, page_context, utm_source, utm_content, converted_order_id')
    .is('converted_order_id', null)
    // Never attach a click that happened after the customer's first message.
    .lte('created_at', target.toISOString())
    .gte('created_at', earliest.toISOString())
    // Closest previous click = newest row inside the backwards-only window.
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { reference: null, match: null, searchedTime: true }

  const gapMinutes = Math.max(0, (target.getTime() - Date.parse(data.created_at)) / 60_000)
  return {
    reference: data.reference,
    searchedTime: true,
    match: {
      reference: data.reference,
      method: 'contact_time',
      gapMinutes: Math.round(gapMinutes * 10) / 10,
      pageContext: data.page_context,
      utmSource: data.utm_source,
      utmContent: data.utm_content,
    },
  }
}

export async function previewWhatsAppTimeMatch(input: {
  date: string
  hour: number
  minute: number
  meridiem: 'AM' | 'PM'
  timezone: 'Asia/Karachi' | 'Europe/London'
}): Promise<{ match: WhatsAppAttributionMatch | null; error?: string }> {
  if (!(await isAdmin())) return { match: null, error: 'Not authorised.' }

  const parsed = schema.shape.contactTime.safeParse(input)
  if (!parsed.success) {
    return { match: null, error: parsed.error.issues[0]?.message ?? 'Check the contact time.' }
  }

  const resolved = await resolveWhatsAppMatch(undefined, parsed.data)
  return { match: resolved.match }
}

export async function createWhatsAppOrder(input: ManualOrderInput): Promise<ManualOrderResult> {
  // Checked here as well as inside place_manual_order. The database check is
  // the boundary that matters - a Server Action compiles to a public endpoint -
  // and this one exists so the form gets a sentence back rather than a raised
  // Postgres exception.
  if (!(await isAdmin())) {
    return { error: 'You are not authorised to take orders.' }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the order details.' }
  }
  const v = parsed.data

  const supabase = await createClient()
  const attribution = await resolveWhatsAppMatch(v.whatsappReference, v.contactTime)

  const { data, error } = await supabase.rpc('place_manual_order', {
    p_customer_name: v.customerName,
    // The column is nullable and the CAPI helper drops empty values, so an
    // absent email has to be absent rather than an empty string.
    p_customer_email: v.customerEmail || null,
    p_customer_phone: v.customerPhone,
    // Postcode appended, exactly as the website checkout does it: /track-order
    // matches the postcode against the END of the stored address, and
    // orderConversions.ts reads it back off the end for Meta's `zp`.
    p_shipping_address: `${v.shippingAddress}, ${v.postcode.toUpperCase()}`,
    p_special_instructions: v.specialInstructions || '',
    p_items: v.items.map(i => ({
      variant_id: i.variant_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      fabric_id: i.fabric_id ?? null,
    })),
    p_delivery_charge: v.deliveryCharge,
    p_source: 'whatsapp',
    // Malformed input is passed through as null rather than rejecting the
    // whole order over a typo'd reference - the database function already
    // treats an unmatched reference as a no-op, so this only avoids sending
    // it a value that could never match anything.
    p_whatsapp_reference: attribution.reference,
    p_preferred_delivery_date: v.preferredDeliveryDate ?? null,
  })

  if (error || !data) {
    console.error('place_manual_order failed:', error)
    const message = error?.message ?? ''

    if (message.includes('DELIVERY_DATE_PAST') || message.includes('DELIVERY_DATE_TOO_FAR')) {
      return { error: 'The delivery day must be today or later, and within a year.' }
    }

    if (message.includes('NOT_AUTHORISED')) {
      return { error: 'You are not authorised to take orders.' }
    }
    if (message.includes('UNAVAILABLE_ITEMS')) {
      return { error: 'One of those sofas is no longer active in the catalogue.' }
    }
    if (message.includes('UNAVAILABLE_FABRIC')) {
      return { error: 'That fabric has been withdrawn. Pick another.' }
    }
    if (message.includes('EMPTY_CART')) {
      return { error: 'Add at least one sofa.' }
    }
    return { error: 'Could not save the order. Please try again.' }
  }

  const order = data as unknown as { id: string; total_amount: number; items_subtotal: number; delivery_total: number }
  const shortCode = order.id.substring(0, 8).toUpperCase()

  revalidatePath('/admin/orders')

  // The two emails a website order sends, after the response so a slow relay
  // never holds up the form. The delivery figure is one agreed number, shown
  // as its own line (see totalsTable in utils/email.ts). The customer's copy
  // needs an address to go to; the shop's always goes, because its WhatsApp
  // button is how the confirm link reaches a customer with no email.
  const deliveryTotal = Number(order.delivery_total ?? 0)
  const breakdown: DeliveryBreakdown = {
    lines: deliveryTotal > 0 ? [{ key: 'agreed', label: 'Delivery (as agreed)', amount: deliveryTotal }] : [],
    total: deliveryTotal,
  }
  const preferredDeliveryDate = v.preferredDeliveryDate ?? null
  after(async () => {
    try {
      await Promise.all([
        v.customerEmail
          ? sendOrderConfirmation(
              v.customerEmail, v.customerName, shortCode, order.id,
              Number(order.total_amount), Number(order.items_subtotal), breakdown,
              0, null, preferredDeliveryDate,
            )
          : Promise.resolve(),
        sendAdminOrderNotification(
          v.customerName, v.customerEmail || 'no email given', v.customerPhone, shortCode, order.id,
          Number(order.total_amount), Number(order.items_subtotal), breakdown,
          0, null, preferredDeliveryDate,
        ),
      ])
    } catch (err) {
      console.error(`Failed to send order emails for WhatsApp order ${shortCode}`, err)
    }
  })

  // Deliberately NOT reported to Meta here.
  //
  // It lands as 'pending_cod', like every website order, and the Purchase is
  // reported when it reaches 'confirmed' - the same guarded, idempotent path in
  // utils/orderConversions.ts, which now sends it as action_source 'chat'. A
  // conversation that produces an order is not yet a sale on cash on delivery,
  // and reporting one here would re-introduce exactly the overstatement that
  // moving Purchase off the checkout form removed.
  return {
    success: true,
    // The short reference, as the rest of the site uses it.
    orderId: shortCode,
    total: Number(order.total_amount),
    attributionMatch: attribution.match,
    contactTimeSearched: attribution.searchedTime,
  }
}
