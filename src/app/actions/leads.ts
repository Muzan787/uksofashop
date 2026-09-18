// src/app/actions/leads.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'

/**
 * Tick a checkout-recovery lead off, or put it back.
 *
 * "Done" is bookkeeping - they bought on WhatsApp, or said no - so the row
 * keeps its contact and basket data and can be reopened from the Done view.
 * The 90-day expiry deletes it in the end, the same as before.
 *
 * Throws rather than returning, like the other admin actions: the form
 * discards the return value, so an error object would fail silently.
 */
export async function setLeadDone(formData: FormData) {
  await requireAdmin()

  const id = formData.get('id')
  const done = formData.get('done') === 'true'
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error('Missing or invalid lead id')
  }

  // The table is service-role only; the session client has no policy on it.
  // requireAdmin() above is the authorisation - this client is just the pen.
  const admin = createUntypedAdminClient()

  // updated_at is left alone on purpose: it records the shopper's last action,
  // which is what "2 hours ago" on the card means. done_at records ours.
  const { error } = await admin
    .from('checkout_recovery_leads')
    .update(
      done
        ? { status: 'done', done_at: new Date().toISOString() }
        : { status: 'active', done_at: null },
    )
    .eq('id', id)
    // Only between waiting and done. A converted or unsubscribed row has had
    // its contact data cleared and must not come back as an active lead.
    .in('status', ['active', 'done'])

  if (error) throw new Error(error.message)

  revalidatePath('/admin/leads')
  revalidatePath('/admin')
}
