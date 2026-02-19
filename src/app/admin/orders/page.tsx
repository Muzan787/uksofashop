// src/app/admin/orders/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Clock, CheckCircle } from 'lucide-react'

export default async function AdminOrdersPage() {
  const supabase = createClient()

  // Fetch orders, ordered by newest first
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-500">Error loading orders.</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Order Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders?.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-mono text-xs text-slate-500">
                  {order.id.split('-')[0]}...
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-900">{order.customer_name}</div>
                  <div className="text-sm text-slate-500">{order.customer_phone}</div>
                </td>
                <td className="p-4 font-semibold text-slate-900">
                  £{order.total_amount.toFixed(2)}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                    ${order.status === 'pending_cod' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}
                  `}>
                    {order.status === 'pending_cod' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {order.status === 'pending_cod' ? 'Pending (COD)' : 'Completed'}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-500">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}