// src/app/actions/reviews.ts
'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth'
import { sendAdminReviewNotification } from '@/utils/email'

/**
 * A review of a product, from anyone.
 *
 * This used to refuse everybody without a session. For a shop with a handful
 * of reviews that gate is the whole problem: the people most likely to write
 * one are the people who bought as guests, and they are exactly the ones it
 * turned away. Reviews are now open, and the four things that made the gate
 * unnecessary are all still here:
 *
 *   · nothing reaches the storefront unapproved — is_approved is false on the
 *     way in, and only the admin panel can flip it;
 *   · a rate limit per caller, so a script cannot fill the moderation queue;
 *   · every field is validated and length-capped before it is written;
 *   · a guest review carries no order_id, so it can never show the Verified
 *     buyer mark. That badge still means what it says — see Reviews.tsx.
 *
 * A signed-in reviewer still writes through their own session, so RLS applies
 * to them exactly as it did before. Only the guest path uses the service role,
 * because there is no session for a policy to check against, and it writes a
 * fixed set of validated columns and nothing else.
 */

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Please choose a rating.').max(5),
  comment: z.string().trim().min(1, 'Please write a few words.').max(4000),
  customerName: z.string().trim().max(80).optional().default(''),
  productId: z.string().uuid().nullish(),
})

/**
 * Photos are accepted only from a signed-in reviewer, and only from our own
 * media host.
 *
 * uploadToCloudinary still requires a session, so a guest cannot produce one
 * of these URLs — but imageUrl arrives as an argument from the browser rather
 * than from that action, so it is checked here rather than trusted.
 */
function safeImageUrl(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    if (url.hostname !== 'res.cloudinary.com') return null
    return url.toString().slice(0, 500)
  } catch {
    return null
  }
}

export async function submitGlobalReview(formData: FormData, imageUrl: string | null = null) {
  // Before anything else, and by caller rather than by account: an open
  // endpoint that writes rows needs a ceiling that does not depend on who is
  // asking. Five an hour is far more than a person leaves and far less than a
  // script wants.
  const limit = rateLimit(callerKey(await headers(), 'review'), 5, 60 * 60 * 1000)
  if (!limit.ok) {
    return { error: 'Thanks — that is several reviews already. Please try again a little later.' }
  }

  const parsed = reviewSchema.safeParse({
    rating: formData.get('rating'),
    comment: formData.get('comment') ?? '',
    customerName: formData.get('customerName') ?? '',
    productId: formData.get('productId') || null,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const customerName = user
    ? (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split('@')[0] : 'Customer')
    )
    : (parsed.data.customerName || 'Anonymous')

  // A session writes through its own client so the row is still subject to
  // RLS. Only a guest needs the service role.
  const db = user ? supabase : createAdminClient()

  const { error } = await db.from('reviews').insert({
    user_id: user?.id ?? null,
    customer_name: customerName,
    product_id: parsed.data.productId || null,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    // Only a signed-in reviewer can have produced one of these.
    image_url: user ? safeImageUrl(imageUrl) : null,
    // No order behind it, so no Verified buyer mark. The tokenised link in the
    // delivery email is the only route that sets one — see guest-review.ts.
    order_id: null,
    is_approved: false,
  })

  if (error) {
    console.error('Review insert failed:', error.message)
    return { error: 'Failed to submit review. Please try again.' }
  }

  try {
    await sendAdminReviewNotification(
      user?.email || `Guest — ${customerName}`,
      parsed.data.rating,
      parsed.data.comment,
      user ? safeImageUrl(imageUrl) : null,
    )
  } catch (emailErr) {
    console.error('Failed to send review notification email', emailErr)
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function approveReview(formData: FormData) {
  // Previously this used SUPABASE_SERVICE_ROLE_KEY with no caller check, which
  // let anyone who could reach the action ID publish reviews on the storefront.
  // The cookie-bound client plus the admin RLS policies now do the work.
  await requireAdmin()

  const supabase = await createClient()
  const reviewId = formData.get('reviewId') as string
  if (!reviewId) throw new Error('Missing review ID')

  const { error } = await supabase
    .from('reviews')
    .update({ is_approved: true })
    .eq('id', reviewId)

  if (error) throw new Error('Failed to approve review')

  revalidatePath('/admin/reviews')
  revalidatePath('/', 'layout')
}

export async function deleteReview(formData: FormData) {
  await requireAdmin()

  const supabase = await createClient()
  const reviewId = formData.get('reviewId') as string
  if (!reviewId) throw new Error('Missing review ID')

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw new Error('Failed to delete review')

  revalidatePath('/admin/reviews')
  revalidatePath('/', 'layout')
}
