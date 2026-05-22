// src/app/admin/layout.tsx
import Link from 'next/link'
import { Package, ShoppingCart, MessageSquare, LayoutDashboard, Tags, LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col min-h-[60px] md:min-h-screen">
        <div className="p-4 md:p-6 bg-slate-950">
          <h2 className="text-xl font-bold text-white tracking-tight">Admin Console</h2>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 flex md:block overflow-x-auto md:overflow-hidden">
          <Link href="/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard className="w-5 h-5" /> <span className="hidden md:inline">Dashboard</span>
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <ShoppingCart className="w-5 h-5" /> <span className="hidden md:inline">Orders</span>
          </Link>
          <Link href="/admin/inventory" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Package className="w-5 h-5" /> <span className="hidden md:inline">Inventory</span>
          </Link>
          <Link href="/admin/categories" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Tags className="w-5 h-5" /> <span className="hidden md:inline">Categories</span>
          </Link>
          <Link href="/admin/reviews" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5" /> <span className="hidden md:inline">Reviews</span>
          </Link>
        </nav>
        
        {/* Admin Sign Out Button */}
        <div className="p-4 mt-auto border-t border-slate-800">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline font-medium">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}