'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mail, MessageCircle } from 'lucide-react'
import { isValidUkMobile } from '@/utils/phone'

export interface RecoveryItem {
  variant_id: string
  quantity: number
  fabric_id?: string | null
}

export default function CheckoutRecoveryOptIn({
  email,
  phone,
  basket,
}: {
  email: string
  phone: string
  basket: RecoveryItem[]
}) {
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const lastPayload = useRef('')
  const hasEverOpted = useRef(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const phoneValid = isValidUkMobile(phone.trim())

  useEffect(() => {
    if (!emailOptIn && !whatsappOptIn && !hasEverOpted.current) return

    if (emailOptIn && !emailValid) {
      setStatus('error')
      setMessage('Enter a valid email address above to use email reminders.')
      return
    }
    if (whatsappOptIn && !phoneValid) {
      setStatus('error')
      setMessage('Enter a valid UK mobile number above to use WhatsApp reminders.')
      return
    }

    if (emailOptIn || whatsappOptIn) hasEverOpted.current = true

    const payload = JSON.stringify({
      emailOptIn,
      whatsappOptIn,
      email: email.trim(),
      phone: phone.trim(),
      basket,
    })
    if (payload === lastPayload.current) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setStatus('saving')
      setMessage('')
      try {
        const res = await fetch('/api/checkout/recovery', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          signal: controller.signal,
          keepalive: true,
        })
        const data = await res.json().catch(() => ({})) as { error?: string }
        if (!res.ok) throw new Error(data.error || 'Could not save reminder preference.')
        lastPayload.current = payload
        setStatus('saved')
        setMessage(emailOptIn || whatsappOptIn ? 'Reminder preference saved.' : 'Reminder preference removed.')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not save reminder preference.')
      }
    }, emailOptIn || whatsappOptIn ? 650 : 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [email, phone, basket, emailOptIn, whatsappOptIn, emailValid, phoneValid])

  return (
    <div className="rounded-sm border border-calico-300 bg-calico-100 px-4 py-3.5">
      <p className="m-0 text-body-sm font-semibold text-ink-900">
        Want us to remind you if you don&apos;t finish?
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm border border-calico-300 bg-calico-50 px-3 text-body-sm text-ink-900">
          <input
            type="checkbox"
            checked={whatsappOptIn}
            onChange={e => setWhatsappOptIn(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-ember-500"
          />
          <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-whatsapp" />
          WhatsApp reminder
        </label>

        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm border border-calico-300 bg-calico-50 px-3 text-body-sm text-ink-900">
          <input
            type="checkbox"
            checked={emailOptIn}
            onChange={e => setEmailOptIn(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-ember-500"
          />
          <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
          Email reminder
        </label>
      </div>

      <div className="mt-2.5 flex min-h-5 items-start gap-1.5 text-caption leading-relaxed text-ink-500">
        {status === 'saving' && <Loader2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
        {status === 'saved' && <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-700" />}
        <span>
          {message || (
            <>You can opt out at any time. See our <Link href="/privacy" className="hover-link text-ink-700">privacy policy</Link>.</>
          )}
        </span>
      </div>
    </div>
  )
}
