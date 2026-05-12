// src/app/confirm-order/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { confirmCustomerOrder } from '@/app/actions/orders'
import { notFound } from 'next/navigation'
import {
  CheckCircle, AlertTriangle, Package,
  Truck, Wallet, ShieldCheck, MapPin,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Params = Promise<{ id: string }>

const ACCENT = '#d4871a'

export default async function ConfirmOrderPage(props: { params: Params }) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`*, order_items(quantity, price_at_time_of_purchase, product_variants(color, image_url, products(title)))`)
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  const shortCode = order.id.substring(0, 8).toUpperCase()

  // Already confirmed
  if (order.status !== 'pending_cod') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 24px', maxWidth: 440, width: '100%', textAlign: 'center', border: '1px solid #f0ede8', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle style={{ width: 30, height: 30, color: ACCENT }} />
          </div>
          <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Already Confirmed</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', marginBottom: 10, fontFamily: 'Playfair Display, serif' }}>
            Order Is in Progress
          </h1>
          <p style={{ fontSize: 13, color: '#78716c', lineHeight: 1.65, marginBottom: 24 }}>
            This order has already been confirmed and is being processed by our team.
          </p>
          <Link href={`/track-order?code=${shortCode}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: ACCENT, color: '#fff', padding: '12px 24px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}>
            <Package style={{ width: 13, height: 13 }} /> Track My Order
          </Link>
        </div>
      </div>
    )
  }

  async function handleConfirm() {
    'use server'
    await confirmCustomerOrder(id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>

      {/* Top bar */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'Playfair Display, serif' }}>
              UK Sofa<span style={{ color: ACCENT }}>Shop</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#57534e' }}>
            <ShieldCheck style={{ width: 13, height: 13, color: ACCENT }} />
            Secure Confirmation
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Action required banner */}
        <div style={{
          display: 'flex', gap: 14, alignItems: 'flex-start',
          padding: '16px', borderRadius: 10, marginBottom: 20,
          background: '#fffbeb', border: '1px solid #fde68a',
        }}>
          <AlertTriangle style={{ width: 20, height: 20, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Action Required</div>
            <p style={{ fontSize: 12, color: '#b45309', lineHeight: 1.6, margin: 0 }}>
              Please review your order below and confirm it so we can begin preparing your sofa for delivery. This step is required to process your Cash on Delivery order.
            </p>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #f0ede8', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>

          {/* Order header */}
          <div style={{ padding: '20px 20px', borderBottom: `3px solid ${ACCENT}`, background: `${ACCENT}08`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 6 }}>Order Reference</div>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#1c1917', letterSpacing: '0.18em' }}>{shortCode}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 6 }}>Total on Delivery</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>£{order.total_amount.toFixed(2)}</div>
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package style={{ width: 12, height: 12 }} /> Your Items
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {order.order_items.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px', background: '#fafaf9', borderRadius: 9, border: '1px solid #f0ede8' }}>
                  <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: '#f5f5f4' }}>
                    <Image src={item.product_variants?.image_url || '/placeholder.svg'} alt="Product" fill style={{ objectFit: 'cover' }} sizes="60px" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product_variants?.products?.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#78716c' }}>Colour: {item.product_variants?.color}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: '#a8a29e', marginBottom: 2 }}>Qty: {item.quantity}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1c1917' }}>£{item.price_at_time_of_purchase.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div style={{ padding: '14px', background: '#fafaf9', borderRadius: 9, border: '1px solid #f0ede8', marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin style={{ width: 11, height: 11 }} /> Shipping To
              </div>
              <div style={{ fontSize: 12, color: '#57534e', lineHeight: 1.7 }}>
                <strong style={{ color: '#1c1917' }}>{order.customer_name}</strong><br />
                {order.shipping_address}
              </div>
            </div>

            {/* Trust row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
              {[
                [Wallet,     'Pay on delivery',   'Cash or card'],
                [Truck,      'White-glove setup',  'We do everything'],
                [ShieldCheck,'10-yr guarantee',    'Full structure'],
              ].map(([Icon, title, sub]) => (
                <div key={title as string} style={{ padding: '10px 8px', background: `${ACCENT}08`, borderRadius: 8, textAlign: 'center', border: `1px solid ${ACCENT}18` }}>
                  {/* @ts-ignore */}
                  <Icon style={{ width: 14, height: 14, color: ACCENT, margin: '0 auto 5px' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1c1917' }}>{title as string}</div>
                  <div style={{ fontSize: 9, color: '#a8a29e', marginTop: 2 }}>{sub as string}</div>
                </div>
              ))}
            </div>

            {/* Confirm button */}
            <form action={handleConfirm}>
              <button type="submit" style={{
                width: '100%', padding: '15px 0', borderRadius: 10, border: 'none',
                background: ACCENT, color: '#fff',
                fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 8px 28px ${ACCENT}44`,
              }}>
                ✓ Yes, Confirm My Order
              </button>
            </form>
            <p style={{ fontSize: 10, color: '#a8a29e', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
              By confirming, you commit to paying <strong>£{order.total_amount.toFixed(2)}</strong> to our delivery driver via cash or card on arrival.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}