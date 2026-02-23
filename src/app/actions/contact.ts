'use server'

import { sendContactNotification } from '@/utils/email'

export async function submitContactForm(formData: FormData) {
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const orderNumber = formData.get('orderNumber') as string
  const message = formData.get('message') as string

  if (!firstName || !email || !message) {
    return { error: 'Please fill in all required fields.' }
  }

  try {
    await sendContactNotification(
      `${firstName} ${lastName}`,
      email,
      orderNumber,
      message
    )
    return { success: true }
  } catch (error) {
    console.error('Contact email error:', error)
    return { error: 'Failed to send message. Please try again later.' }
  }
}