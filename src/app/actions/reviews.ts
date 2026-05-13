// src/app/actions/reviews.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
 
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

  revalidatePath('/reviews')
  return { success: true }
}