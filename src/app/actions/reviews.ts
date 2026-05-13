// src/app/actions/reviews.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendAdminReviewNotification } from '@/utils/email'

export async function submitGlobalReview(formData: FormData, imageUrl: string | null = null) {
  const supabase = await createClient()
  
  // 1. Check Authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to submit a review.' }
  }

  // 2. Extract Data
  const rating = parseInt(formData.get('rating') as string, 10)
  const comment = formData.get('comment') as string
  const productId = formData.get('productId') as string | null

  if (!rating || rating < 1 || rating > 5) {
    return { error: 'Please provide a valid rating between 1 and 5.' }
  }

  // 3. Insert into Supabase
  const { error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      product_id: productId || null,
      rating,
      comment,
      image_url: imageUrl,
      is_approved: false // Defaulting to false for admin approval
    })

  if (error) {
    console.error(error);
    return { error: 'Failed to submit review. Please try again.' }
  }

  // 4. Send Admin Notification
  try {
    await sendAdminReviewNotification(user.email || 'Unknown User', rating, comment, imageUrl);
  } catch (emailErr) {
    console.error("Failed to send review notification email", emailErr);
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function approveReview(formData: FormData) {
  const supabase = await createClient()
  const reviewId = formData.get('reviewId') as string

  const { error } = await supabase
    .from('reviews')
    .update({ is_approved: true }) // Updated from status: 'approved'
    .eq('id', reviewId)

  if (error) throw new Error('Failed to approve review')

  revalidatePath('/admin/reviews')
  revalidatePath('/', 'layout') // Clears cache so it shows on product page
}

export async function deleteReview(formData: FormData) {
  const supabase = await createClient()
  const reviewId = formData.get('reviewId') as string

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw new Error('Failed to delete review')

  revalidatePath('/admin/reviews')
  revalidatePath('/', 'layout') 
}