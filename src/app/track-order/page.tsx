'use client'
// src/app/track-order/page.tsx
import { useState, useEffect, useRef, Suspense } from 'react'
import { Package, Search, Clock, Truck, CheckCircle, XCircle, Loader2, ArrowRight, MapPin, Hash } from 'lucide-react'
import { trackOrder } from '@/app/actions/orders'
import type { TrackedOrder, TrackedOrderItem } from '@/types/orders'
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
  // `code` is the parameter older status emails used, kept so links already
  // sitting in customers' inboxes still fill the field in.
  const [reference, setReference] = useState(sp.get('ref') || sp.get('code') || '')
  const [postcode, setPostcode]   = useState(sp.get('postcode') || '')
  // Starts true when the URL already carries both values, so the spinner is
  // correct on first paint and the effect below never has to set it.
  const [searching, setSearching] = useState(
    () => Boolean((sp.get('ref') || sp.get('code')) && sp.get('postcode'))
  )
  const [error, setError]         = useState('')
  const [order, setOrder]         = useState<TrackedOrder | null>(null)
  const [focused, setFocused]     = useState<'ref' | 'postcode' | null>(null)
  const autoRan                   = useRef(false)

  const canSubmit = reference.replace(/[^0-9a-fA-F]/g, '').length === 8
    && postcode.replace(/[^a-zA-Z0-9]/g, '').length >= 5

  const track = async (ref: string, pc: string) => {
    setSearching(true); setError(''); setOrder(null)

    const res = await trackOrder(ref, pc)
    if (res.error) {
      setError(res.error)
    } else if (res.order) {
      setOrder(res.order)
    }
    setSearching(false)
  }

  // Auto-search when both values arrive in the URL, e.g. from the checkout
  // success screen or a link in an order status email.
  useEffect(() => {
    if (autoRan.current) return
    const ref = sp.get('ref') || sp.get('code')
    const pc = sp.get('postcode')
    if (!ref || !pc) return

    autoRan.current = true
    let cancelled = false

    trackOrder(ref, pc).then(res => {
      if (cancelled) return
      if (res.error) setError(res.error)
      else if (res.order) setOrder(res.order)
      setSearching(false)
    })

    return () => { cancelled = true }
  }, [sp])

  const inputStyle = (isFocused: boolean) => ({
    width: '100%', padding: '12px 16px 12px 42px',
    fontSize: 16, fontFamily: 'monospace', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    border: `1.5px solid ${isFocused ? ACCENT : '#e7e5e4'}`, borderRadius: 8, outline: 'none',
    background: '#fafaf9', color: '#1c1917', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s ease',
  })

  return (
    <div style={{ maxWidth: 640, width: '100%' }}>

      {/* Search card */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #f0ede8', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: order || error ? 16 : 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package style={{ width: 20, height: 20, color: ACCENT }} />
          </div>
          <div>
            <h1 className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: '#1c1917', lineHeight: 1.1 }}>Track Your Order</h1>
            <p style={{ fontSize: 13, color: '#78716c', marginTop: 4, lineHeight: 1.5 }}>
              Enter your order reference and the delivery postcode. Both are on your confirmation email.
            </p>
          </div>
        </div>

        {/* Order reference */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
          Order Reference
        </label>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Hash style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: focused === 'ref' ? ACCENT : '#a8a29e', pointerEvents: 'none', zIndex: 1 }} />
          <input
            value={reference}
            onChange={e => setReference(e.target.value.toUpperCase())}
            onFocus={() => setFocused('ref')} onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && canSubmit && track(reference, postcode)}
            placeholder="5D786B72"
            maxLength={9}
            autoComplete="off"
            spellCheck={false}
            aria-label="Order reference"
            style={inputStyle(focused === 'ref')}
          />
        </div>

        {/* Postcode */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
          Delivery Postcode
        </label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <MapPin style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: focused === 'postcode' ? ACCENT : '#a8a29e', pointerEvents: 'none', zIndex: 1 }} />
          <input
            value={postcode}
            onChange={e => setPostcode(e.target.value.toUpperCase())}
            onFocus={() => setFocused('postcode')} onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && canSubmit && track(reference, postcode)}
            placeholder="BB6 7LS"
            maxLength={9}
            autoComplete="postal-code"
            spellCheck={false}
            aria-label="Delivery postcode"
            style={inputStyle(focused === 'postcode')}
          />
          {searching && <Loader2 style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: ACCENT, animation: 'spin 0.8s linear infinite' }} />}
        </div>

        <button onClick={() => track(reference, postcode)} disabled={searching || !canSubmit}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 0', borderRadius: 8, border: 'none',
            background: !canSubmit ? '#e7e5e4' : ACCENT,
            color: !canSubmit ? '#a8a29e' : '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: !canSubmit ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Search style={{ width: 14, height: 14 }} />
          {searching ? 'Searching…' : 'Track My Order'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {/* Result */}
      {order && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>

          <div style={{ padding: '16px 20px', background: `${ACCENT}08`, borderBottom: `2px solid ${ACCENT}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#1c1917', letterSpacing: '0.1em', marginBottom: 4 }}>
                #{order.id.split('-')[0].toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: '#78716c' }}>
                Placed {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1c1917' }}>£{Number(order.total_amount).toFixed(0)}</div>
          </div>

          <div style={{ padding: '20px' }}>
            <StatusBadge status={order.status} />

            <div style={{ fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {order.order_items?.map((item: TrackedOrderItem, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fafaf9', borderRadius: 7, fontSize: 13 }}>
                  <span style={{ color: '#57534e' }}>
                    <span style={{ fontWeight: 700, color: '#1c1917', marginRight: 6 }}>{item.quantity}×</span>
                    {item.product_variants?.products?.title ?? 'Product'}
                    {item.product_variants?.color && <span style={{ color: '#a8a29e' }}> · {item.product_variants.color}</span>}
                  </span>
                  <span style={{ fontWeight: 700, color: '#1c1917', flexShrink: 0 }}>£{Number(item.price_at_time_of_purchase).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', background: '#0c0c0b', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {Number(order.delivery_total ?? 0) > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    <span>Your order</span>
                    <span>£{Number(order.items_subtotal ?? order.total_amount).toFixed(2)}</span>
                  </div>
                  {Number(order.fee_upstairs ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      <span>Upstairs delivery{order.delivery_has_lift ? ' (lift)' : order.delivery_floor ? ` (${order.delivery_floor} up)` : ''}</span>
                      <span>£{Number(order.fee_upstairs).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(order.fee_assembly ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      <span>Assembly</span>
                      <span>£{Number(order.fee_assembly).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(order.fee_sofa_removal ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      <span>Old sofa removal</span>
                      <span>£{Number(order.fee_sofa_removal).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Total due on delivery</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>£{Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
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
              UK Sofa <span style={{ color: ACCENT }}>Shop</span>
            </span>
          </Link>
          <Link href="/shop/all" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
            className="hover:text-white transition-colors">
            Shop <ArrowRight style={{ width: 11, height: 11 }} />
          </Link>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 60px', display: 'flex', justifyContent: 'center' }}>
        <Suspense fallback={<div style={{ width: '100%', height: 300, background: '#fff', borderRadius: 14 }} />}>
          <TrackInterface />
        </Suspense>
      </div>
    </div>
  )
}
