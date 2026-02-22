// src/app/admin/orders/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Clock, CheckCircle, Truck, XCircle, Package, Inbox } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending_cod': return <Clock className="w-4 h-4 text-amber-600" />
    case 'processing': return <Clock className="w-4 h-4 text-blue-600" />
    case 'shipped': return <Truck className="w-4 h-4 text-indigo-600" />
    case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />
    default: return <Clock className="w-4 h-4 text-stone-600" />
  }
}

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  // AMAZING SUPABASE FEATURE: Relational querying!
  // We fetch the order, AND its order_items, AND the variant/product details all at once.
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        quantity,
        price_at_time_of_purchase,
        product_variants (
          sku,
          color,
          products ( title )
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-500 p-8">Error loading orders: {error.message}</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-stone-900">Order Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-sm font-semibold text-stone-600 uppercase tracking-wider">
              <th className="p-4 w-32">Order ID</th>
              <th className="p-4">Customer & Items</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {orders?.map((order) => (
              <tr key={order.id} className="hover:bg-stone-50 transition-colors group">
                <td className="p-4 font-mono text-xs text-stone-500 align-top pt-5">
                  {order.id.split('-')[0]}...
                </td>
                
                {/* Customer & Expandable Items Column */}
                <td className="p-4 align-top">
                  <div className="font-medium text-stone-900">{order.customer_name}</div>
                  <div className="text-sm text-stone-500">{order.customer_email} • {order.customer_phone}</div>
                  <div className="text-xs text-stone-400 mt-1 max-w-sm truncate" title={order.shipping_address}>
                    {order.shipping_address}
                  </div>

                  {/* HTML native accordion for items (Zero Javascript required!) */}
                  <details className="mt-3 group/details">
                    <summary className="text-xs font-medium text-amber-600 cursor-pointer hover:text-amber-700 flex items-center gap-1 list-none">
                      <Package className="w-3 h-3" /> 
                      {order.order_items.length} Item(s) in this order (Click to view)
                    </summary>
                    <div className="mt-3 space-y-2 bg-stone-50 p-3 rounded-lg border border-stone-200">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-700">{item.quantity}x</span>
                            <span className="text-stone-900">{item.product_variants?.products?.title || 'Unknown Product'}</span>
                            <span className="text-stone-500 text-xs px-2 py-0.5 bg-stone-200 rounded-full">
                              {item.product_variants?.color || 'N/A'}
                            </span>
                            <span className="text-stone-400 font-mono text-xs">
                              ({item.product_variants?.sku || 'NO-SKU'})
                            </span>
                          </div>
                          <span className="text-stone-600">£{item.price_at_time_of_purchase.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </td>

                <td className="p-4 font-semibold text-stone-900 align-top pt-5">
                  £{order.total_amount.toFixed(2)}
                </td>
                <td className="p-4 align-top pt-5">
                  <div className="flex items-center gap-2 font-medium text-sm capitalize whitespace-nowrap">
                    <StatusIcon status={order.status || 'pending_cod'} />
                    {(order.status || 'pending_cod').replace('_', ' ')}
                  </div>
                </td>
                <td className="p-4 text-right align-top pt-4">
                  <form action={async (formData) => {
                    await updateOrderStatus(formData)
                  }} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <select 
                      name="status" 
                      defaultValue={order.status ?? 'pending_cod'}
                      className="text-sm border border-stone-300 rounded-lg p-1.5 bg-white focus:ring-2 focus:ring-amber-600 outline-none cursor-pointer"
                    >
                      <option value="pending_cod">Pending (COD)</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button type="submit" className="bg-stone-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={5} className="p-12 text-center bg-white">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="w-12 h-12 text-stone-200 mb-3" />
                    <p className="text-lg font-medium text-stone-900">No orders yet</p>
                    <p className="text-stone-500 mt-1">When customers place orders, they will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}