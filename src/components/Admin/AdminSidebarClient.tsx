'use client'
// src/components/Admin/AdminSidebarClient.tsx
//
// The admin's navigation: a light, labelled, grouped sidebar on desktop (the
// redesign of 14 Nov 2026), a five-tab bar on phones. The sections and which one is current come from utils/adminNav.ts,
// shared with the More page. Neither prints (`print:hidden`).
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, LayoutGrid, ShoppingCart, Package, Tags, LogOut, Star, UsersRound,
  Clapperboard, Radio, Route, Ellipsis, Activity, SlidersHorizontal, Link2, type LucideIcon,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import {
  ADMIN_GROUPS, ADMIN_SECTIONS, PHONE_TABS, activePhoneTab, sectionActive,
  type AdminSectionKey, type PhoneTabKey,
} from '@/utils/adminNav'

const SECTION_ICONS: Record<AdminSectionKey, LucideIcon> = {
  home: LayoutDashboard,
  orders: ShoppingCart,
  meta: Radio,
  google: Activity,
  leads: UsersRound,
  journeys: Route,
  catalogue: LayoutGrid,
  inventory: Package,
  categories: Tags,
  reviews: Star,
  videos: Clapperboard,
  status: Activity,
  settings: SlidersHorizontal,
  adlinks: Link2,
}

const TAB_ICONS: Record<PhoneTabKey, LucideIcon> = {
  home: LayoutDashboard,
  orders: ShoppingCart,
  leads: UsersRound,
  catalogue: Package,
  more: Ellipsis,
}

export default function AdminSidebarClient({ email }: { email: string }) {
  const pathname = usePathname()
  const currentTab = activePhoneTab(pathname)
  const byKey = new Map(ADMIN_SECTIONS.map(s => [s.key, s]))

  return (
    <>
      {/* Desktop: a light labelled sidebar. Groups say what each section is
          for; the current page is marked by colour AND by aria-current. */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-calico-300 z-40 print:hidden">
        <div className="px-5 pb-4 pt-5 border-b border-calico-300">
          <div className="text-lg font-bold tracking-tight text-ink-900">
            UK Sofa Shop <span className="font-semibold text-ember-700">Admin</span>
          </div>
          {email && (
            <p className="mt-1.5 truncate text-xs text-ink-500" title={email}>
              Signed in as <span className="text-ink-700">{email}</span>
            </p>
          )}
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-4">
          {ADMIN_GROUPS.map(group => (
            <div key={group.label} className="mb-5">
              <p className="m-0 mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-500">{group.label}</p>
              <ul className="m-0 list-none space-y-0.5 p-0">
                {group.keys.map(key => {
                  const section = byKey.get(key)
                  if (!section) return null
                  const Icon = SECTION_ICONS[key]
                  const active = sectionActive(pathname, section.href)
                  return (
                    <li key={section.href}>
                      <Link href={section.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-700 ${
                          active ? 'bg-calico-100 text-ink-900 shadow-[inset_3px_0_0_var(--color-ember-500)]' : 'text-ink-500 hover:bg-calico-50 hover:text-ink-900'
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] ${active ? 'text-ember-700' : ''}`} aria-hidden="true" />
                        {section.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-calico-300 p-3">
          <form action={logout}>
            <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink-500 transition-colors hover:bg-calico-50 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-700">
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Phone: five tabs that always fit. pb-safe keeps them above the home
          indicator; the layout pads the page by the same amount. */}
      <nav
        aria-label="Admin sections"
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-calico-300 z-50 pb-safe print:hidden"
      >
        <div className="grid grid-cols-5 px-1 pt-1">
          {PHONE_TABS.map(({ key, href, label }) => {
            const Icon = TAB_ICONS[key]
            const active = currentTab === key
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm px-1 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-700"
              >
                <span className={`grid h-8 w-12 place-items-center rounded-pill transition-colors ${active ? 'bg-calico-100 text-ember-700' : 'text-ink-500'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className={`text-[11px] font-semibold leading-none ${active ? 'text-ink-900' : 'text-ink-500'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
