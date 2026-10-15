// src/app/actions/messages.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { leadsHref } from '@/utils/leadsTabs'

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'replied', 'closed']),
  show: z.enum(['all', '']).optional().default(''),
})

/**
 * Mark replied, Close without reply, or Mark as new (admin upgrade I2).
 * A plain form: it comes back to the Messages tab with a banner. The
 * database checks the caller is an admin and the state is one of the three.
 */
export async function setContactMessageStatus(formData: FormData) {
  await requireAdmin()

  const parsed = schema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
    show: formData.get('show') ?? '',
  })
  if (!parsed.success) redirect(leadsHref('messages', { error: 'bad-request' }))

  const { id, status, show } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_contact_message_status', { p_id: id, p_status: status })

  revalidatePath('/admin/leads')
  revalidatePath('/admin')
  if (error) {
    console.error('set_contact_message_status failed:', error.message)
    redirect(leadsHref('messages', { show, error: error.message.includes('NOT_FOUND') ? 'not-found' : 'failed' }))
  }
  redirect(leadsHref('messages', { show, done: status }))
}
