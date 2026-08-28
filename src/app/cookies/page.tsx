// src/app/cookies/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout, { LastUpdated } from '@/components/Editorial/EditorialLayout'
import CookiePreferences from '@/components/UI/CookiePreferences'

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'Exactly which cookies and browser storage UK Sofa Shop uses, what each one is for, and how to change your choice at any time.',
  alternates: { canonical: '/cookies' },
}

/** Set by hand. See the note in src/app/terms/page.tsx. */
const LAST_UPDATED = '2026-08-27'

const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

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

const TOC = [
  { id: 'choice', label: 'Your choice' },
  { id: 'essential', label: 'Essential' },
  { id: 'optional', label: 'Analytics and ads' },
  { id: 'browser', label: 'Managing them yourself' },
]

function Table({ entries, caption }: { entries: Entry[]; caption: string }) {
  return (
    <div className="my-6 overflow-x-auto rounded-md border border-calico-300">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-calico-300 bg-calico-100">
            {['Name', 'Type', 'What it’s for', 'How long'].map(h => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 font-data text-eyebrow font-bold uppercase tracking-[0.12em] text-ink-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.name} className="border-b border-calico-100 last:border-b-0">
              <th scope="row" className="whitespace-nowrap px-4 py-3 align-top font-data text-caption font-semibold text-ink-900">
                {e.name}
              </th>
              <td className="whitespace-nowrap px-4 py-3 align-top text-caption text-ink-500">
                {e.type}
              </td>
              <td className="min-w-[240px] px-4 py-3 align-top text-body-sm leading-relaxed text-ink-700">
                {e.purpose}
              </td>
              <td className="whitespace-nowrap px-4 py-3 align-top text-caption text-ink-500">
                {e.duration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialHero
        eyebrow="Policies"
        title="Cookies"
        lede="Every cookie and piece of browser storage this site sets, what each one actually does, and how to change your mind whenever you like."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        meta={<LastUpdated date={LAST_UPDATED} />}
      />

      <EditorialLayout toc={TOC}>
        <h2 id="choice">Your choice</h2>
        <p>
          You can change this at any time, and changing it takes effect immediately — if you turn
          the optional ones off, we delete the ones already on your device rather than just
          stopping new ones.
        </p>

        <div className="my-8">
          <CookiePreferences />
        </div>

        <h2 id="essential">Essential — always on</h2>
        <p>
          These make the site work. Without them your basket would empty itself and you could not
          stay signed in, so there is no option to turn them off. None of them track you, and none
          of them go to anybody else.
        </p>

        <Table entries={essential} caption="Essential cookies and browser storage, which cannot be turned off" />

        <h2 id="optional">Analytics and advertising — only if you say yes</h2>
        <p>
          These are set by Google and Meta, and only ever after you have chosen “Accept all”. If
          you choose “Essential only” they are never loaded at all — not loaded and ignored,
          genuinely never requested.
        </p>

        <Table entries={optional} caption="Optional analytics and advertising cookies, set only with consent" />

        <h2 id="browser">Managing them yourself</h2>
        <p>
          Whatever you choose here, your browser can block or delete cookies for any site — it is
          usually under Settings, then Privacy. Be aware that blocking everything will stop your
          basket working, on our site and on most others.
        </p>
        <p>
          If you would like to know what we hold about you, or want it deleted, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will sort it out. Our{' '}
          <Link href="/privacy">privacy policy</Link> covers the rest of what we do with data.
        </p>

        <hr />

        <p className="fine">
          Anything unclear? <Link href="/contact">Ask us</Link> and we will explain it in plain
          English.
        </p>
      </EditorialLayout>
    </div>
  )
}
