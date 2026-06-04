'use client'
// src/app/track-order/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { Package, Search, Clock, Truck, CheckCircle, XCircle, Loader2, ArrowRight, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { trackOrdersByPostcode } from '@/app/actions/orders'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ACCENT = '#d4871a'

const STATUS_MAP: Record<string, { icon: typeof Package; color: string; bg: string; label: string; desc: string; step: number }> = {
  pending_cod: { icon: Clock,        color: '#d97706', bg: '#fffbeb', label: 'Awaiting Confirmation', desc: 'Please check your email and confirm your order to begin processing.', step: 1 },
  confirmed:   { icon: CheckCircle,  color: ACCENT,    bg: '#fef9f0', label: 'Order Confirmed',        desc: 'Great! Your order is confirmed and queued for preparation.',          step: 2 },
  processing:  { icon: Package,      color: '#2563eb', bg: '#eff6ff', label: 'Being Prepared',         desc: 'Your sofa is being quality-checked and wrapped for delivery.',        step: 3 },
  shipped:     { icon: Truck,        color: '#7c3aed', bg: '#f5f3ff', label: 'Out for Delivery',       desc: 'Your sofa is on its way! Our team will call before arrival.',          step: 4 },
  delivered:   { icon: CheckCircle,  color: '#16a34a', bg: '#f0fdf4', label: 'Delivered',              desc: 'Your order has been delivered. Enjoy your new sofa!',                 step: 5 },
  cancelled:   { icon: XCircle,      color: '#dc2626', bg: '#fef2f2', label: 'Cancelled',              desc: 'This order has been cancelled. Contact us if you need help.',          step: 0 },
}

