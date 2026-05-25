// src/app/admin/orders/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Package, Inbox, Printer, MapPin, User, Phone } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import DirectPrintButton from './DirectPrintButton'
import Link from 'next/link'

// Smart WhatsApp Formatter for UK numbers
const getWhatsAppLink = (phone: string) => {
  if (!phone) return '#'
  let cleaned = phone.replace(/\D/g, '') // Remove all non-numbers
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1) // Replace leading 0 with UK code
  } else if (!cleaned.startsWith('44')) {
    cleaned = '44' + cleaned // Prepend UK code if missing
  }
  return `https://wa.me/${cleaned}`
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending_cod: 'bg-stone-100 text-stone-600 border-stone-200',
    confirmed: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }
  const activeStyle = styles[status] || styles.pending_cod

  return (
    <span className={`px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full border ${activeStyle}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id, quantity, price_at_time_of_purchase,
        product_variants ( sku, color, products ( title ) )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">Order Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {orders?.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col">
            
            {/* Header: ID & Status */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-mono text-stone-400">#{order.id.split('-')[0]}</p>
                <p className="text-lg font-bold text-stone-900 mt-1">£{order.total_amount.toFixed(2)}</p>
              </div>
              <StatusBadge status={order.status || 'pending_cod'} />
            </div>

            {/* Customer Details */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-stone-900">{order.customer_name}</p>
                  <p className="text-stone-500">{order.customer_email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                <p className="text-sm text-stone-600 line-clamp-2">{order.shipping_address}</p>
              </div>
            </div>

            {/* Quick Actions (WhatsApp & Print) */}
            <div className="flex gap-2 mb-4">
              <a  
                href={getWhatsAppLink(order.customer_phone)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#128C7E] py-2.5 rounded-xl text-sm font-bold hover:bg-[#25D366]/20 transition"
              >
                {/* Custom WhatsApp SVG Icon */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/></svg>
                WhatsApp
              </a>
              
              <DirectPrintButton order={order} />

            </div>

            {/* Expandable Items */}
            <details className="group/details mb-6">
              <summary className="text-xs font-bold text-orange-600 cursor-pointer hover:text-orange-700 flex items-center gap-1 list-none bg-orange-50 px-3 py-2 rounded-lg">
                <Package className="w-4 h-4" /> 
                {order.order_items.length} Item(s) in Order (Tap to expand)
              </summary>
              <div className="mt-2 space-y-2 px-1">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-stone-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-800">{item.quantity}x {item.product_variants?.products?.title}</span>
                      <span className="text-stone-500 text-xs">
                        {item.product_variants?.color} • SKU: {item.product_variants?.sku}
                      </span>
                    </div>
                    <span className="font-medium text-stone-900">£{item.price_at_time_of_purchase.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Mobile-Optimized Status Update Form */}
            <div className="mt-auto pt-4 border-t border-stone-100">
              <form action={async (formData) => {
                  "use server"
                  await updateOrderStatus(formData)
                }} 
                className="flex flex-col sm:flex-row gap-2"
              >
                <input type="hidden" name="orderId" value={order.id} />
                <select 
                  name="status" 
                  defaultValue={order.status ?? 'pending_cod'}
                  className="flex-1 text-sm border-2 border-stone-200 rounded-xl p-3 bg-white focus:ring-0 focus:border-orange-500 outline-none font-medium text-stone-700"
                >
                  <option value="pending_cod">Pending (COD)</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button type="submit" className="bg-stone-900 text-white p-3 rounded-xl text-sm font-bold hover:bg-stone-800 active:scale-[0.98] transition">
                  Update
                </button>
              </form>
            </div>
            
          </div>
        ))}

        {(!orders || orders.length === 0) && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-stone-200 shadow-sm">
            <Inbox className="w-12 h-12 text-stone-300 mb-3" />
            <p className="text-lg font-bold text-stone-900">No orders yet</p>
            <p className="text-stone-500 text-sm mt-1">New customer orders will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}