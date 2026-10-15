// src/app/actions/leads.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { sendCheckoutReminder } from '@/utils/email'
import { offerHoldsForLeads } from '@/utils/offers/leadHold'

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

  // The admin's own session. RLS admits admins to read the leads and to
  // change status and done_at - nothing else; the reminder stamp moves only
  // through claim_lead_reminder() - so the database checks this write as
  // well as requireAdmin() above.
  const supabase = await createClient()

  // updated_at is left alone on purpose: it records the shopper's last action,
  // which is what "2 hours ago" on the card means. done_at records ours.
  const { error } = await supabase
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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checkout_recovery_leads')
    .select('email, email_opt_in, basket, status, data_class, reference, visitor_id')
    .eq('id', id)
    .maybeSingle()

  if (error) return { status: 'error', message: error.message }

  const lead = data as {
    email: string | null
    email_opt_in: boolean
    basket: unknown
    status: string
    data_class: string
    reference: string
    visitor_id: string | null
  } | null
  // Converted and unsubscribed rows have had their email cleared, and a row
  // without the email tick never had it - either way there is nothing to send to.
  if (!lead || lead.data_class === 'qa_test' || !['active', 'done'].includes(lead.status) || !lead.email_opt_in || !lead.email) {
    return { status: 'error', message: 'This lead did not ask for an email reminder.' }
  }

  // Their online offer, if its 48 hours are still running - a true reason to come
  // back. Looked up at the moment of sending, so a reminder sent after the
  // window has closed says nothing about an offer.
  const hold = (await offerHoldsForLeads(supabase, [{ id, visitor_id: lead.visitor_id, basket: lead.basket }])).get(id)

  // Only ever once (admin upgrade I4), and the database decides: the claim
  // stamps the lead as emailed before anything is sent, and only if it had
  // never been. A second tap, a second tab or a second person gets
  // REMINDER_ALREADY_SENT and nothing goes.
  const { data: claimedAt, error: claimError } = await supabase.rpc('claim_lead_reminder', { p_id: id })
  if (claimError || !claimedAt) {
    revalidatePath('/admin/leads')
    const message = claimError?.message ?? ''
    if (message.includes('REMINDER_ALREADY_SENT')) return { status: 'error', message: 'This reminder has already been emailed. It only ever goes once.' }
    if (message.includes('NO_EMAIL_REMINDER')) return { status: 'error', message: 'This lead did not ask for an email reminder.' }
    console.error(`lead reminder claim failed: ${message}`)
    return { status: 'error', message: 'The email could not be sent. Try again in a moment.' }
  }

  try {
    // `id` is the validated uuid from the form, which is what the row was
    // looked up by — the select does not need to return it again.
    await sendCheckoutReminder(lead.email, lead.basket, id, lead.reference, hold && !hold.ended ? hold : null)
  } catch (err) {
    console.error(`lead reminder email failed: ${err instanceof Error ? err.message : String(err)}`)
    // Nothing went, so the claim is handed back and it can be tried again.
    const { error: releaseError } = await supabase.rpc('release_lead_reminder', { p_id: id, p_claimed_at: claimedAt })
    if (releaseError) console.error(`lead reminder release failed: ${releaseError.message}`)
    return { status: 'error', message: 'The email could not be sent. Try again in a moment.' }
  }

  revalidatePath('/admin/leads')
  return { status: 'sent' }
}
