
// src/app/admin/orders/page.tsx
import { createClient } from '@/utils/supabase/server'
import { updateOrderStatus } from '@/app/actions/orders'
import { Clock, CheckCircle, Truck, XCircle, Package, Inbox, ChevronDown } from 'lucide-react'

const ACCENT = '#d4871a'

const STATUS_MAP: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  pending_cod: { bg: '#fef9ec', color: '#b45309', label: 'Pending COD', dot: '#f59e0b' },
  confirmed:   { bg: '#fef9ec', color: ACCENT,    label: 'Confirmed',   dot: ACCENT    },
  processing:  { bg: '#eff6ff', color: '#2563eb', label: 'Processing',  dot: '#3b82f6' },
  shipped:     { bg: '#f5f3ff', color: '#7c3aed', label: 'Shipped',     dot: '#8b5cf6' },
  delivered:   { bg: '#f0fdf4', color: '#16a34a', label: 'Delivered',   dot: '#22c55e' },
  cancelled:   { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled',   dot: '#ef4444' },
}

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_items(id, quantity, price_at_time_of_purchase, product_variants(sku, color, products(title)))')
    .order('created_at', { ascending: false })

  if (error) return (
    <div style={{ padding: 32, color: '#dc2626', fontSize: 13 }}>Error: {error.message}</div>
  )

  const stats = Object.entries(STATUS_MAP).map(([key, v]) => ({
    ...v, key, count: orders?.filter(o => o.status === key).length || 0
  }))

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>Orders</h1>
        <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>{orders?.length || 0} total orders</p>
      </div>

      {/* Status breakdown pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {stats.filter(s => s.count > 0).map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 20, fontSize: 11, color: s.color, fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
            {s.label}: {s.count}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
        {(!orders || orders.length === 0) ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Inbox style={{ width: 36, height: 36, color: '#d6d3d1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1917', marginBottom: 6 }}>No orders yet</p>
            <p style={{ fontSize: 12, color: '#a8a29e' }}>When customers place orders, they'll appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f0ede8' }}>
                  {['Ref', 'Customer', 'Items', 'Total', 'Date', 'Status', 'Update'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.14em', textAlign: h === 'Update' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const statusKey = order.status ?? 'pending_cod'
                  const st = STATUS_MAP[statusKey] || STATUS_MAP.pending_cod
                  return (
                    <tr key={order.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid #fafaf9' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Ref */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1c1917', background: '#f5f0e8', padding: '3px 7px', borderRadius: 5 }}>
                          {order.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      {/* Customer */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1917' }}>{order.customer_name}</div>
                        <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>{order.customer_email}</div>
                      </td>
                      {/* Items (expandable) */}
                      <td style={{ padding: '14px 16px' }}>
                        <details>
                          <summary style={{ fontSize: 11, color: ACCENT, fontWeight: 600, cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}>
                            <Package style={{ width: 12, height: 12 }} />
                            {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                          </summary>
                          <div style={{ marginTop: 8, background: '#fafaf9', border: '1px solid #f0ede8', borderRadius: 7, padding: '8px 10px', minWidth: 200 }}>
                            {order.order_items.map((item: any) => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', fontSize: 11, borderBottom: '1px solid #f5f0e8' }}>
                                <span style={{ color: '#57534e' }}>
                                  <strong>{item.quantity}×</strong> {item.product_variants?.products?.title}
                                  {item.product_variants?.color && <span style={{ color: '#a8a29e' }}> · {item.product_variants.color}</span>}
                                </span>
                                <span style={{ color: '#1c1917', fontWeight: 600 }}>£{item.price_at_time_of_purchase.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                      {/* Total */}
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 800, color: '#1c1917', whiteSpace: 'nowrap' }}>
                        £{Number(order.total_amount).toFixed(2)}
                      </td>
                      {/* Date */}
                      <td style={{ padding: '14px 16px', fontSize: 11, color: '#a8a29e', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      {/* Status badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      {/* Update */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <form action={async (fd) => { 'use server'; await updateOrderStatus(fd) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <select name="status" defaultValue={order.status ?? 'pending_cod'}
                            style={{ fontSize: 11, border: '1px solid #e8e2da', borderRadius: 7, padding: '6px 10px', background: '#fff', color: '#57534e', outline: 'none', cursor: 'pointer' }}>
                            {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                          </select>
                          <button type="submit"
                            style={{ padding: '6px 12px', background: '#0c0c0b', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1c1917')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#0c0c0b')}
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 