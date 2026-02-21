// src/app/admin/layout.tsx
import Link from 'next/link'
import { Package, ShoppingCart, MessageSquare, LayoutDashboard, Tags } from 'lucide-react'

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
          <Link href="/admin/categories" className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-800 hover:text-white transition-colors">
            <Tags className="w-5 h-5" /> <span className="hidden md:inline">Categories</span>
          </Link>
          <Link href="/admin/reviews" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5" /> <span className="hidden md:inline">Reviews</span>
          </Link>
        </nav>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}