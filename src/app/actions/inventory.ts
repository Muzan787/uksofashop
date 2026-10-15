// src/app/actions/inventory.ts
'use server'
//
// Hide a product from the shop, or show it again. Adding, editing, copying
// and deleting moved to the product editor and app/actions/catalogue.ts
// (admin upgrade K2-K3), which save through save_product() in one database
// transaction.

import { createClient } from '@/utils/supabase/server'
import { revalidatePath, updateTag } from 'next/cache'
import { requireAdmin } from '@/utils/auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function setShown(formData: FormData, shown: boolean) {
  await requireAdmin()

  const productId = formData.get('productId')
  if (typeof productId !== 'string' || !UUID.test(productId)) return

  const supabase = await createClient()
  const { error } = await supabase.from('products').update({ is_active: shown }).eq('id', productId)
  if (error) throw new Error(shown ? 'Failed to show the product.' : 'Failed to hide the product.')

  revalidatePath('/admin/inventory', 'layout')
  revalidatePath('/admin/catalogue')
  revalidatePath('/admin')
  // The cached storefront reads (homepage, product pages) pick the change up
  // now rather than at their five-minute mark.
  updateTag('home')
  updateTag('product')
  revalidatePath('/', 'layout')
}

/** Hides a product from the shop. (Named for what it once did; it never deleted.) */
export async function deleteProduct(formData: FormData) {
  await requireAdmin()
  await setShown(formData, false)
}

export async function activateProduct(formData: FormData) {
  await requireAdmin()
  await setShown(formData, true)
}
