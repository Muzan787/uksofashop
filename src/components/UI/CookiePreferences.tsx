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

const ACCENT = '#d4871a'

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
    consent === 'granted' ? '#16a34a'
    : consent === 'denied' ? '#57534e'
    : ACCENT

  return (
    <div style={{ background: '#fff', border: '1px solid #f0ede8', borderRadius: 14, padding: '22px 20px' }}>
      <h2 className="font-playfair" style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 6 }}>
        Your choice
      </h2>
      <p style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.75, margin: '0 0 16px' }}>
        You can change this whenever you like, and as easily as you set it. Turning the
        optional cookies off also deletes the ones already on this device.
      </p>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 9,
          padding: '11px 14px', marginBottom: 14,
        }}
        aria-live="polite"
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>{status}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => grantConsent()}
          disabled={consent === 'granted' || consent === 'loading'}
          style={{
            flex: '1 1 150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '12px 16px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700,
            background: consent === 'granted' ? '#e7e5e4' : ACCENT,
            color: consent === 'granted' ? '#a8a29e' : '#fff',
            cursor: consent === 'granted' || consent === 'loading' ? 'default' : 'pointer',
          }}
        >
          <Check style={{ width: 14, height: 14 }} /> Accept all
        </button>

        <button
          onClick={() => revokeConsent()}
          disabled={consent === 'denied' || consent === 'loading'}
          style={{
            flex: '1 1 150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '12px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            background: '#fff',
            border: `1px solid ${consent === 'denied' ? '#e7e5e4' : '#d6d3d1'}`,
            color: consent === 'denied' ? '#a8a29e' : '#1c1917',
            cursor: consent === 'denied' || consent === 'loading' ? 'default' : 'pointer',
          }}
        >
          <X style={{ width: 14, height: 14 }} /> Essential only
        </button>
      </div>

      {consent === 'granted' && (
        <p style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#a8a29e', margin: '12px 0 0', lineHeight: 1.6 }}>
          <RotateCcw style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }} />
          Turning these off reloads the page — analytics scripts can’t be stopped once
          they’ve started, so we load a clean page without them.
        </p>
      )}
    </div>
  )
}
