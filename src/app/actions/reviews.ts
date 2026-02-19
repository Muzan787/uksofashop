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
  // Note: In a production app, you would also revalidate the specific product page here!
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
}