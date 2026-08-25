// src/app/actions/newsletter-confirm.ts
'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Confirming happens on POST, never on GET.
 *
 * Mail providers and security appliances routinely pre-fetch every link in an
 * email. If a GET confirmed the subscription, a scanner would confirm it on the
 * recipient's behalf and double opt-in would prove nothing. Requiring a real
 * button press keeps the proof of consent honest.
 */
export async function confirmNewsletter(formData: FormData) {
  const token = (formData.get('token') as string || '').trim()

  if (!/^[0-9a-fA-F-]{36}$/.test(token)) {
    redirect('/newsletter/confirm?status=invalid_token')
  }

  let status = 'error'
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('newsletter_confirm', { p_token: token })
    if (error) {
      console.error('Newsletter confirm error:', error.message)
    } else {
      const r = data as unknown as { outcome?: string }
      status = r.outcome ?? 'invalid_token'
    }
  } catch (err) {
    console.error('Newsletter confirm failed', err)
  }

  redirect(`/newsletter/confirm?status=${encodeURIComponent(status)}`)
}
