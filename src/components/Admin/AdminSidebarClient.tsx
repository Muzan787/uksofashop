'use client'
// src/components/Admin/AdminSidebarClient.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Package, Tags, LogOut, Star} from 'lucide-react'
import { logout } from '@/app/actions/auth'

const navItems = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Home' },
  { href: '/admin/orders',     icon: ShoppingCart,    label: 'Orders' },
  { href: '/admin/inventory',  icon: Package,         label: 'Inventory' },
  { href: '/admin/categories', icon: Tags,            label: 'Categories' },
  { href: '/admin/reviews',    icon: Star,            label: 'Reviews' },
]

export default function AdminSidebarClient() {
  const pathname = usePathname()

  return (
    <>
      {/* ========================================= */}
      {/* DESKTOP SIDEBAR (Hidden on mobile)          */}
      {/* ========================================= */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-[#0a0a0a] border-r border-white/10 z-40">
        <div className="p-6 border-b border-white/10">
          <div className="font-serif text-xl font-bold text-white tracking-tight">
            Uk Sofashop <span className="text-orange-500">Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  active ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 font-medium hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ========================================= */}
      {/* MOBILE BOTTOM TABS (Hidden on desktop)      */}
      {/* ========================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/10 z-50 pb-safe">
        <div className="flex justify-around items-center px-2 py-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href} className="flex flex-col items-center p-2 w-16">
                <div className={`p-1.5 rounded-full transition-colors ${active ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-400'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] mt-1 font-medium ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
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