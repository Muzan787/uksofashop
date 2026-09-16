// src/app/api/checkout/recovery/route.ts
//
// Explicit abandoned-checkout reminder opt-in. This endpoint is deliberately
// separate from checkout telemetry: telemetry never accepts form values; this
// route accepts only the contact channel(s) the shopper actively selected.

import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { isValidUkMobile } from '@/utils/phone'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { isProductionRequestHost } from '@/utils/trackingEnv'

export const dynamic = 'force-dynamic'

const itemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  fabric_id: z.string().uuid().nullable().optional(),
}).strict()

const schema = z.object({
  emailOptIn: z.boolean(),
  whatsappOptIn: z.boolean(),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(32).optional(),
  basket: z.array(itemSchema).min(1).max(20),
}).strict()

const joinKey = z.string().uuid()
const noContent = (status: number) => new NextResponse(null, { status })

type VariantSnapshotRow = {
  id: string
  sku: string
  color: string | null
  material: string | null
  price_adjustment: number | null
  products: {
    id: string
    title: string
    base_price: number
  } | null
}

type FabricSnapshotRow = {
  id: string
  code: string
  name: string
  fabric_collections: { name: string } | null
}

export async function POST(request: Request) {
  const hdrs = await headers()
  if (!isProductionRequestHost(hdrs.get('host'))) return noContent(204)

  const limit = rateLimit(callerKey(hdrs, 'checkout-recovery'), 40, 60 * 1000)
  if (!limit.ok) return noContent(429)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reminder preferences.' }, { status: 400 })
  }

  const jar = await cookies()
  const visitorId = joinKey.safeParse(jar.get('uksofashop_vid')?.value)
  const sessionId = joinKey.safeParse(jar.get('uksofashop_sid')?.value)
  const arrivalId = joinKey.safeParse(jar.get('uksofashop_aid')?.value)
  if (!visitorId.success || !sessionId.success || !arrivalId.success) {
    return NextResponse.json({ error: 'Please refresh checkout and try again.' }, { status: 409 })
  }

  const v = parsed.data
  // This route is the only storefront owner of checkout_recovery_leads. The
  // table was added by today's migration and is not in the checked-in generated
  // Database type yet, so this one server-only route uses the scoped untyped
  // service-role client. Product/fabric reads below are still validated into
  // the narrow snapshot shapes declared above.
  const admin = createUntypedAdminClient()

  // Unticking both channels is an immediate opt-out. If no row exists this is
  // simply a no-op; if one does, erase the duplicate contact/basket data now.
  if (!v.emailOptIn && !v.whatsappOptIn) {
    await admin
      .from('checkout_recovery_leads')
      .update({
        status: 'unsubscribed',
        email: null,
        phone: null,
        email_opt_in: false,
        whatsapp_opt_in: false,
        basket: [],
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId.data)

    return NextResponse.json({ success: true, active: false })
  }

  const email = v.email?.trim().toLowerCase() ?? ''
  const phone = v.phone?.trim() ?? ''

  if (v.emailOptIn && !z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: 'Enter a valid email address before choosing email reminders.' }, { status: 400 })
  }
  if (v.whatsappOptIn && !isValidUkMobile(phone)) {
    return NextResponse.json({ error: 'Enter a valid UK mobile number before choosing WhatsApp reminders.' }, { status: 400 })
  }

  // Product details are resolved from Supabase rather than trusted from the
  // browser. This gives the recovery sheet a useful snapshot (title, SKU,
  // colour/fabric, quantity and price at the time) without making recovery data
  // an order or discount authority.
  const variantIds = [...new Set(v.basket.map(item => item.variant_id))]
  const fabricIds = [...new Set(v.basket.map(item => item.fabric_id).filter((id): id is string => Boolean(id)))]

  const { data: rawVariants, error: variantError } = await admin
    .from('product_variants')
    .select('id, sku, color, material, price_adjustment, products!inner(id, title, base_price)')
    .in('id', variantIds)

  if (variantError) {
    console.error(`checkout recovery product lookup failed: ${variantError.message}`)
    return NextResponse.json({ error: 'Could not save that reminder preference. Please try again.' }, { status: 500 })
  }

  let rawFabrics: unknown[] = []
  if (fabricIds.length > 0) {
    const { data, error } = await admin
      .from('fabrics')
      .select('id, code, name, fabric_collections(name)')
      .in('id', fabricIds)

    if (error) {
      console.error(`checkout recovery fabric lookup failed: ${error.message}`)
      return NextResponse.json({ error: 'Could not save that reminder preference. Please try again.' }, { status: 500 })
    }
    rawFabrics = data ?? []
  }

  const variants = (rawVariants ?? []) as unknown as VariantSnapshotRow[]
  const fabrics = rawFabrics as FabricSnapshotRow[]
  const variantById = new Map(variants.map(row => [row.id, row]))
  const fabricById = new Map(fabrics.map(row => [row.id, row]))

  const basket = v.basket.map(item => {
    const variant = variantById.get(item.variant_id)
    const product = variant?.products ?? null
    const fabric = item.fabric_id ? fabricById.get(item.fabric_id) ?? null : null
    const unitPrice = product
      ? Number(product.base_price) + Number(variant?.price_adjustment ?? 0)
      : null

    return {
      product_title: product?.title ?? null,
      product_id: product?.id ?? null,
      variant_id: item.variant_id,
      sku: variant?.sku ?? null,
      color: variant?.color ?? null,
      material: variant?.material ?? null,
      fabric_id: item.fabric_id ?? null,
      fabric_name: fabric?.name ?? null,
      fabric_code: fabric?.code ?? null,
      fabric_collection: fabric?.fabric_collections?.name ?? null,
      quantity: item.quantity,
      unit_price_gbp: unitPrice,
    }
  })

  const now = new Date()
  const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const { error } = await admin.from('checkout_recovery_leads').upsert({
    visitor_id: visitorId.data,
    session_id: sessionId.data,
    arrival_id: arrivalId.data,
    email: v.emailOptIn ? email : null,
    phone: v.whatsappOptIn ? phone : null,
    email_opt_in: v.emailOptIn,
    whatsapp_opt_in: v.whatsappOptIn,
    consent_at: now.toISOString(),
    consent_copy_version: '2026-09-16-v1',
    basket,
    status: 'active',
    converted_order_id: null,
    expires_at: expires.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: 'session_id' })

  if (error) {
    console.error(`checkout recovery opt-in failed: ${error.message}`)
    return NextResponse.json({ error: 'Could not save that reminder preference. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, active: true })
}
