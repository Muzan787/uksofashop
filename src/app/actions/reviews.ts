// src/app/actions/reviews.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

// 1. Define the Review Schema
const reviewSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters.'),
  rating: z.number().int().min(1, 'Rating must be at least 1.').max(5, 'Rating cannot exceed 5.'),
  comment: z.string().min(5, 'Review comment must be at least 5 characters long.'),
})

// --- NEW FUNCTION TO ADD ---
export async function submitReview(formData: FormData, productId: string) {
  const supabase = await createClient()
  
// 2. Extract and Parse
  const rawData = {
    customerName: formData.get('customerName'),
    rating: parseInt(formData.get('rating') as string, 10),
    comment: formData.get('comment'),
  }

  const validatedData = reviewSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  // 3. Insert using safe data
  const { customerName, rating, comment } = validatedData.data

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