// src/app/actions/reviews.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
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

  const { error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      product_id: productId || null,
      rating,
      comment,
      image_url: imageUrl,
      is_approved: false 
    })

  if (error) {
    console.error(error);
    return { error: 'Failed to submit review. Please try again.' }
  }

  try {
    await sendAdminReviewNotification(user.email || 'Unknown User', rating, comment, imageUrl);
  } catch (emailErr) {
    console.error("Failed to send review notification email", emailErr);
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function approveReview(formData: FormData) {
  // Use the Service Role Key to bypass RLS for the update
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const reviewId = formData.get('reviewId') as string

  const { error } = await supabaseAdmin
    .from('reviews')
    .update({ is_approved: true }) 
    .eq('id', reviewId)

  if (error) throw new Error('Failed to approve review')

  revalidatePath('/admin/reviews')
  revalidatePath('/', 'layout') 
}

export async function deleteReview(formData: FormData) {
  // Use the Service Role Key to bypass RLS for the deletion
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const reviewId = formData.get('reviewId') as string

  const { error } = await supabaseAdmin
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw new Error('Failed to delete review')

  revalidatePath('/admin/reviews')
  revalidatePath('/', 'layout') 
}