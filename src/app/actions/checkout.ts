'use server'

import { after } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendOrderConfirmation, sendAdminOrderNotification } from '@/utils/email'
import { deliveryBreakdown, NO_EXTRAS, type DeliveryOptions } from '@/constants/delivery'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { OFFER_ENTITLEMENT_COOKIE } from '@/utils/offers/constants'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { metaFbcFromTouch } from '@/utils/attribution/fbc'
import {
  WHATSAPP_REFERENCE_COOKIE,
  WHATSAPP_REFERENCE_MAX_AGE_S,
  isValidWhatsAppReference,
} from '@/utils/attribution/whatsapp'
import { isDeterministicCheckoutWhatsAppMatch } from '@/utils/attribution/checkoutLinkage'

/** What the browser is allowed to tell us: what was ordered, never what it costs. */
export interface CartItem {
  variant_id: string
  quantity: number
  /** Made-to-order lines only. The database re-reads the name from this id. */
  fabric_id?: string | null
}

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Full name must be at least 2 characters.'),
  customerEmail: z.string().email('Please provide a valid email address.'),
  // A UK mobile specifically: the driver calls before delivery, and the admin
  // WhatsApp link can only be built from a mobile.
  customerPhone: z.string().refine(isValidUkMobile, UK_MOBILE_ERROR),
  shippingAddress: z.string().min(10, 'Please provide a complete shipping address.'),
  specialInstructions: z.string().optional(),
})

const extrasSchema = z.object({
  floor: z.number().int().min(0).max(20),
  hasLift: z.boolean(),
  assembly: z.boolean(),
  sofaRemoval: z.boolean(),
})

const itemsSchema = z.array(z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  fabric_id: z.string().uuid().nullish(),
})).min(1, 'Your cart is empty.')

interface PlacedOrder {
  id: string
  items_subtotal: number
  discount_amount: number
  discount_tier: string | null
  promotion_code: string | null
  offer_source: string | null
  delivery_total: number
  total_amount: number
}

/**
 * What the browser gets back.
 *
 * Declared rather than inferred so the success branch is a contract: `total`
 * is always present, and is always the figure `place_order` computed in the
 * database. The checkout screen reports it to Google Ads as the conversion
 * value, so a caller must never be able to fall back to a cart-derived number
 * when it is missing - an optional `total` is what makes that fallback look
 * reasonable at the call site.
 *
 * `orderId` is the short reference, not the row's uuid. The uuid is the access
 * token for /confirm-order/[id] and does not belong in the browser's hands, or
 * in a transaction_id sent to Google.
 */
export type PlaceOrderResult =
  | { success?: undefined; error: string }
  | { success: true; error?: undefined; orderId: string; total: number }

