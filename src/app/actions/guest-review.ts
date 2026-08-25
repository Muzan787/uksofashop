// src/app/actions/guest-review.ts
'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReviewToken } from '@/utils/reviewToken'
import { rateLimit, callerKey } from '@/utils/rateLimit'

/**
 * Accepts a review from someone who bought as a guest.
 *
 * The signed token is the authorisation. It is verified here, in the server
 * action, where the secret lives - the row is then written with the service
 * role because there is no session to satisfy RLS against.
 *
 * That is the same pattern the newsletter double opt-in uses: a signed value
 * the customer cannot forge, checked before any privileged write. The token is
 * never trusted for anything except identifying which order and product it
 * refers to, and the database's unique index on (order_id, product_id) is what
 * stops a link being replayed.
 */

const schema = z.object({
  rating: z.coerce.number().int().min(1, 'Please choose a rating.').max(5),
  comment: z.string().trim().max(4000).optional().default(''),
  customerName: z.string().trim().max(80).optional().default(''),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
})

export async function submitGuestReview(token: string, formData: FormData) {
  const verified = verifyReviewToken(token)
  if (!verified) {
    return { error: 'That review link is not valid. Please use the link from your email.' }
  }

  const limit = rateLimit(callerKey(await headers(), 'guest-review'), 10, 60 * 60 * 1000)
  if (!limit.ok) {
    return { error: 'Too many attempts. Please try again shortly.' }
  }

  const parsed = schema.safeParse({
    rating: formData.get('rating'),
    comment: formData.get('comment') ?? '',
    customerName: formData.get('customerName') ?? '',
    imageUrl: formData.get('imageUrl') ?? '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createAdminClient()

  // The token proves the pairing is signed, not that the order exists or was
  // delivered. Check that here rather than assuming.
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, customer_name')
    .eq('id', verified.orderId)
    .maybeSingle()

  if (!order) {
    return { error: 'We could not find that order.' }
  }
  if (order.status === 'cancelled') {
    return { error: 'That order was cancelled, so it cannot be reviewed.' }
  }

  const { error } = await supabase.from('reviews').insert({
    order_id: verified.orderId,
    product_id: verified.productId,
    // Null: a guest has no auth user. The order_id is what makes this
    // reviewer verifiable.
    user_id: null,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    image_url: parsed.data.imageUrl || null,
    customer_name: parsed.data.customerName || order.customer_name || null,
    // Held for moderation like every other review.
    is_approved: false,
  })

  if (error) {
    // 23505 is the unique violation on (order_id, product_id).
    if (error.code === '23505') {
      return { error: 'You have already reviewed this item — thank you!' }
    }
    console.error('Guest review insert failed:', error.message)
    return { error: 'We could not save your review. Please try again.' }
  }

  return { success: true }
}
