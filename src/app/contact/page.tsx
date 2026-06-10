'use client'
// src/app/contact/page.tsx
import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Loader2, CheckCircle, MessageSquare, ArrowRight, Send } from 'lucide-react'
import { submitContactForm } from '@/app/actions/contact'
import Link from 'next/link'

const ACCENT = '#d4871a'

const CONTACT_INFO = [
  { icon: Phone,  label: 'Phone',    value: '07476 616022',              sub: 'Mon–Fri 9am–6pm, Sat 10am–4pm', href: 'tel:07476616022' },
  { icon: Mail,   label: 'Email',    value: 'uksofashop.co.uk@gmail.com',     sub: 'We reply within 24 hours',       href: 'mailto:uksofashop.co.uk@gmail.com' },
  { icon: MapPin, label: 'Showroom', value: 'London, United Kingdom',     sub: 'Visit us by appointment',        href: null },
  { icon: Clock,  label: 'Hours',    value: 'Mon–Fri 9am–6pm',            sub: 'Saturday 10am–4pm',              href: null },
]

function Field({ icon: Icon, label, name, type = 'text', required = true, placeholder, textarea }: {
  icon: React.ElementType; label: string; name: string; type?: string
  required?: boolean; placeholder: string; textarea?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
        {label} {required && <span style={{ color: ACCENT }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon style={{ position: 'absolute', left: 12, top: textarea ? 13 : '50%', transform: textarea ? 'none' : 'translateY(-50%)', width: 14, height: 14, color: focused ? ACCENT : '#c4b9ad', transition: 'color 0.2s', pointerEvents: 'none' }} />
        {textarea ? (
          <textarea name={name} required={required} rows={4} placeholder={placeholder}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 12, border: `1.5px solid ${focused ? ACCENT : '#e7e5e4'}`, borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#1c1917', boxSizing: 'border-box', transition: 'border-color 0.2s ease', background: '#fafaf9' }} />
        ) : (
          <input type={type} name={name} required={required} placeholder={placeholder}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 12, border: `1.5px solid ${focused ? ACCENT : '#e7e5e4'}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#1c1917', boxSizing: 'border-box', transition: 'border-color 0.2s ease', background: '#fafaf9' }} />
        )}
      </div>
    </div>
  )
}

export default function ContactPage() {
  const [pending, setPending] = useState(false)
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg]   = useState('')
  const formRef               = typeof document !== 'undefined' ? null : null

  async function handle(fd: FormData) {
    setPending(true); setStatus('idle')
    const res = await submitContactForm(fd)
    if (res.error) { setErrMsg(res.error); setStatus('error') }
    else { setStatus('success') }
    setPending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>

      {/* Hero */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 32px' }}>
          <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Get in Touch</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 10 }}>
            We'd Love to Hear<br /><em style={{ color: ACCENT, fontStyle: 'normal' }}>From You</em>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 400 }}>
            Whether it's a question about a sofa, a delivery query, or you just want to say hello — our team is here.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>

        {/* Left: contact info + WhatsApp */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {CONTACT_INFO.map(({ icon: Icon, label, value, sub, href }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '16px', border: '1px solid #f0ede8' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon style={{ width: 15, height: 15, color: ACCENT }} />
                </div>
                <div style={{ fontSize: 9, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                {href
                  ? <a href={href} style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', textDecoration: 'none', display: 'block', marginBottom: 3 }} className="hover:text-[#d4871a] transition-colors">{value}</a>
                  : <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', marginBottom: 3 }}>{value}</div>
                }
                <div style={{ fontSize: 10, color: '#a8a29e' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* WhatsApp */}
          <a href="https://wa.me/447476616022" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 10, background: '#0c0c0b', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}
            className="hover:border-[#25D366]/30 transition-colors group"
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: '#fff' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Chat on WhatsApp</div>
              <div style={{ fontSize: 11, color: '#57534e', marginTop: 2 }}>Usually replies in minutes</div>
            </div>
            <ArrowRight style={{ width: 14, height: 14, color: '#3f3f3f', marginLeft: 'auto' }} className="group-hover:text-[#25D366] transition-colors" />
          </a>

          {/* Track order nudge */}
          <Link href="/track-order" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 10, background: `${ACCENT}10`, border: `1px solid ${ACCENT}22`, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1917' }}>Track your order instead?</div>
              <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>Use your 8-character reference code</div>
            </div>
            <ArrowRight style={{ width: 12, height: 12, color: ACCENT, marginLeft: 'auto', flexShrink: 0 }} />
          </Link>
        </div>

        {/* Right: form */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ height: 3, background: ACCENT }} />
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>Message Us</div>
            <h2 className="font-playfair" style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', marginBottom: 20 }}>Send a Message</h2>

            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle style={{ width: 28, height: 28, color: ACCENT }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ fontSize: 13, color: '#78716c', lineHeight: 1.6, marginBottom: 20 }}>
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button onClick={() => setStatus('idle')} style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}22`, color: ACCENT, fontSize: 11, fontWeight: 700, padding: '9px 20px', borderRadius: 7, cursor: 'pointer' }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form action={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {status === 'error' && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: '#dc2626' }}>{errMsg}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field icon={Mail} label="First Name" name="firstName" placeholder="Jane" />
                  <Field icon={Mail} label="Last Name" name="lastName" placeholder="Smith" required={false} />
                </div>
                <Field icon={Mail} label="Email" name="email" type="email" placeholder="jane@example.com" />
                <Field icon={MessageSquare} label="Order Number" name="orderNumber" placeholder="A1B2C3D4" required={false} />
                <Field icon={Send} label="Message" name="message" placeholder="How can we help you?" textarea />

                <button type="submit" disabled={pending}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '13px 0', borderRadius: 8, border: 'none',
                    background: pending ? '#a8a29e' : ACCENT, color: '#fff',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: pending ? 'wait' : 'pointer', transition: 'background 0.2s',
                    boxShadow: pending ? 'none' : `0 4px 16px ${ACCENT}44`,
                  }}
                >
                  {pending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Send style={{ width: 13, height: 13 }} />}
                  {pending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}