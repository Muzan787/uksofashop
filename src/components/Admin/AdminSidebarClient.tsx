'use client'
// src/components/Admin/AdminSidebarClient.tsx
//
// The admin's navigation: a fixed sidebar on desktop, a five-tab bar on
// phones. The sections and which one is current come from utils/adminNav.ts,
// shared with the More page. Neither prints (`print:hidden`).
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, LayoutGrid, ShoppingCart, Package, Tags, LogOut, Star, UsersRound,
  Clapperboard, Radio, Route, Ellipsis, Activity, SlidersHorizontal, Link2, type LucideIcon,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import {
  ADMIN_SECTIONS, PHONE_TABS, activePhoneTab, sectionActive,
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

  return (
    <>
      {/* ========================================= */}
      {/* DESKTOP SIDEBAR (Hidden on mobile)          */}
      {/* ========================================= */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-[#0a0a0a] border-r border-white/10 z-40 print:hidden">
        <div className="p-6 border-b border-white/10">
          <div className="font-serif text-xl font-bold text-white tracking-tight">
            UK Sofa Shop <span className="text-orange-500">Admin</span>
          </div>
          {email && (
            <p className="mt-2 truncate text-xs text-zinc-500" title={email}>
              Signed in as <span className="text-zinc-300">{email}</span>
            </p>
          )}
        </div>

        <nav aria-label="Admin sections" className="flex-1 p-4 space-y-2 overflow-y-auto">
          {ADMIN_SECTIONS.map(({ key, href, label }) => {
            const Icon = SECTION_ICONS[key]
            const active = sectionActive(pathname, href)
            return (
              <Link key={href} href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm font-medium transition-all ${
                  active ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-red-400 font-medium hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5" aria-hidden="true" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ========================================= */}
      {/* MOBILE BOTTOM TABS (Hidden on desktop)      */}
      {/* ========================================= */}
      {/* Five tabs that always fit, instead of ten that scrolled sideways.
          pb-safe keeps them above the home indicator; the layout pads the
          page by the same amount so nothing sits behind the bar. */}
      <nav
        aria-label="Admin sections"
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 z-50 pb-safe print:hidden"
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
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm px-1 py-1.5"
              >
                <span className={`grid h-8 w-12 place-items-center rounded-pill transition-colors ${active ? 'bg-orange-500/15 text-orange-500' : 'text-zinc-400'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className={`text-[11px] font-medium leading-none ${active ? 'text-orange-500' : 'text-zinc-400'}`}>
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
