// src/app/actions/swatch-admin.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth'

/**
 * Mark a swatch request posted, or cancel it.
 *
 * Throws rather than returning an error object, the same as updateOrderStatus:
 * the admin page discards this action's return value, so anything returned
 * would fail silently.
 */
export async function setSwatchStatus(formData: FormData) {
  await requireAdmin()

  const id = formData.get('id') as string
  const status = formData.get('status') as string

  if (!id || !['pending', 'posted', 'cancelled'].includes(status)) {
    throw new Error('Missing or invalid request id or status')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('swatch_requests')
    .update({
      status,
      // Stamped when it goes out and cleared if it comes back to pending, so
      // the date on screen is never left over from a previous state.
      posted_at: status === 'posted' ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/swatches')
}
