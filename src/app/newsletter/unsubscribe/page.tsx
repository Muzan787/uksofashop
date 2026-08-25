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

const ACCENT = '#d4871a'

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
    <div style={{ minHeight: '70vh', background: '#f8f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', padding: '32px 28px', textAlign: 'center' }}>

        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
          background: ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${ok ? '#16a34a33' : '#dc262633'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ok
            ? <CheckCircle style={{ width: 26, height: 26, color: '#16a34a' }} />
            : <AlertCircle style={{ width: 26, height: 26, color: '#dc2626' }} />}
        </div>

        <h1 className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: '#1c1917', marginBottom: 10 }}>
          {ok ? 'You’ve been unsubscribed' : 'That link didn’t work'}
        </h1>

        <p style={{ fontSize: 14, color: '#57534e', lineHeight: 1.75, marginBottom: 24 }}>
          {ok
            ? 'We won’t send you any more marketing emails. You’ll still get messages about any order you place — those aren’t marketing and we can’t switch them off.'
            : 'This unsubscribe link isn’t one we recognise. If you’re still receiving emails you don’t want, reply to any of them and we’ll take you off the list by hand.'}
        </p>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', padding: '11px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Back to the shop <ArrowRight style={{ width: 12, height: 12 }} />
        </Link>

        {ok && (
          <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 20, lineHeight: 1.6 }}>
            Unsubscribed by mistake? Sign up again from the bottom of any page.
          </p>
        )}
      </div>
    </div>
  )
}
