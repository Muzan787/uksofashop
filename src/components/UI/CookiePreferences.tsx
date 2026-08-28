'use client'

// src/components/UI/CookiePreferences.tsx
//
// The control on /cookies that lets someone see and change the choice they
// already made. Withdrawal goes through revokeConsent(), which clears the
// analytics cookies and reloads - see src/utils/consent.ts for why a flag flip
// on its own would not be a real withdrawal.

import { useEffect, useState } from 'react'
import { Check, X, RotateCcw } from 'lucide-react'
import {
  getConsent, grantConsent, revokeConsent,
  CONSENT_CHANGED_EVENT, type ConsentValue,
} from '@/utils/consent'

const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges

export default function CookiePreferences() {
  // null until the effect has read localStorage, so the server and client
  // render the same thing and hydration doesn't mismatch.
  const [consent, setConsentState] = useState<ConsentValue | null | 'loading'>('loading')

  useEffect(() => {
    const read = () => setConsentState(getConsent())
    read()
    window.addEventListener(CONSENT_CHANGED_EVENT, read)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, read)
  }, [])

  const status =
    consent === 'loading' ? 'Checking…'
    : consent === 'granted' ? 'Analytics and advertising cookies are ON'
    : consent === 'denied' ? 'Analytics and advertising cookies are OFF'
    : 'You haven’t chosen yet'

  const tone =
    consent === 'granted' ? 'var(--color-sage-700)'
    : consent === 'denied' ? 'var(--color-ink-500)'
    : ACCENT

  return (
    <div style={{ background: 'var(--color-calico-50)', border: '1px solid var(--color-calico-300)', borderRadius: 'var(--radius-md)', padding: '24px 16px' }}>
      <h2 className="font-display" style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 8 }}>
        Your choice
      </h2>
      <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-ink-500)', lineHeight: 1.75, margin: '0 0 16px' }}>
        You can change this whenever you like, and as easily as you set it. Turning the
        optional cookies off also deletes the ones already on this device.
      </p>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-calico-50)', border: '1px solid var(--color-calico-300)', borderRadius: 'var(--radius-sm)',
          padding: '12px 16px', marginBottom: 16,
        }}
        aria-live="polite"
      >
        <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: tone, flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-ink-900)' }}>{status}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => grantConsent()}
          disabled={consent === 'granted' || consent === 'loading'}
          style={{
            flex: '1 1 150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 'var(--text-caption)', fontWeight: 700,
            background: consent === 'granted' ? 'var(--color-calico-300)' : ACCENT,
            color: consent === 'granted' ? 'var(--color-ink-500)' : 'var(--color-calico-50)',
            cursor: consent === 'granted' || consent === 'loading' ? 'default' : 'pointer',
          }}
        >
          <Check style={{ width: 14, height: 14 }} /> Accept all
        </button>

        <button
          onClick={() => revokeConsent()}
          disabled={consent === 'denied' || consent === 'loading'}
          style={{
            flex: '1 1 150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-caption)', fontWeight: 700,
            background: 'var(--color-calico-50)',
            border: `1px solid ${consent === 'denied' ? 'var(--color-calico-300)' : 'var(--color-calico-300)'}`,
            color: consent === 'denied' ? 'var(--color-ink-500)' : 'var(--color-ink-900)',
            cursor: consent === 'denied' || consent === 'loading' ? 'default' : 'pointer',
          }}
        >
          <X style={{ width: 14, height: 14 }} /> Essential only
        </button>
      </div>

      {consent === 'granted' && (
        <p style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', margin: '12px 0 0', lineHeight: 1.6 }}>
          <RotateCcw style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }} />
          Turning these off reloads the page — analytics scripts can’t be stopped once
          they’ve started, so we load a clean page without them.
        </p>
      )}
    </div>
  )
}
