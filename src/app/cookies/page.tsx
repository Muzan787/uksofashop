// src/app/cookies/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Cookie, ArrowRight, ShieldCheck } from 'lucide-react'
import CookiePreferences from '@/components/UI/CookiePreferences'

const ACCENT = '#d4871a'

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'Exactly which cookies and browser storage UK Sofa Shop uses, what each one is for, and how to change your choice at any time.',
  alternates: { canonical: '/cookies' },
}

interface Entry {
  name: string
  type: string
  purpose: string
  duration: string
}

/** Set no matter what — the site can't work without them. */
const essential: Entry[] = [
  {
    name: 'cookie_consent',
    type: 'Browser storage',
    purpose: 'Remembers the choice you made about optional cookies, so we don’t ask again on every page.',
    duration: 'Until you clear it or change your mind',
  },
  {
    name: 'uksofashop_cart',
    type: 'Browser storage',
    purpose: 'Holds what’s in your basket so it’s still there if you close the tab and come back.',
    duration: 'Until you clear your browser data',
  },
  {
    name: 'sb-…-auth-token',
    type: 'Cookie (Supabase)',
    purpose: 'Keeps you signed in to your account. Only set if you actually log in.',
    duration: 'Until you sign out',
  },
]

/** Only ever set if you choose "Accept all". */
const optional: Entry[] = [
  {
    name: '_ga, _ga_…',
    type: 'Cookie (Google Analytics)',
    purpose: 'Tells us how many people visit and which pages they look at, so we know what’s worth improving. We can’t identify you from it.',
    duration: 'Up to 2 years',
  },
  {
    name: '_gid, _gat',
    type: 'Cookie (Google Analytics)',
    purpose: 'Distinguishes one visit from another and limits how often data is sent.',
    duration: '24 hours or less',
  },
  {
    name: '_fbp, _fbc',
    type: 'Cookie (Meta Pixel)',
    purpose: 'Lets us measure whether our Facebook and Instagram adverts actually lead to orders, and show adverts to people who’ve looked at our sofas.',
    duration: 'Up to 3 months',
  },
]

function Table({ entries }: { entries: Entry[] }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #f0ede8', borderRadius: 12, background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr style={{ background: '#fafaf9' }}>
            {['Name', 'Type', 'What it’s for', 'How long'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #f0ede8' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.name} style={{ borderBottom: i < entries.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
              <td style={{ padding: '13px 14px', fontSize: 12.5, fontFamily: 'monospace', color: '#1c1917', fontWeight: 600, whiteSpace: 'nowrap' }}>{e.name}</td>
              <td style={{ padding: '13px 14px', fontSize: 12.5, color: '#78716c', whiteSpace: 'nowrap' }}>{e.type}</td>
              <td style={{ padding: '13px 14px', fontSize: 13, color: '#57534e', lineHeight: 1.6, minWidth: 240 }}>{e.purpose}</td>
              <td style={{ padding: '13px 14px', fontSize: 12.5, color: '#78716c', whiteSpace: 'nowrap' }}>{e.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>

      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 32px' }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Cookie style={{ width: 21, height: 21, color: ACCENT }} />
          </div>
          <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Policies</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 10 }}>
            Cookies
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 540, lineHeight: 1.75 }}>
            Every cookie and piece of browser storage this site uses, what each one actually
            does, and how to change your mind whenever you want.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 60px' }}>

        <div style={{ marginBottom: 28 }}>
          <CookiePreferences />
        </div>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ShieldCheck style={{ width: 16, height: 16, color: ACCENT }} />
            <h2 className="font-playfair" style={{ fontSize: 20, fontWeight: 700, color: '#1c1917' }}>
              Essential — always on
            </h2>
          </div>
          <p style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.75, margin: '0 0 14px', maxWidth: 620 }}>
            These make the site work. Without them your basket would empty itself and you
            couldn’t stay signed in, so there’s no option to turn them off. None of them
            track you or go to anyone else.
          </p>
          <Table entries={essential} />
        </section>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Cookie style={{ width: 16, height: 16, color: ACCENT }} />
            <h2 className="font-playfair" style={{ fontSize: 20, fontWeight: 700, color: '#1c1917' }}>
              Analytics and advertising — only if you say yes
            </h2>
          </div>
          <p style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.75, margin: '0 0 14px', maxWidth: 620 }}>
            These are set by Google and Meta, and only ever after you’ve chosen “Accept all”.
            If you choose “Essential only”, they’re never loaded at all — and if you change
            your mind later, we delete the ones already on your device.
          </p>
          <Table entries={optional} />
        </section>

        <section style={{ background: '#fff', border: '1px solid #f0ede8', borderRadius: 14, padding: '22px 20px', marginBottom: 24 }}>
          <h2 className="font-playfair" style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 10 }}>
            Managing cookies in your browser
          </h2>
          <p style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.75, margin: '0 0 10px' }}>
            Whatever you choose here, your browser can block or delete cookies for any site.
            It’s usually under Settings → Privacy. Be aware that blocking everything will
            stop your basket working, on our site and on most others.
          </p>
          <p style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.75, margin: 0 }}>
            If you’d like to know what we hold about you, or want it deleted, email{' '}
            <a href="mailto:uksofashop.co.uk@gmail.com" style={{ color: ACCENT, fontWeight: 600 }}>
              uksofashop.co.uk@gmail.com
            </a>{' '}
            and we’ll sort it out. You can also read our{' '}
            <Link href="/privacy" style={{ color: ACCENT, fontWeight: 600 }}>privacy policy</Link>.
          </p>
        </section>

        <div style={{ background: '#0c0c0b', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Anything unclear?</div>
            <div style={{ fontSize: 13, color: '#78716c', lineHeight: 1.6 }}>
              Ask us and we’ll explain it in plain English.
            </div>
          </div>
          <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', padding: '11px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Contact Us <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