const STEPS = ['Confirmed', 'Preparing', 'Dispatched', 'Delivered']

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { icon: Package, color: '#78716c', bg: '#f5f5f4', label: 'Unknown', desc: '', step: 0 }
  const Icon = cfg.icon
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}22`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 20, height: 20, color: cfg.color }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 4 }}>Current Status</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1917' }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: '#78716c', marginTop: 4, lineHeight: 1.5 }}>{cfg.desc}</div>
        </div>
      </div>

      {cfg.step > 0 && status !== 'cancelled' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: cfg.step > i + 1 ? cfg.color : cfg.step === i + 1 ? cfg.color : '#e7e5e4',
                  border: `2px solid ${cfg.step > i + 1 ? cfg.color : cfg.step === i + 1 ? cfg.color : '#e7e5e4'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 4, transition: 'all 0.4s ease',
                  boxShadow: cfg.step === i + 1 ? `0 0 0 4px ${cfg.color}22` : 'none',
                }}>
                  {cfg.step > i + 1 && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                  {cfg.step === i + 1 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <span style={{ fontSize: 9, color: cfg.step >= i + 1 ? cfg.color : '#a8a29e', fontWeight: cfg.step >= i + 1 ? 700 : 400, textAlign: 'center', letterSpacing: '0.08em' }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', height: 2, background: '#e7e5e4', borderRadius: 2, margin: '-42px 11px 22px', zIndex: 0 }}>
            <div style={{ height: '100%', borderRadius: 2, background: cfg.color, width: `${Math.max(0, (cfg.step - 1) / (STEPS.length - 1)) * 100}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}
    </div>
  )
}

function TrackInterface() {
  const sp = useSearchParams()
  const [postcode, setPostcode]   = useState(sp.get('postcode') || '')
  const [searching, setSearching] = useState(false)
  const [error, setError]         = useState('')
  const [orders, setOrders]       = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [focused, setFocused]     = useState(false)

  const track = async (val: string) => {
    if (!val.trim()) return
    setSearching(true); setError(''); setOrders([])
    
    const res = await trackOrdersByPostcode(val)
    if (res.error) {
      setError(res.error)
    } else if (res.orders && res.orders.length > 0) {
      setOrders(res.orders)
      // Automatically expand the most recent order
      setExpandedId(res.orders[0].id)
    }
    setSearching(false)
  }

  // Auto-search if postcode is passed in the URL (e.g. from checkout success page)
  useEffect(() => { 
    if (sp.get('postcode')) track(sp.get('postcode')!) 
  }, [])

  return (
    <div style={{ maxWidth: 640, width: '100%' }}>

      {/* Search card */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #f0ede8', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: orders.length > 0 || error ? 16 : 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin style={{ width: 20, height: 20, color: ACCENT }} />
          </div>
          <div>
            <h1 className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: '#1c1917', lineHeight: 1.1 }}>Track Your Orders</h1>
            <p style={{ fontSize: 12, color: '#78716c', marginTop: 4 }}>Enter your delivery postcode to view all your orders.</p>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            value={postcode}
            onChange={e => setPostcode(e.target.value.toUpperCase())}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === 'Enter' && track(postcode)}
            placeholder="e.g. SW1A 1AA"
            style={{
              width: '100%', padding: '12px 50px 12px 16px',
              fontSize: 16, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
              border: `1.5px solid ${focused ? ACCENT : '#e7e5e4'}`, borderRadius: 8, outline: 'none',
              background: '#fafaf9', color: '#1c1917', boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
            }}
          />
          {searching && <Loader2 style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: ACCENT, animation: 'spin 0.8s linear infinite' }} />}
        </div>

        <button onClick={() => track(postcode)} disabled={searching || postcode.length < 4}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 8, border: 'none',
            background: postcode.length < 4 ? '#e7e5e4' : ACCENT,
            color: postcode.length < 4 ? '#a8a29e' : '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: postcode.length < 4 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Search style={{ width: 14, height: 14 }} />
          {searching ? 'Searching…' : 'Find My Orders'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Orders List Accordion */}
      {orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.15em', marginLeft: 4, marginBottom: 4 }}>
            Found {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
          </div>

          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const shortId = `#${order.id.split('-')[0].toUpperCase()}`;
            const statusCfg = STATUS_MAP[order.status] ?? STATUS_MAP.pending_cod;
            
            return (
              <div key={order.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}>
                
                {/* Accordion Header (Always visible) */}
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ width: '100%', padding: '16px 20px', background: isExpanded ? `${ACCENT}08` : 'transparent', border: 'none', borderBottom: isExpanded ? `2px solid ${ACCENT}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s ease' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#1c1917', letterSpacing: '0.1em' }}>{shortId}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${statusCfg.color}20`, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#78716c' }}>
                      Placed {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1c1917' }}>£{order.total_amount.toFixed(0)}</div>
                    {isExpanded ? <ChevronUp style={{ width: 18, height: 18, color: '#a8a29e' }} /> : <ChevronDown style={{ width: 18, height: 18, color: '#a8a29e' }} />}
                  </div>
                </button>

                {/* Accordion Body (Only visible if expanded) */}
                {isExpanded && (
                  <div style={{ padding: '20px', animation: 'fadeIn 0.3s ease' }}>
                    <StatusBadge status={order.status} />

                    {/* Items */}
                    <div style={{ fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Items</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {order.order_items?.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fafaf9', borderRadius: 7, fontSize: 12 }}>
                          <span style={{ color: '#57534e' }}>
                            <span style={{ fontWeight: 700, color: '#1c1917', marginRight: 6 }}>{item.quantity}×</span> 
                            {item.product_variants?.products?.title ?? 'Product'}
                            {item.product_variants?.color && <span style={{ color: '#a8a29e' }}> · {item.product_variants.color}</span>}
                          </span>
                          <span style={{ fontWeight: 700, color: '#1c1917' }}>£{item.price_at_time_of_purchase.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#0c0c0b', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Total (COD)</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>£{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      {/* Dark header */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="font-playfair" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Uk Sofashop<span style={{ color: ACCENT }}>Group</span>
            </span>
          </Link>
          <Link href="/shop/all" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
            className="hover:text-white transition-colors">
            Shop <ArrowRight style={{ width: 11, height: 11 }} />
          </Link>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 60px', display: 'flex', justifyContent: 'center' }}>
        <Suspense fallback={<div style={{ width: '100%', height: 300, background: '#fff', borderRadius: 14, animation: 'pulse 1.5s ease infinite' }} />}>
          <TrackInterface />
        </Suspense>
      </div>
    </div>
  )
}