import type { Metadata } from 'next'
// src/app/admin/more/page.tsx
//
// The phone's "More" tab: every section that isn't one of the four on the
// bottom bar, each with one line saying what is waiting there, then Sign out.
// On a desktop the sidebar already lists everything, but the page works there
// too.
import Link from 'next/link'
import { Activity, BarChart3, ChevronRight, Clapperboard, Globe, Link2, LogOut, Radio, Route, Search, SearchCheck, SlidersHorizontal, Star, Tags, type LucideIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/actions/auth'
import { ADMIN_SECTIONS, MORE_SECTION_KEYS, type AdminSectionKey } from '@/utils/adminNav'
import { META_SIGNAL_COLUMNS, deliveredPending, purchasePending, type MetaSignalOrder } from '@/utils/metaSignals'

export const metadata: Metadata = { title: 'More' }
export const dynamic = 'force-dynamic'

const ICONS: Partial<Record<AdminSectionKey, LucideIcon>> = {
  website: Globe,
  business: BarChart3,
  sourcereview: SearchCheck,
  meta: Radio,
  google: Activity,
  journeys: Route,
  reviews: Star,
  videos: Clapperboard,
  status: Activity,
  settings: SlidersHorizontal,
  adlinks: Link2,
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

interface Note {
  text: string
  /** True when something there is waiting for you. */
  waiting: boolean
}

export default async function AdminMorePage() {
  const supabase = await createClient()

  const [reviews, videos, orders] = await Promise.all([
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select(META_SIGNAL_COLUMNS).limit(5000),
  ])

  // The same rules as Admin → Meta, so this count and that page agree.
  const metaRows = (orders.data ?? []) as unknown as MetaSignalOrder[]
  const purchases = metaRows.filter(purchasePending).length
  const deliveries = metaRows.filter(deliveredPending).length

  const reviewCount = reviews.count ?? 0

  const notes: Partial<Record<AdminSectionKey, Note>> = {
    meta: orders.error
      ? { text: 'Ad conversions', waiting: false }
      : purchases + deliveries === 0
        ? { text: 'Nothing to send', waiting: false }
        : {
            text: [
              purchases && plural(purchases, 'Purchase', 'Purchases'),
              deliveries && plural(deliveries, 'delivery', 'deliveries'),
            ].filter(Boolean).join(' and ') + ' to send',
            waiting: true,
          },
    journeys: { text: 'What visitors do on the site', waiting: false },
    google: { text: 'Purchase reporting, offline queue and conversion holds', waiting: false },
    reviews: reviewCount > 0
      ? { text: `${reviewCount} waiting`, waiting: true }
      : { text: 'Nothing waiting', waiting: false },
    videos: { text: `${plural(videos.count ?? 0, 'video', 'videos')} on the site`, waiting: false },
    status: { text: 'Is everything working?', waiting: false },
    settings: { text: 'Figures, the visitor offer and OrderFlow', waiting: false },
    adlinks: { text: 'The catalogue feed and a link for every ad', waiting: false },
  }

  const sections = MORE_SECTION_KEYS
    .map(key => ADMIN_SECTIONS.find(s => s.key === key))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-ink-900">More</h1>
        <p className="mt-1 text-sm text-ink-500">Everything that isn&apos;t on the bar below.</p>
      </header>

      {/* The phone's way into the same search as the desktop sidebar. */}
      <form method="get" action="/admin/orders" role="search">
        <label htmlFor="more-search" className="sr-only">Search orders</label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input id="more-search" name="q" type="search" placeholder="Order code, name, phone or postcode" className="min-h-12 w-full rounded-md border border-calico-300 bg-white pl-9 pr-3 text-base text-ink-900 placeholder:text-ink-500" />
        </div>
      </form>

      <ul className="divide-y divide-calico-300 overflow-hidden rounded-md border border-calico-300 bg-white shadow-sm">
        {sections.map(({ key, href, label }) => {
          const Icon = ICONS[key] ?? Tags
          const note = notes[key]
          return (
            <li key={key}>
              <Link href={href} className="flex min-h-16 items-center gap-4 px-4 py-3 transition hover:bg-calico-50 active:bg-calico-100">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-calico-100 text-ink-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ink-900">{label}</span>
                  {note && (
                    <span className={`mt-0.5 block text-sm ${note.waiting ? 'font-semibold text-amber-700' : 'text-ink-500'}`}>
                      {note.text}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>

      <form action={logout}>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-red-200 bg-white px-4 py-3 text-base font-semibold text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  )
}
