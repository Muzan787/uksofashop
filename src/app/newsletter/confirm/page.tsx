// src/app/newsletter/confirm/page.tsx
//
// Two states: the token arrives in the URL and we show a button, or a status
// comes back after that button was pressed. Nothing is confirmed by loading
// this page - see src/app/actions/newsletter-confirm.ts for why.
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Mail, ArrowRight } from 'lucide-react'
import { confirmNewsletter } from '@/app/actions/newsletter-confirm'

const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges
const ACCENT_TEXT = 'var(--color-ember-700)' // letterforms on a light ground

export const metadata: Metadata = {
  title: 'Confirm your subscription',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ token?: string; status?: string }>

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '70vh', background: 'var(--color-calico-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, width: '100%', background: 'var(--color-calico-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-calico-300)', padding: '32px 24px', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  )
}

function Icon({ ok, neutral }: { ok?: boolean; neutral?: boolean }) {
  const bg = neutral ? 'var(--color-calico-100)' : ok ? 'var(--color-sage-50)' : 'var(--color-rust-50)'
  const bd = neutral ? `${ACCENT}33` : ok ? 'color-mix(in srgb, var(--color-sage-700) 20%, transparent)' : 'color-mix(in srgb, var(--color-rust-700) 20%, transparent)'
  const Cmp = neutral ? Mail : ok ? CheckCircle : AlertCircle
  const col = neutral ? ACCENT : ok ? 'var(--color-sage-700)' : 'var(--color-rust-700)'
  return (
    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-pill)', margin: '0 auto 16px', background: bg, border: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Cmp style={{ width: 26, height: 26, color: col }} />
    </div>
  )
}

const H1: React.CSSProperties = { fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 12 }
const P: React.CSSProperties = { fontSize: 'var(--text-body-sm)', color: 'var(--color-ink-500)', lineHeight: 1.75, marginBottom: 24 }

export default async function NewsletterConfirmPage(props: { searchParams: SearchParams }) {
  const { token, status } = await props.searchParams

  // ── After the button was pressed ──
  if (status) {
    const ok = status === 'confirmed' || status === 'already_confirmed'
    const copy: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: 'You’re subscribed',
        body: 'Thanks for confirming. We’ll send the occasional note about new arrivals and offers — a couple a month at most, and every one of them has a one-click unsubscribe link.',
      },
      already_confirmed: {
        title: 'You’re already subscribed',
        body: 'This address is already on our list, so there’s nothing more to do. You can unsubscribe from any email we send you.',
      },
      invalid_token: {
        title: 'That link didn’t work',
        body: 'This confirmation link is no longer valid — it may already have been used, or a newer one may have been sent. You can sign up again from the bottom of any page.',
      },
      error: {
        title: 'Something went wrong',
        body: 'We couldn’t confirm your subscription just now. Please try the link in your email again in a few minutes.',
      },
    }
    const c = copy[status] ?? copy.error

    return (
      <Shell>
        <Icon ok={ok} />
        <h1 className="font-display" style={H1}>{c.title}</h1>
        <p style={P}>{c.body}</p>
        <Link href="/shop/all" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: ACCENT, color: 'var(--color-ink-900)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Browse Sofas <ArrowRight style={{ width: 12, height: 12 }} />
        </Link>
      </Shell>
    )
  }

  // ── Arrived from the email, nothing done yet ──
  if (!token) {
    return (
      <Shell>
        <Icon />
        <h1 className="font-display" style={H1}>That link didn’t work</h1>
        <p style={P}>
          This confirmation link looks incomplete. Try opening it again from your email,
          or sign up afresh from the bottom of any page.
        </p>
        <Link href="/" style={{ fontSize: 'var(--text-caption)', color: ACCENT_TEXT, fontWeight: 700, textDecoration: 'none' }}>Back to the shop</Link>
      </Shell>
    )
  }

  return (
    <Shell>
      <Icon neutral />
      <h1 className="font-display" style={H1}>One last tap</h1>
      <p style={P}>
        Press the button below to confirm you&apos;d like our occasional emails about new
        arrivals and offers. If you didn&apos;t sign up, simply close this page — nothing
        will be added and we won&apos;t contact you.
      </p>
      <form action={confirmNewsletter}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          style={{ width: '100%', background: ACCENT, color: 'var(--color-ink-900)', padding: '16px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Confirm my subscription
        </button>
      </form>
    </Shell>
  )
}
