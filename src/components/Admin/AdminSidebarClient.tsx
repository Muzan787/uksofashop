'use client'
// src/components/Admin/AdminSidebarClient.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import {
  LayoutDashboard, ShoppingCart, Package, Tags,
  Star, LogOut, Menu, X, ChevronRight, ExternalLink,
} from 'lucide-react'

const ACCENT = '#d4871a'

const nav = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders',     icon: ShoppingCart,    label: 'Orders'    },
  { href: '/admin/inventory',  icon: Package,         label: 'Inventory' },
  { href: '/admin/categories', icon: Tags,            label: 'Categories'},
  { href: '/admin/reviews',    icon: Star,            label: 'Reviews'   },
]

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            UK Sofa<span style={{ color: ACCENT }}>Shop</span>
          </div>
          <div style={{ fontSize: 9, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 2 }}>Admin Console</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#78716c' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, color: '#3f3f3f', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, padding: '6px 10px', marginBottom: 4 }}>
          Navigation
        </div>
        {nav.map(({ href, icon: Icon, label }) => {
          const exact   = href === '/admin'
          const active  = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none',
                background: active ? `${ACCENT}18` : 'transparent',
                color: active ? ACCENT : '#78716c',
                fontWeight: active ? 700 : 500, fontSize: 13,
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2.5, background: ACCENT, borderRadius: '0 2px 2px 0' }} />}
              <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
              {label}
              {active && <ChevronRight style={{ width: 12, height: 12, marginLeft: 'auto', opacity: 0.5 }} />}
            </Link>
          )
        })}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 10px' }} />

        <Link href="/" target="_blank"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, textDecoration: 'none', color: '#57534e', fontSize: 13 }}
        >
          <ExternalLink style={{ width: 14, height: 14 }} />
          View Storefront
        </Link>
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <form action={logout}>
          <button type="submit"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13, fontWeight: 600, transition: 'background 0.15s' }}>
            <LogOut style={{ width: 14, height: 14 }} />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminSidebarClient() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  const sidebarBg = '#0c0c0b'

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 z-40"
        style={{ background: sidebarBg, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between"
        style={{ background: sidebarBg, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', height: 52 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#fff' }}>
          UK Sofa<span style={{ color: ACCENT }}>Shop</span>
          <span style={{ fontSize: 10, color: '#57534e', marginLeft: 6 }}>Admin</span>
        </div>
        <button onClick={() => setOpen(true)}
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a8a29e' }}>
          <Menu style={{ width: 16, height: 16 }} />
        </button>
      </div>
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden" style={{ height: 52 }} />

      {/* Mobile drawer */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, background: sidebarBg, zIndex: 51, animation: 'slideInRight 0.25s ease' }}>
            <SidebarContent pathname={pathname} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}