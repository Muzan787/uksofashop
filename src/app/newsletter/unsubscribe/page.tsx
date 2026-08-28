// src/app/newsletter/unsubscribe/page.tsx
//
// Unlike confirming, this DOES act on a plain GET, deliberately.
//
// "Unsubscribe in one click" has to mean one click. If a mail scanner pre-fetches
// the link and unsubscribes someone early, the worst outcome is that they stop
// receiving email they can resubscribe to in seconds. Erring towards not sending
// is the right way for this to fail.
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { createAdminClient } from '@/utils/supabase/admin'

const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ token?: string }>

export default async function NewsletterUnsubscribePage(props: { searchParams: SearchParams }) {
  const { token } = await props.searchParams

  type Outcome = 'unsubscribed' | 'invalid_token' | 'error'
  let outcome: Outcome = 'invalid_token'

  if (token && /^[0-9a-fA-F-]{36}$/.test(token)) {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase.rpc('newsletter_unsubscribe', { p_token: token })
      if (error) {
        console.error('Newsletter unsubscribe error:', error.message)
        outcome = 'error'
      } else {
        const r = data as unknown as { outcome?: string }
        outcome = (r.outcome as Outcome) ?? 'invalid_token'
      }
    } catch {
      outcome = 'error'
    }
  }

  const ok = outcome === 'unsubscribed'

  return (
    <div style={{ minHeight: '70vh', background: 'var(--color-calico-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, width: '100%', background: 'var(--color-calico-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-calico-300)', padding: '32px 24px', textAlign: 'center' }}>

        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-pill)', margin: '0 auto 16px',
          background: ok ? 'var(--color-sage-50)' : 'var(--color-rust-50)',
          border: `1px solid ${ok ? 'color-mix(in srgb, var(--color-sage-700) 20%, transparent)' : 'color-mix(in srgb, var(--color-rust-700) 20%, transparent)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ok
            ? <CheckCircle style={{ width: 26, height: 26, color: 'var(--color-sage-700)' }} />
            : <AlertCircle style={{ width: 26, height: 26, color: 'var(--color-rust-700)' }} />}
        </div>

        <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 12 }}>
          {ok ? 'You’ve been unsubscribed' : 'That link didn’t work'}
        </h1>

        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-ink-500)', lineHeight: 1.75, marginBottom: 24 }}>
          {ok
            ? 'We won’t send you any more marketing emails. You’ll still get messages about any order you place — those aren’t marketing and we can’t switch them off.'
            : 'This unsubscribe link isn’t one we recognise. If you’re still receiving emails you don’t want, reply to any of them and we’ll take you off the list by hand.'}
        </p>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: ACCENT, color: 'var(--color-ink-900)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Back to the shop <ArrowRight style={{ width: 12, height: 12 }} />
        </Link>

        {ok && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginTop: 16, lineHeight: 1.6 }}>
            Unsubscribed by mistake? Sign up again from the bottom of any page.
          </p>
        )}
      </div>
    </div>
  )
}
