// src/app/actions/newsletter.ts
'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendNewsletterConfirmation } from '@/utils/email'
import { z } from 'zod'

const emailSchema = z.string().trim().toLowerCase().email().max(254)

/**
 * Always the same wording, whatever happened underneath. Whether the address
 * was new, already pending, already confirmed or throttled, the visitor sees
 * one message - otherwise this form becomes a way to test who is on the list.
 */
const GENERIC_SUCCESS =
  'Almost there — check your inbox and click the link to confirm. It should arrive within a minute.'

export async function subscribeToNewsletter(email: string) {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) {
    return { error: 'Please enter a valid email address.' }
  }

  const supabase = createAdminClient()

  // Recorded as evidence that consent was given, and when - UK GDPR expects us
  // to be able to produce this per subscriber.
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  const userAgent = h.get('user-agent')

  const { data, error } = await supabase.rpc('newsletter_subscribe', {
    p_email: parsed.data,
    p_ip: ip ?? undefined,
    p_user_agent: userAgent ?? undefined,
  })

  if (error) {
    console.error('Newsletter subscribe error:', error.message)
    return { error: 'We could not sign you up just now. Please try again in a moment.' }
  }

  const result = data as unknown as {
    outcome: string
    email?: string
    confirm_token?: string
  }

  if (result.outcome === 'invalid_email') {
    return { error: 'Please enter a valid email address.' }
  }

  // Sent after the response so a slow mail server doesn't hold up the form.
  if (result.outcome === 'confirmation_required' && result.confirm_token && result.email) {
    const to = result.email
    const token = result.confirm_token
    after(async () => {
      try {
        await sendNewsletterConfirmation(to, token)
      } catch (err) {
        console.error('Failed to send newsletter confirmation', err)
      }
    })
  }

  // 'already_confirmed' and 'throttled' fall through to the same message on
  // purpose - see GENERIC_SUCCESS above.
  return { success: true, message: GENERIC_SUCCESS }
}
