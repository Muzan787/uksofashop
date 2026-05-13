'use client'
// src/app/track-order/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { Package, Search, Clock, Truck, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { trackOrderByShortCode } from '@/app/actions/orders'
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

      {/* Progress bar — only for active orders */}
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
          {/* Connector line */}
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
  const [code, setCode]           = useState(sp.get('code') || '')
  const [searching, setSearching] = useState(false)
  const [error, setError]         = useState('')
  const [order, setOrder]         = useState<any>(null)
  const [focused, setFocused]     = useState(false)

  const track = async (val: string) => {
    if (!val.trim()) return
    setSearching(true); setError(''); setOrder(null)
    const res = await trackOrderByShortCode(val.trim())
    res.error ? setError(res.error) : setOrder(res.order)
    setSearching(false)
  }

  useEffect(() => { if (sp.get('code')) track(sp.get('code')!) }, [])

  return (
    <div style={{ maxWidth: 560, width: '100%' }}>

      {/* Search card */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #f0ede8', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: order || error ? 16 : 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package style={{ width: 20, height: 20, color: ACCENT }} />
          </div>
          <div>
            <h1 className="font-playfair" style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', lineHeight: 1.1 }}>Track Your Order</h1>
            <p style={{ fontSize: 12, color: '#78716c', marginTop: 4 }}>Enter your 8-character order reference</p>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === 'Enter' && track(code)}
            placeholder="e.g. A1B2C3D4"
            maxLength={8}
            style={{
              width: '100%', padding: '12px 50px 12px 16px',
              fontSize: 16, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
              border: `1.5px solid ${focused ? ACCENT : '#e7e5e4'}`, borderRadius: 8, outline: 'none',
              background: '#fafaf9', color: '#1c1917', boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
            }}
          />
          {searching && <Loader2 style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: ACCENT, animation: 'spin 0.8s linear infinite' }} />}
        </div>

        <button onClick={() => track(code)} disabled={searching || code.length < 8}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 8, border: 'none',
            background: code.length < 8 ? '#e7e5e4' : ACCENT,
            color: code.length < 8 ? '#a8a29e' : '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: code.length < 8 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Search style={{ width: 14, height: 14 }} />
          {searching ? 'Searching…' : 'Track Order'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
          {error} — Please double-check your reference code.
        </div>
      )}

      {/* Order result */}
      {order && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: `3px solid ${ACCENT}`, background: `${ACCENT}08`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>Order Reference</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#1c1917', letterSpacing: '0.18em' }}>{code}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Placed</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1917' }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <StatusBadge status={order.status} />

            {/* Items */}
            <div style={{ fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {order.order_items?.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafaf9', borderRadius: 7, fontSize: 12 }}>
                  <span style={{ color: '#57534e' }}>
                    {item.quantity}× {item.product_variants?.products?.title ?? 'Product'}
                    {item.product_variants?.color && <span style={{ color: '#a8a29e' }}> · {item.product_variants.color}</span>}
                  </span>
                  <span style={{ fontWeight: 700, color: '#1c1917' }}>£{item.price_at_time_of_purchase.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 12px', background: '#0c0c0b', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Total (COD)</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>£{order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      {/* Dark header */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="font-playfair" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              UK Sofa<span style={{ color: ACCENT }}>Shop</span>
            </span>
          </Link>
          <Link href="/shop/all" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
            className="hover:text-white transition-colors">
            Shop <ArrowRight style={{ width: 11, height: 11 }} />
          </Link>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 60px', display: 'flex', justifyContent: 'center' }}>
        <Suspense fallback={<div style={{ width: '100%', height: 300, background: '#fff', borderRadius: 14, animation: 'pulse 1.5s ease infinite' }} />}>
          <TrackInterface />
        </Suspense>
      </div>
    </div>
  )
}