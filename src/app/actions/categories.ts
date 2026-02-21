// src/app/actions/categories.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCategory(formData: FormData, imageUrl: string) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  if (!name || !slug) return { error: 'Name and slug are required.' }

  const { error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      image_url: imageUrl || null,
    })

  if (error) {
    return { error: 'Failed to create category. Ensure the slug is unique.' }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/')
  return { success: true }
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient()
  const categoryId = formData.get('categoryId') as string

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    return { error: 'Failed to delete category. It might be linked to existing products.' }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/')
}