'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { sendSwatchConfirmation, sendAdminSwatchNotification } from '@/utils/email'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import { rateLimit, callerKey } from '@/utils/rateLimit'

/**
 * Three fabric samples, posted free.
 *
 * The three-at-a-time rule is enforced in the database rather than here - both
 * in request_swatches() and again by a constraint trigger on the rows - because
 * a limit that only exists in a form is a limit that exists until somebody
 * opens the network tab.
 *
 * There is no per-customer cap on how often somebody may ask. That is a
 * deliberate choice: every request gets a phone call before anything is posted,
 * so a person sees each one before it costs a stamp. The rate limit below is
 * only there to stop a script emptying the sample drawer overnight.
 */

const schema = z.object({
  customerName: z.string().min(2, 'Please enter your full name.'),
  customerEmail: z.string().email('Please provide a valid email address.'),
  // Optional, but validated when given - we ring before posting, and a number
  // that cannot be dialled is worse than no number at all.
  customerPhone: z.string().refine(v => v === '' || isValidUkMobile(v), UK_MOBILE_ERROR),
  postcode: z.string().min(5, 'Please enter a valid UK postcode.'),
  shippingAddress: z.string().min(10, 'Please give the full address to post these to.'),
  fabricIds: z.array(z.string().uuid()).min(1, 'Choose at least one fabric.').max(3, 'Three samples at a time.'),
})

export interface SwatchResult {
  success?: true
  error?: string
}

export async function requestSwatches(input: unknown): Promise<SwatchResult> {
  const limit = rateLimit(callerKey(await headers(), 'swatch'), 5, 60 * 60 * 1000)
  if (!limit.ok) {
    return { error: 'That is a lot of sample requests. Give us a ring on 07476 616022 and we will sort it out.' }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { customerName, customerEmail, customerPhone, postcode, shippingAddress, fabricIds } = parsed.data

  const hdrs = await headers()
  const supabase = await createClient()

  const { error } = await supabase.rpc('request_swatches', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone || '',
    p_postcode: postcode,
    p_shipping_address: shippingAddress,
    p_fabric_ids: fabricIds,
    p_ip:
      hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
      hdrs.get('x-real-ip') ||
      undefined,
    p_user_agent: hdrs.get('user-agent') ?? undefined,
  })

  if (error) {
    const message = error.message ?? ''
    if (message.includes('SWATCH_LIMIT')) return { error: 'Three samples at a time.' }
    if (message.includes('NO_SWATCHES')) return { error: 'Choose at least one fabric.' }
    if (message.includes('UNAVAILABLE_FABRIC')) {
      return { error: 'One of those fabrics is no longer available. Please pick another.' }
    }
    console.error('Swatch request failed:', error)
    return { error: 'We could not send that request. Please try again, or call us on 07476 616022.' }
  }

  // The names as the customer chose them. Read back rather than trusted from
  // the browser, so the picking list and the codes on it are the database's.
  const { data: chosen } = await supabase
    .from('fabrics')
    .select('code, name, fabric_collections(name)')
    .in('id', fabricIds)

  const items = (chosen ?? []).map(f => ({
    code: f.code,
    name: f.name,
    collection:
      (f.fabric_collections as unknown as { name: string } | null)?.name ?? '',
  }))

  // After the response, exactly as placeOrder does it: the request is already
  // recorded, so a slow mail server delays a notification rather than the
  // confirmation the customer is waiting to see.
  after(async () => {
    try {
      await Promise.all([
        sendSwatchConfirmation(customerEmail, customerName, items),
        sendAdminSwatchNotification(
          customerName, customerEmail, customerPhone, postcode, shippingAddress, items,
        ),
      ])
    } catch (err) {
      console.error('Failed to send swatch emails', err)
    }
  })

  return { success: true }
}
