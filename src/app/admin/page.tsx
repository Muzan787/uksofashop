// src/app/admin/page.tsx
import { createClient } from '@/utils/supabase/server'
import { DollarSign, ShoppingCart, Package, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // 1. Fetch Total Orders & Revenue
  const { data: orders } = await supabase.from('orders').select('total_amount')
  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0

  // 2. Fetch Total Products
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  // 3. Fetch Pending Reviews Count
  const { count: pendingReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-medium">Total Revenue</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">£{totalRevenue.toFixed(2)}</p>
        </div>

        {/* Orders Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-medium">Total Orders</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalOrders}</p>
        </div>

        {/* Inventory Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-medium">Products</h3>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{productCount || 0}</p>
        </div>

        {/* Reviews Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-medium">Pending Reviews</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{pendingReviews || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/admin/inventory" className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition">
            Add New Product
          </Link>
          <Link href="/admin/orders" className="bg-white text-slate-900 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition">
            View Orders
          </Link>
        </div>
      </div>
    </div>
  )
}