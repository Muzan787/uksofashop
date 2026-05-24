// src/app/admin/page.tsx
import { createClient } from '@/utils/supabase/server'
import { DollarSign, ShoppingBag, PackagePlus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch metrics silently and rapidly
  const { data: orders } = await supabase.from('orders').select('total_amount, status')
  const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-zinc-900 tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your storefront and orders.</p>
        </div>
      </header>

      {/* Cinematic Mobile-First Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        
        {/* Primary Metric: Revenue */}
        <div className="col-span-2 lg:col-span-1 bg-zinc-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
          </div>
          <h3 className="text-zinc-400 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Total Revenue</h3>
          <p className="text-3xl lg:text-4xl font-bold text-white">£{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Pending Orders</h3>
          <p className="text-2xl lg:text-3xl font-bold text-orange-500">{pendingOrders}</p>
        </div>

        <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Active Products</h3>
          <p className="text-2xl lg:text-3xl font-bold text-zinc-900">{productCount || 0}</p>
        </div>
      </div>

      {/* Quick Actions - Ergonomic touch targets for mobile */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/inventory/new" 
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-4 rounded-xl font-medium hover:bg-orange-600 active:scale-[0.98] transition-all shadow-sm">
            <PackagePlus className="w-5 h-5" />
            Add New Product
          </Link>
          
          <Link href="/admin/orders" 
            className="flex items-center justify-between sm:justify-center gap-2 bg-white text-zinc-900 border border-zinc-200 px-5 py-4 rounded-xl font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-zinc-400" />
              <span>Process Orders</span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 sm:hidden" />
          </Link>
        </div>
      </div>
      
    </div>
  )
}