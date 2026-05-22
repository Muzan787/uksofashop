// src/app/admin/page.tsx
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  TrendingUp, ShoppingCart, Package, Star,
  Clock, CheckCircle, Truck, XCircle, ArrowRight,
  AlertTriangle, Plus,
  Tags,
} from 'lucide-react'
// Import your new Client Components! Adjust the path based on your folder structure.
import { StatCard } from './components/StatCard' 
import { QuickActionLink } from './components/QuickActionLink'

const ACCENT = '#d4871a'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending_cod: { bg: '#fef9ec', color: '#b45309', label: 'Pending COD'  },
  confirmed:   { bg: '#fef9ec', color: ACCENT,    label: 'Confirmed'    },
  processing:  { bg: '#eff6ff', color: '#2563eb', label: 'Processing'   },
  shipped:     { bg: '#f5f3ff', color: '#7c3aed', label: 'Shipped'      },
  delivered:   { bg: '#f0fdf4', color: '#16a34a', label: 'Delivered'    },
  cancelled:   { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled'    },
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { data: orders },
    { count: productCount },
    { count: pendingReviews },
    { data: lowStockVariants },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('orders').select('total_amount, status, created_at'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('product_variants').select('id, color, stock_quantity, products(title)').lte('stock_quantity', 3).gt('stock_quantity', 0),
    supabase.from('orders').select('id, customer_name, total_amount, status, created_at').order('created_at', { ascending: false }).limit(6),
  ])

  const confirmedRevenue = orders?.filter(o => o.status && !['cancelled','pending_cod'].includes(o.status))
    .reduce((s, o) => s + Number(o.total_amount), 0) || 0

  const totalOrders = orders?.length || 0
  const pendingCount = orders?.filter(o => o.status === 'pending_cod').length || 0

  // Revenue last 7 days
  const now = Date.now()
  const rev7 = orders?.filter(o => {
    if (!o.created_at) return false
    const d = new Date(o.created_at).getTime()
    return now - d < 7 * 86400000 && o.status && !['cancelled'].includes(o.status)
  }).reduce((s, o) => s + Number(o.total_amount), 0) || 0

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#78716c' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Alerts */}
      {(pendingCount > 0 || (lowStockVariants && lowStockVariants.length > 0) || (pendingReviews || 0) > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {pendingCount > 0 && (
            <Link href="/admin/orders" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 10 }}>
                <Clock style={{ width: 15, height: 15, color: '#d97706', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  {pendingCount} order{pendingCount > 1 ? 's' : ''} awaiting COD confirmation
                </span>
                <ArrowRight style={{ width: 12, height: 12, color: '#d97706', marginLeft: 'auto' }} />
              </div>
            </Link>
          )}
          {lowStockVariants && lowStockVariants.length > 0 && (
            <Link href="/admin/inventory" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                <AlertTriangle style={{ width: 15, height: 15, color: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                  {lowStockVariants.length} variant{lowStockVariants.length > 1 ? 's' : ''} running low on stock
                </span>
                <ArrowRight style={{ width: 12, height: 12, color: '#dc2626', marginLeft: 'auto' }} />
              </div>
            </Link>
          )}
          {(pendingReviews || 0) > 0 && (
            <Link href="/admin/reviews" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10 }}>
                <Star style={{ width: 15, height: 15, color: '#7c3aed', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#5b21b6', fontWeight: 600 }}>
                  {pendingReviews} review{(pendingReviews || 0) > 1 ? 's' : ''} pending approval
                </span>
                <ArrowRight style={{ width: 12, height: 12, color: '#7c3aed', marginLeft: 'auto' }} />
              </div>
            </Link>
          )}
        </div>
      )}


      {/* Stat cards (Now using the imported Client Component) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard 
          label="Confirmed Revenue" 
          value={`£${confirmedRevenue.toFixed(0)}`} 
          sub={`£${rev7.toFixed(0)} last 7 days`} 
          icon={<TrendingUp style={{ width: 16, height: 16, color: '#16a34a' }} />} 
          accent="#16a34a" 
          href="/admin/orders" 
        />
        <StatCard 
          label="Total Orders"      
          value={String(totalOrders)}            
          sub={`${pendingCount} pending`}           
          icon={<ShoppingCart style={{ width: 16, height: 16, color: ACCENT }} />}  
          accent={ACCENT}    
          href="/admin/orders" 
        />
        <StatCard 
          label="Active Products"   
          value={String(productCount || 0)}       
          sub="in inventory"                       
          icon={<Package style={{ width: 16, height: 16, color: '#2563eb' }} />}       
          accent="#2563eb"   
          href="/admin/inventory" 
        />
        <StatCard 
          label="Pending Reviews"   
          value={String(pendingReviews || 0)}     
          sub="awaiting moderation"                
          icon={<Star style={{ width: 16, height: 16, color: '#7c3aed' }} />}          
          accent="#7c3aed"   
          href="/admin/reviews" 
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

        {/* Recent orders */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden', gridColumn: 'span 2' }} className="col-span-2 lg:col-span-1" >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f5f0e8' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>Recent Orders</span>
            <Link href="/admin/orders" style={{ fontSize: 11, color: ACCENT, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentOrders?.map((order, i) => {
              const st = STATUS_STYLES[(order.status ?? 'pending_cod') as string] || STATUS_STYLES.pending_cod
              return (
                <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < (recentOrders.length - 1) ? '1px solid #fafaf9' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>{order.customer_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customer_name}</div>
                    <div style={{ fontSize: 10, color: '#a8a29e', fontFamily: 'monospace' }}>{order.id.substring(0, 8).toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>£{Number(order.total_amount).toFixed(0)}</div>
                    <div style={{ display: 'inline-flex', marginTop: 2, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {st.label}
                    </div>
                  </div>
                </div>
              )
            })}
            {(!recentOrders || recentOrders.length === 0) && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#a8a29e', fontSize: 13 }}>No orders yet</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Low stock */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f5f0e8' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle style={{ width: 14, height: 14, color: '#ef4444' }} />
                Low Stock
              </span>
              <Link href="/admin/inventory" style={{ fontSize: 11, color: ACCENT, textDecoration: 'none' }}>Manage</Link>
            </div>
            {lowStockVariants && lowStockVariants.length > 0 ? (
              <div style={{ padding: '8px 0' }}>
                {lowStockVariants.slice(0, 5).map((v: any) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1c1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.products?.title}</div>
                      <div style={{ fontSize: 10, color: '#a8a29e' }}>{v.color}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>{v.stock_quantity} left</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 18px', textAlign: 'center', color: '#a8a29e', fontSize: 12 }}>
                ✓ All variants well-stocked
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ background: '#0c0c0b', borderRadius: 12, padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { href: '/admin/inventory/new', label: 'Add New Product', icon: <Plus style={{ width: 14, height: 14 }} /> },
                { href: '/admin/orders',        label: 'Manage Orders',   icon: <ShoppingCart style={{ width: 14, height: 14 }} /> },
                { href: '/admin/categories',    label: 'Edit Categories', icon: <Tags style={{ width: 14, height: 14 }} /> },
              ].map(({ href, label, icon }) => (
                <QuickActionLink 
                  key={href} 
                  href={href} 
                  label={label} 
                  icon={icon} 
                  accent={ACCENT} 
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
} 