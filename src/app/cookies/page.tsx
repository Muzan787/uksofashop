// src/app/cookies/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout, { LastUpdated } from '@/components/Editorial/EditorialLayout'
import CookiePreferences from '@/components/UI/CookiePreferences'
import { SUPPORT_EMAIL } from '@/constants/contact'

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'Exactly which cookies and browser storage UK Sofa Shop uses, what each one is for, and how to change your choice at any time.',
  alternates: { canonical: '/cookies' },
}

/** Set by hand. See the note in src/app/terms/page.tsx. */
const LAST_UPDATED = '2026-10-05'

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

/**
 * First-party ids this site sets itself, on arrival.
 *
 * These were missing from this page entirely, which was the real problem:
 * five cookies set on every visit and named nowhere. They are listed in their
 * own group rather than folded into either of the other two, because neither
 * description would have been true — they are not needed for the site to
 * work, and they are not "only set if you accept".
 *
 * The two touch cookies are deleted when consent is withdrawn (see
 * TRACKING_COOKIE_PREFIXES in src/utils/consent.ts). The three ids are not,
 * and the table says so rather than leaving it to be discovered.
 */
const firstParty: Entry[] = [
  {
    name: 'uksofashop_vid',
    type: 'Cookie (ours)',
    purpose: 'A random id for this browser, so repeat visits can be counted as one person rather than several. It is not linked to your name unless you place an order.',
    duration: 'Up to 400 days',
  },
  {
    name: 'uksofashop_sid',
    type: 'Cookie (ours)',
    purpose: 'Groups the pages you look at in one sitting into a single visit. Resets after 30 minutes of inactivity.',
    duration: '30 minutes',
  },
  {
    name: 'uksofashop_aid',
    type: 'Cookie (ours)',
    purpose: 'Marks one arrival at the site, so a second visit from a different advert later the same day is counted separately.',
    duration: '30 minutes',
  },
  {
    name: 'uksofashop_ft',
    type: 'Cookie (ours)',
    purpose: 'Records how you first found us — the advert, search or link you arrived through. Lets us tell which adverts actually lead to orders. Deleted if you withdraw consent.',
    duration: 'Up to 400 days',
  },
  {
    name: 'uksofashop_lt',
    type: 'Cookie (ours)',
    purpose: 'The same, for the most recent way you reached us rather than the first. Deleted if you withdraw consent.',
    duration: 'Up to 400 days',
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
  { id: 'first-party', label: 'Our own measurement' },
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

        <h2 id="first-party">Our own measurement</h2>
        <p>
          These five are set by us rather than by anybody else, they stay on this site, and
          nothing in them is shared with Google or Meta as a cookie. They are what let us tell
          whether an advert we paid for led to an order, instead of guessing.
        </p>
        <p>
          Being straight about these: they are set when you arrive, not after you answer the
          question above. We have taken the view that an id that counts visits and remembers which
          advert you came from is measurement of our own site rather than third-party tracking.
          You can disagree — if you choose “Essential only”, the two that record how you found us
          are deleted along with the Google and Meta ones, and you can clear the rest in your
          browser at any time.
        </p>

        <Table entries={firstParty} caption="First-party cookies this site sets on arrival" />

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
