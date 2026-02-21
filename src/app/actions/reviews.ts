// src/app/actions/reviews.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveReview(formData: FormData) {
  const supabase = await createClient()
  const reviewId = formData.get('reviewId') as string

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'approved' })
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

// --- NEW FUNCTION TO ADD ---
export async function submitReview(formData: FormData, productId: string) {
  const supabase = await createClient()
  
  const customerName = formData.get('customerName') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const comment = formData.get('comment') as string

  if (!customerName || !rating) {
    return { error: 'Name and rating are required.' }
  }

  const { error } = await supabase
    .from('reviews')
    .insert({
      product_id: productId,
      customer_name: customerName,
      rating,
      comment,
      status: 'pending' // Requires admin approval
    })

  if (error) {  
    return { error: 'Failed to submit review. Please try again.' }
  }

  return { success: true }
}