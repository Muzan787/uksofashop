import type { Metadata } from 'next'
// src/app/admin/more/page.tsx
//
// The phone's "More" tab: every section that isn't one of the four on the
// bottom bar, each with one line saying what is waiting there, then Sign out.
// On a desktop the sidebar already lists everything, but the page works there
// too.
import Link from 'next/link'
import { Activity, ChevronRight, Clapperboard, LogOut, Radio, Route, SlidersHorizontal, Star, Tags, type LucideIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/actions/auth'
import { ADMIN_SECTIONS, MORE_SECTION_KEYS, type AdminSectionKey } from '@/utils/adminNav'
import { META_SIGNAL_COLUMNS, deliveredPending, purchasePending, type MetaSignalOrder } from '@/utils/metaSignals'

export const metadata: Metadata = { title: 'More' }
export const dynamic = 'force-dynamic'

const ICONS: Partial<Record<AdminSectionKey, LucideIcon>> = {
  meta: Radio,
  journeys: Route,
  reviews: Star,
  videos: Clapperboard,
  status: Activity,
  settings: SlidersHorizontal,
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
    reviews: reviewCount > 0
      ? { text: `${reviewCount} waiting`, waiting: true }
      : { text: 'Nothing waiting', waiting: false },
    videos: { text: `${plural(videos.count ?? 0, 'video', 'videos')} on the site`, waiting: false },
    status: { text: 'Is everything working?', waiting: false },
    settings: { text: 'Figures, the visitor offer and OrderFlow', waiting: false },
  }

  const sections = MORE_SECTION_KEYS
    .map(key => ADMIN_SECTIONS.find(s => s.key === key))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-stone-900">More</h1>
        <p className="mt-1 text-sm text-stone-500">Everything that isn&apos;t on the bar below.</p>
      </header>

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
        {sections.map(({ key, href, label }) => {
          const Icon = ICONS[key] ?? Tags
          const note = notes[key]
          return (
            <li key={key}>
              <Link href={href} className="flex min-h-16 items-center gap-4 px-4 py-3 transition hover:bg-stone-50 active:bg-stone-100">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-stone-100 text-stone-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-stone-900">{label}</span>
                  {note && (
                    <span className={`mt-0.5 block text-sm ${note.waiting ? 'font-semibold text-amber-700' : 'text-stone-500'}`}>
                      {note.text}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
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
