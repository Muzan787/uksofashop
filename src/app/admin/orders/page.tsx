// src/app/admin/orders/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Clock, CheckCircle, Truck, XCircle } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'

// Helper function to render the correct icon based on status
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending_cod': return <Clock className="w-4 h-4 text-amber-600" />
    case 'processing': return <Clock className="w-4 h-4 text-blue-600" />
    case 'shipped': return <Truck className="w-4 h-4 text-indigo-600" />
    case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />
    default: return <Clock className="w-4 h-4 text-gray-600" />
  }
}

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  // Fetch orders, ordered by newest first
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-500 p-8">Error loading orders.</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-stone-900">Order Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-sm font-semibold text-stone-600 uppercase tracking-wider">
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Update Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {orders?.map((order) => (
              <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                <td className="p-4 font-mono text-xs text-stone-500">
                  {order.id.split('-')[0]}...
                </td>
                <td className="p-4">
                  <div className="font-medium text-stone-900">{order.customer_name}</div>
                  <div className="text-sm text-stone-500">{order.customer_phone}</div>
                  <div className="text-xs text-stone-400 mt-1 max-w-xs truncate" title={order.shipping_address}>
                    {order.shipping_address}
                  </div>
                </td>
                <td className="p-4 font-semibold text-stone-900">
                  £{order.total_amount.toFixed(2)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 font-medium text-sm capitalize">
                    <StatusIcon status={order.status} />
                    {order.status.replace('_', ' ')}
                  </div>
                </td>
                <td className="p-4 text-right">
                  {/* Inline Form to Update Status */}
                  <form action={updateOrderStatus} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <select 
                      name="status" 
                      defaultValue={order.status}
                      className="text-sm border border-stone-300 rounded-lg p-1.5 bg-white focus:ring-2 focus:ring-amber-600 outline-none"
                    >
                      <option value="pending_cod">Pending (COD)</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button 
                      type="submit" 
                      className="bg-stone-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-500">
                  No orders found. Wait for customers to check out!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}