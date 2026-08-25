// src/app/actions/reviews.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth'
import { sendAdminReviewNotification } from '@/utils/email'

export async function submitGlobalReview(formData: FormData, imageUrl: string | null = null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to submit a review.' }
  }

  const rating = parseInt(formData.get('rating') as string, 10)
  const comment = formData.get('comment') as string
  const productId = formData.get('productId') as string | null

  if (!rating || rating < 1 || rating > 5) {
    return { error: 'Please provide a valid rating between 1 and 5.' }
  }

  // Extract the name from auth metadata, fallback to email prefix
  const customerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : 'Verified Buyer')

  const { error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      customer_name: customerName,
      product_id: productId || null,
      rating,
      comment,
      image_url: imageUrl,
      is_approved: false
    })

  if (error) {
    console.error(error)
    return { error: 'Failed to submit review. Please try again.' }
  }

  try {
    await sendAdminReviewNotification(user.email || 'Unknown User', rating, comment, imageUrl)
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