export async function placeOrder(
  formData: FormData,
  cartItems: CartItem[],
  expectedTotal: number,
  extras: DeliveryOptions = NO_EXTRAS,
  promotionCode: string | null = null,
): Promise<PlaceOrderResult> {
  // place_order is anon-callable and sends two emails per successful call,
  // through the same mailbox that has a daily cap. Ten orders per hour from
  // one address is well beyond any real customer and far below the cap.
  const limit = rateLimit(callerKey(await headers(), 'order'), 10, 60 * 60 * 1000)
  if (!limit.ok) {
    return { error: 'Too many orders from this connection. Please call us on 07476 616022 and we will take it over the phone.' }
  }

  const supabase = await createClient()
  const jar = await cookies()
  const entitlementCookie = z.string().uuid().safeParse(jar.get(OFFER_ENTITLEMENT_COOKIE)?.value)

  const validatedData = checkoutSchema.safeParse({
    customerName: formData.get('customerName'),
    customerEmail: formData.get('customerEmail'),
    customerPhone: formData.get('customerPhone'),
    shippingAddress: formData.get('shippingAddress'),
    specialInstructions: formData.get('specialInstructions'),
  })
  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const validatedItems = itemsSchema.safeParse(cartItems)
  if (!validatedItems.success) {
    return { error: validatedItems.error.issues[0].message }
  }

  const validatedExtras = extrasSchema.safeParse(extras)
  if (!validatedExtras.success) {
    return { error: 'Those delivery options are not valid. Please review them and try again.' }
  }

  const { customerName, customerEmail, customerPhone, shippingAddress, specialInstructions } = validatedData.data
  const opts = validatedExtras.data

  const { data, error: orderError } = await supabase.rpc('place_order', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_shipping_address: shippingAddress,
    p_special_instructions: specialInstructions || '',
    // Ids and quantities only. Prices are looked up in the database.
    p_items: validatedItems.data.map(item => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      // Just the id. The fabric's name and code are snapshotted onto the order
      // by place_order, from the database's own row rather than the browser's.
      fabric_id: item.fabric_id ?? null,
    })),
    p_expected_total: expectedTotal,
    p_delivery_floor: opts.floor,
    p_delivery_has_lift: opts.hasLift,
    p_wants_assembly: opts.assembly,
    p_wants_sofa_removal: opts.sofaRemoval,
    // The code/token are authorisation inputs only. The database decides the
    // tier, discount and final total; the browser never supplies those values.
    p_promotion_code: promotionCode,
    p_offer_entitlement_token: entitlementCookie.success ? entitlementCookie.data : null,
  })

  if (orderError || !data) {
    console.error('Supabase Order Error:', orderError)
    const message = orderError?.message ?? ''

    if (message.includes('PRICE_MISMATCH')) {
      return { error: 'Prices or your offer have changed since they were checked. Please review your total and try again.' }
    }
    if (message.includes('UNAVAILABLE_ITEMS')) {
      return { error: 'One of the items in your basket is no longer available. Please remove it and try again.' }
    }
    if (message.includes('EMPTY_CART')) {
      return { error: 'Your cart is empty.' }
    }
    if (message.includes('UNAVAILABLE_FABRIC')) {
      return { error: 'One of the fabrics in your basket is no longer available. Please choose another and try again.' }
    }
    return { error: 'We could not place your order. Please try again, or call us on 07476 616022.' }
  }

  // Totals as the database computed them, not as the browser reported them, so
  // the confirmation email can never disagree with the order record.
  const order = data as unknown as PlacedOrder
  const shortCode = order.id.substring(0, 8).toUpperCase()
  const breakdown = deliveryBreakdown(opts)

  // Sent after the response goes back to the customer. The order is already
  // committed at this point, so a slow or unreachable mail server delays a
  // notification rather than the confirmation screen - previously these two
  // awaits sat between the customer clicking Place Order and seeing it work.
  after(async () => {
    try {
      await Promise.all([
        sendOrderConfirmation(
          customerEmail, customerName, shortCode, order.id,
          Number(order.total_amount), Number(order.items_subtotal), breakdown,
          Number(order.discount_amount), order.promotion_code,
        ),
        sendAdminOrderNotification(
          customerName, customerEmail, customerPhone, shortCode, order.id,
          Number(order.total_amount), Number(order.items_subtotal), breakdown,
          Number(order.discount_amount), order.promotion_code,
        ),
      ])
    } catch (err) {
      // The order is safe either way; this only loses the emails.
      console.error(`Failed to send confirmation emails for order ${shortCode}`, err)
    }
  })

  // Advertising identifiers, saved for later.
  //
  // The Purchase conversion is no longer reported here - it fires when the
  // order reaches 'confirmed', minutes later, from the admin panel. By then
  // the customer's browser is gone, so anything that ties the conversion back
  // to the ad click has to be captured now and stored on the order.
  //
  // Only present when the visitor accepted cookies; the tags that write these
  // do not run otherwise.
  const hdrs = await headers()

  // First-party visitor/session/arrival ids and last-touch click ids/UTMs -
  // all read from cookies written client-side by utils/attribution/ids.ts,
  // never trusted from the browser's form submission. Last-touch, not
  // first-touch: attribution_sessions (20260906100000) keeps both, but the
  // order itself records the touch responsible for the visit that actually
  // converted - see the migration's own note for why.
  let lastTouch: Record<string, string | undefined> = {}
  try {
    const raw = jar.get('uksofashop_lt')?.value
    if (raw) lastTouch = JSON.parse(raw)
  } catch {
    // Malformed cookie. Nothing to recover; the order still places fine.
  }

  const admin = createAdminClient()

  // The session ledger is a server-side fallback for operational context that
  // may not live in the consent-gated last-touch cookie (notably landing page
  // and referrer). Current request cookies remain the first choice.
  const currentVisitorId = jar.get('uksofashop_vid')?.value ?? null
  const currentSessionId = jar.get('uksofashop_sid')?.value ?? null
  const currentArrivalId = jar.get('uksofashop_aid')?.value ?? null

  let sessionEvidence: {
    gclid: string | null
    gbraid: string | null
    wbraid: string | null
    fbclid: string | null
    last_touch_source: string | null
    last_touch_medium: string | null
    last_touch_campaign: string | null
    last_touch_content: string | null
    last_touch_term: string | null
    ga_client_id: string | null
    meta_fbp: string | null
    meta_fbc: string | null
    landing_page: string | null
    referrer: string | null
  } | null = null

  if (currentArrivalId) {
    const { data: evidence, error: evidenceError } = await admin
      .from('attribution_sessions')
      .select('gclid, gbraid, wbraid, fbclid, last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_term, ga_client_id, meta_fbp, meta_fbc, landing_page, referrer')
      .eq('arrival_id', currentArrivalId)
      .maybeSingle()
    if (evidenceError) {
      console.error(`Could not read checkout attribution arrival for order ${shortCode}`, evidenceError)
    } else {
      sessionEvidence = evidence
    }
  }

  let linkedWhatsAppReference: string | null = null


  const retireWhatsAppReferenceCookie = () => {
    try {
      jar.set(WHATSAPP_REFERENCE_COOKIE, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.VERCEL_ENV === 'production',
      })
    } catch {
      // Database state is authoritative; cookie cleanup is best-effort hygiene.
    }
  }

  const rawWhatsAppReference = jar.get(WHATSAPP_REFERENCE_COOKIE)?.value
  if (rawWhatsAppReference) {
    if (!isValidWhatsAppReference(rawWhatsAppReference)) {
      retireWhatsAppReferenceCookie()
    } else {
      const candidateReference = rawWhatsAppReference.trim().toUpperCase()
      const { data: enquiry, error: enquiryError } = await admin
        .from('whatsapp_enquiries')
        .select('reference, created_at, visitor_id, product_id, variant_id, converted_order_id')
        .eq('reference', candidateReference)
        .maybeSingle()

      if (enquiryError) {
        console.error(`Could not read WhatsApp enquiry ${candidateReference}`, enquiryError)
      } else if (!enquiry) {
        retireWhatsAppReferenceCookie()
      } else {
        const createdAtMs = Date.parse(enquiry.created_at)
        const ageMs = Date.now() - createdAtMs
        const stale =
          !Number.isFinite(createdAtMs) ||
          ageMs < 0 ||
          ageMs > WHATSAPP_REFERENCE_MAX_AGE_S * 1000
        const wrongVisitor =
          !currentVisitorId ||
          !enquiry.visitor_id ||
          enquiry.visitor_id !== currentVisitorId
        const permanentlyAmbiguousProduct = Boolean(enquiry.product_id && !enquiry.variant_id)

        if (stale || enquiry.converted_order_id || wrongVisitor || permanentlyAmbiguousProduct) {
          retireWhatsAppReferenceCookie()
        } else if (isDeterministicCheckoutWhatsAppMatch({
          visitorId: currentVisitorId,
          cartVariantIds: validatedItems.data.map(item => item.variant_id),
          enquiry,
          maxAgeSeconds: WHATSAPP_REFERENCE_MAX_AGE_S,
        })) {
          const linkedAt = new Date().toISOString()
          const { data: claimed, error: claimError } = await admin
            .from('whatsapp_enquiries')
            .update({ converted_order_id: order.id, converted_at: linkedAt })
            .eq('reference', candidateReference)
            .is('converted_order_id', null)
            .select('reference')

          if (claimError) {
            console.error(`Could not link WhatsApp enquiry ${candidateReference} to order ${shortCode}`, claimError)
          } else if (claimed?.length === 1) {
            linkedWhatsAppReference = candidateReference
          }
        }
      }
    }
  }

  const attribution = {
    ga_client_id:
      jar.get('_ga')?.value ?? sessionEvidence?.ga_client_id ?? null,
    meta_fbp:
      jar.get('_fbp')?.value ?? sessionEvidence?.meta_fbp ?? null,
    meta_fbc:
      jar.get('_fbc')?.value ?? metaFbcFromTouch(lastTouch) ??
      sessionEvidence?.meta_fbc ?? null,
    // Meta requires client_user_agent for website events, and the IP
    // materially improves match quality. They have to be taken from THIS
    // request: at confirmation time the only headers available belong to the
    // admin, and sending those would attribute the sale to their device.
    customer_user_agent: hdrs.get('user-agent'),
    customer_ip:
      hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
      hdrs.get('x-real-ip') ||
      null,

    visitor_id: currentVisitorId,
    session_id: currentSessionId,
    arrival_id: currentArrivalId,

    gclid: lastTouch.gclid ?? sessionEvidence?.gclid ?? null,
    gbraid: lastTouch.gbraid ?? sessionEvidence?.gbraid ?? null,
    wbraid: lastTouch.wbraid ?? sessionEvidence?.wbraid ?? null,
    fbclid: lastTouch.fbclid ?? sessionEvidence?.fbclid ?? null,

    utm_source:
      lastTouch.source ?? sessionEvidence?.last_touch_source ?? null,
    utm_medium:
      lastTouch.medium ?? sessionEvidence?.last_touch_medium ?? null,
    utm_campaign:
      lastTouch.campaign ?? sessionEvidence?.last_touch_campaign ?? null,
    utm_content:
      lastTouch.content ?? sessionEvidence?.last_touch_content ?? null,
    utm_term:
      lastTouch.term ?? sessionEvidence?.last_touch_term ?? null,

    landing_page: lastTouch.landingPage ?? sessionEvidence?.landing_page ?? null,
    referrer: lastTouch.referrer ?? sessionEvidence?.referrer ?? null,
    whatsapp_reference: linkedWhatsAppReference,
  }

  const hasAnyAttribution = Object.values(attribution).some(v => v !== null && v !== undefined)

  if (hasAnyAttribution) {
    // This must use service role. The checkout visitor is anonymous and the
    // orders table intentionally permits UPDATE only to authenticated admins;
    // the previous anon update was therefore rejected by RLS on every website
    // order even though place_order itself had succeeded.
    const { error: attrError } = await admin
      .from('orders')
      .update(attribution)
      .eq('id', order.id)

    if (attrError) {
      console.error(`Could not store attribution ids for order ${shortCode}`, attrError)

      // The enquiry was claimed first to prevent two orders racing for it. If
      // the corresponding order update fails, release only our own claim so
      // the database cannot be left saying the enquiry converted to an order
      // that does not carry the same reference.
      if (linkedWhatsAppReference) {
        const { error: rollbackError } = await admin
          .from('whatsapp_enquiries')
          .update({ converted_order_id: null, converted_at: null })
          .eq('reference', linkedWhatsAppReference)
          .eq('converted_order_id', order.id)
        if (rollbackError) {
          console.error(`Could not release WhatsApp claim ${linkedWhatsAppReference}`, rollbackError)
        }
      }
    } else if (linkedWhatsAppReference) {
      retireWhatsAppReferenceCookie()
    }

    const { error: actionError } = await admin.from('attribution_actions').insert({
      visitor_id: attribution.visitor_id,
      session_id: attribution.session_id,
      arrival_id: attribution.arrival_id,
      action_type: 'order_placed',
      order_id: order.id,
      whatsapp_reference: attrError ? null : linkedWhatsAppReference,
    })
    if (actionError) {
      console.error(`Could not write attribution_actions row for order ${shortCode}`, actionError)
    }
  }

  return { success: true, orderId: shortCode, total: Number(order.total_amount) }
}
