// src/app/actions/leads.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { sendCheckoutReminder } from '@/utils/email'

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

export type SendReminderState =
  | { status: 'idle' }
  | { status: 'sent' }
  | { status: 'error'; message: string }

/**
 * Send the reminder email to a lead, from the page, without a mail app.
 *
 * Returns its result rather than throwing, unlike setLeadDone: this one is
 * driven by useActionState so the card can say "Sent" or show why it was not,
 * where a thrown error would land on the site's error page mid-list.
 */
export async function sendLeadReminderEmail(
  _prev: SendReminderState,
  formData: FormData,
): Promise<SendReminderState> {
  await requireAdmin()

  const id = formData.get('id')
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { status: 'error', message: 'Missing or invalid lead id' }
  }

  const admin = createUntypedAdminClient()
  const { data, error } = await admin
    .from('checkout_recovery_leads')
    .select('email, email_opt_in, basket, status')
    .eq('id', id)
    .maybeSingle()

  if (error) return { status: 'error', message: error.message }

  const lead = data as { email: string | null; email_opt_in: boolean; basket: unknown; status: string } | null
  // Converted and unsubscribed rows have had their email cleared, and a row
  // without the email tick never had it - either way there is nothing to send to.
  if (!lead || !['active', 'done'].includes(lead.status) || !lead.email_opt_in || !lead.email) {
    return { status: 'error', message: 'This lead did not ask for an email reminder.' }
  }

  try {
    await sendCheckoutReminder(lead.email, lead.basket)
  } catch (err) {
    console.error(`lead reminder email failed: ${err instanceof Error ? err.message : String(err)}`)
    return { status: 'error', message: 'The email could not be sent. Try again in a moment.' }
  }

  const { error: stampError } = await admin
    .from('checkout_recovery_leads')
    .update({ reminder_emailed_at: new Date().toISOString() })
    .eq('id', id)
  // The email has gone either way; a failed stamp only means the card will
  // not say so, which is worth logging but not worth reporting as a failure.
  if (stampError) console.error(`lead reminder stamp failed: ${stampError.message}`)

  revalidatePath('/admin/leads')
  return { status: 'sent' }
}
