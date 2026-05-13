// src/app/actions/wishlist.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleWishlist(productId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to modify your wishlist.' }
  }

  // Check if it already exists
  const { data: existingItem } = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single()

  if (existingItem) {
    // Remove from wishlist
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', existingItem.id)
      
    if (error) return { error: 'Failed to remove from wishlist.' }
  } else {
    // Add to wishlist
    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: user.id,
        product_id: productId
      })
      
    if (error) return { error: 'Failed to add to wishlist.' }
  }

  // Revalidate to update UI instantly
  revalidatePath('/account')
  revalidatePath('/shop/[category]/[slug]', 'page')
  
  return { success: true, isWishlisted: !existingItem }
}