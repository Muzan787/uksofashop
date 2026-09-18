import type { Metadata } from 'next'
// src/app/admin/page.tsx
import { createClient } from '@/utils/supabase/server'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { ShoppingBag, PackagePlus, ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'


export const metadata: Metadata = { title: 'Overview' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch metrics silently and rapidly
  const { data: orders } = await supabase.from('orders').select('total_amount, status')

  /**
   * "Needs attention" rather than a literal status match.
   *
   * This counted `status === 'pending'`, but the database default is
   * 'pending_cod' and nothing ever writes plain 'pending' - so the tile has
   * read zero since launch. Confirmed orders are included because they are
   * still waiting to be dispatched, which is work outstanding.
   */
  const NEEDS_ATTENTION = ['pending_cod', 'confirmed']
  const pendingOrders = orders?.filter(o => NEEDS_ATTENTION.includes(o.status ?? 'pending_cod')).length || 0

  /**
   * Cancelled orders were being counted as revenue. They are excluded now.
   *
   * Unconfirmed cash-on-delivery orders are also excluded: about a quarter are
   * never completed, so counting them inflates the figure by roughly a third.
   * This tile shows money that is realistically going to be collected, and
   * only becomes real on delivery.
   */
  const COUNTS_AS_REVENUE = ['confirmed', 'processing', 'shipped', 'delivered']
  const totalRevenue = orders
    ?.filter(o => COUNTS_AS_REVENUE.includes(o.status ?? ''))
    .reduce((sum, order) => sum + Number(order.total_amount), 0) || 0

  // The tile is labelled "Active Products" but this counted deactivated ones
  // too, because the is_active filter was missing.
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Shoppers who asked for a reminder and have not converted or expired. The
  // table is service-role only (see /admin/leads), so this one count uses the
  // admin client rather than the session client the rest of the page does.
  const { count: leadCount } = await createUntypedAdminClient()
    .from('checkout_recovery_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  const leadsWaiting = leadCount ?? 0

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
        <div className="col-span-2 lg:col-span-1 bg-zinc-900 p-5 lg:p-6 rounded-md lg:rounded-lg shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
          </div>
          <h3 className="text-zinc-400 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Total Revenue</h3>
          <p className="text-3xl lg:text-4xl font-bold text-white">£{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 lg:p-6 rounded-md lg:rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Pending Orders</h3>
          <p className="text-2xl lg:text-3xl font-bold text-orange-500">{pendingOrders}</p>
        </div>

        {/* A link, not just a number: the point of a lead is getting back to them. */}
        <Link href="/admin/leads" className="bg-white p-5 lg:p-6 rounded-md lg:rounded-lg border border-zinc-200 shadow-sm hover:border-zinc-300 transition">
          <h3 className="text-zinc-500 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Leads Waiting</h3>
          <p className={`text-2xl lg:text-3xl font-bold ${leadsWaiting > 0 ? 'text-whatsapp-dark' : 'text-zinc-900'}`}>{leadsWaiting}</p>
        </Link>

        <div className="col-span-2 lg:col-span-1 bg-white p-5 lg:p-6 rounded-md lg:rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-zinc-500 text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">Active Products</h3>
          <p className="text-2xl lg:text-3xl font-bold text-zinc-900">{productCount || 0}</p>
        </div>
      </div>

      {/* Quick Actions - Ergonomic touch targets for mobile */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/inventory/new" 
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-4 rounded-sm font-medium hover:bg-orange-600 active:scale-[0.98] transition-all shadow-sm">
            <PackagePlus className="w-5 h-5" />
            Add New Product
          </Link>
          
          <Link href="/admin/orders" 
            className="flex items-center justify-between sm:justify-center gap-2 bg-white text-zinc-900 border border-zinc-200 px-5 py-4 rounded-sm font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-zinc-400" />
              <span>Process Orders</span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 sm:hidden" />
          </Link>

          <Link href="/admin/leads"
            className="flex items-center justify-between sm:justify-center gap-2 bg-white text-zinc-900 border border-zinc-200 px-5 py-4 rounded-sm font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-whatsapp-dark" />
              <span>Get Back to Leads</span>
              {leadsWaiting > 0 && (
                <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-whatsapp-dark px-1.5 text-xs font-bold text-white">
                  {leadsWaiting}
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 sm:hidden" />
          </Link>
        </div>
      </div>
      
    </div>
  )
}