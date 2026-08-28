'use client'
// src/app/contact/page.tsx
import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, CheckCircle, MessageSquare, ArrowRight } from 'lucide-react'
import { submitContactForm } from '@/app/actions/contact'
import Field, { SubmitButton } from '@/components/UI/Field'
import Link from 'next/link'

import { PHONE_HREF, PHONE_DISPLAY } from '@/constants/contact'
const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges
const ACCENT_TEXT = 'var(--color-ember-700)' // letterforms on a light ground

const CONTACT_INFO = [
  { icon: Phone,  label: 'Phone',    value: PHONE_DISPLAY,              sub: 'Mon–Fri 9am–6pm, Sat 10am–4pm', href: PHONE_HREF },
  { icon: Mail,   label: 'Email',    value: 'uksofashop.co.uk@gmail.com',     sub: 'We reply within 24 hours',       href: 'mailto:uksofashop.co.uk@gmail.com' },
  { icon: MapPin, label: 'Showroom', value: 'Unit 02, Waverledge Street, Blackburn, BB6 7LS',     sub: 'Visit us by appointment',        href: null },
  { icon: Clock,  label: 'Hours',    value: 'Mon–Fri 9am–6pm',            sub: 'Saturday 10am–4pm',              href: null },
]

export default function ContactPage() {
  const [pending, setPending] = useState(false)
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg]   = useState('')

  async function handle(fd: FormData) {
    setPending(true); setStatus('idle')
    const res = await submitContactForm(fd)
    if (res.error) { setErrMsg(res.error); setStatus('error') }
    else { setStatus('success') }
    setPending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-calico-50)' }}>

      {/* Hero */}
      <div data-ground="dark" style={{ background: 'var(--color-ink-900)', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 'var(--container-shell)', margin: '0 auto', padding: '32px 16px 32px' }}>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: 'var(--color-ember-300)', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Get in Touch</div>
          <h1 className="font-display" style={{ fontSize: 'var(--text-h1)', fontWeight: 700, color: 'var(--color-calico-50)', lineHeight: 1.1, marginBottom: 12 }}>
            We&apos;d Love to Hear<br /><span style={{ color: 'var(--color-ember-300)' }}>From You</span>
          </h1>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-calico-300)', maxWidth: 400 }}>
            Whether it&apos;s a question about a sofa, a delivery query, or you just want to say hello — our team is here.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--container-shell)', margin: '0 auto', padding: '32px 16px 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>

        {/* Left: contact info + WhatsApp */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {CONTACT_INFO.map(({ icon: Icon, label, value, sub, href }) => (
              <div key={label} style={{ background: 'var(--color-calico-50)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '1px solid var(--color-calico-300)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon style={{ width: 15, height: 15, color: ACCENT_TEXT }} />
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: 'var(--color-ink-500)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                {href
                  ? <a href={href} style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--color-ink-900)', textDecoration: 'none', display: 'block', marginBottom: 4 }} className="hover:text-ember-700 transition-colors">{value}</a>
                  : <div style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 4 }}>{value}</div>
                }
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* WhatsApp */}
          <a href="https://wa.me/447476616022" target="_blank" rel="noopener noreferrer"
            data-ground="dark"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--color-ink-900)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}
            className="hover:border-whatsapp/30 transition-colors group"
          >
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-pill)', background: 'var(--color-whatsapp)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'var(--color-calico-50)' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--color-calico-50)' }}>Chat on WhatsApp</div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginTop: 2 }}>Usually replies in minutes</div>
            </div>
            <ArrowRight style={{ width: 14, height: 14, color: 'var(--color-ink-400)', marginLeft: 'auto' }} className="group-hover:text-whatsapp transition-colors" />
          </a>

          {/* Track order nudge */}
          <Link href="/track-order" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', borderRadius: 'var(--radius-sm)', background: `${ACCENT}10`, border: `1px solid ${ACCENT}22`, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare style={{ width: 14, height: 14, color: 'var(--color-calico-50)' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--color-ink-900)' }}>Track your order instead?</div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginTop: 2 }}>Use your 8-character reference code</div>
            </div>
            <ArrowRight style={{ width: 12, height: 12, color: ACCENT_TEXT, marginLeft: 'auto', flexShrink: 0 }} />
          </Link>
        </div>

        {/* Right: form */}
        <div style={{ background: 'var(--color-calico-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-calico-300)', overflow: 'hidden', boxShadow: 'var(--shadow-e1)' }}>
          <div style={{ height: 3, background: ACCENT }} />
          <div style={{ padding: '24px' }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>Message Us</div>
            <h2 className="font-display" style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 16 }}>Send a Message</h2>

            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-pill)', background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle style={{ width: 28, height: 28, color: ACCENT_TEXT }} />
                </div>
                <h3 style={{ fontSize: 'var(--text-lead)', fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-ink-500)', lineHeight: 1.6, marginBottom: 16 }}>
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
                <button onClick={() => setStatus('idle')} style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}22`, color: ACCENT_TEXT, fontSize: 'var(--text-caption)', fontWeight: 700, padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form action={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Honeypot. Hidden from people, filled in by bots - see
                    HONEYPOT_FIELD in src/app/actions/contact.ts. Not display:none,
                    which some bots detect; tabIndex and aria-hidden keep it out of
                    the keyboard order and away from screen readers. */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label htmlFor="company_website">Do not fill this in</label>
                  <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                {status === 'error' && <div style={{ padding: '12px 16px', background: 'var(--color-rust-50)', border: '1px solid var(--color-rust-200)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-caption)', color: 'var(--color-rust-700)' }}>{errMsg}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="First name" name="firstName" required autoComplete="given-name" />
                  <Field label="Last name" name="lastName" autoComplete="family-name" />
                </div>
                <Field label="Email" name="email" type="email" required autoComplete="email" />
                <Field label="Order number" name="orderNumber" hint="If your message is about an existing order." />
                <Field label="Message" name="message" type="textarea" required />

                <SubmitButton
                  idle="Send message"
                  pending="Sending"
                  done="Sent"
                  state={pending ? 'pending' : 'idle'}
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}