'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { sendContactNotification } from '@/utils/email'
import { rateLimit, callerKey } from '@/utils/rateLimit'

/**
 * The honeypot field.
 *
 * Rendered in the form but hidden from people, so a human never fills it in.
 * Bots fill every input they find, so anything arriving with a value here is
 * automated. We return success rather than an error - telling a bot it was
 * detected just invites it to adapt.
 */
const HONEYPOT_FIELD = 'company_website'

const schema = z.object({
  firstName: z.string().trim().min(1, 'Please tell us your first name.').max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email('Please provide a valid email address.').max(200),
  orderNumber: z.string().trim().max(40).optional().default(''),
  message: z
    .string()
    .trim()
    .min(10, 'Please give us a little more detail so we can help.')
    .max(4000, 'That message is too long - please shorten it or call us.'),
})

export async function submitContactForm(formData: FormData) {
  // Silently accepted and dropped. See HONEYPOT_FIELD above.
  if ((formData.get(HONEYPOT_FIELD) as string | null)?.trim()) {
    return { success: true }
  }

  // Three messages per ten minutes per IP. Generous for a person who sends a
  // follow-up, restrictive for a loop. This endpoint sends mail through a
  // mailbox with a daily cap that order confirmations also depend on.
  const limit = rateLimit(callerKey(await headers(), 'contact'), 3, 10 * 60 * 1000)
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60))
    return {
      error: `You have sent several messages already. Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} and try again, or call us on 07476 616022.`,
    }
  }

  const parsed = schema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName') ?? '',
    email: formData.get('email'),
    orderNumber: formData.get('orderNumber') ?? '',
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { firstName, lastName, email, orderNumber, message } = parsed.data

  try {
    await sendContactNotification(
      `${firstName} ${lastName}`.trim(),
      email,
      orderNumber,
      message,
    )
    return { success: true }
  } catch (error) {
    console.error('Contact email error:', error)
    return { error: 'Failed to send message. Please try again later.' }
  }
}
