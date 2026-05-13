// src/app/delivery-returns/page.tsx
import { Truck, RotateCcw, ShieldCheck, Wallet, Clock, MapPin, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const ACCENT = '#d4871a'

const deliveryItems = [
  { title: 'Free Mainland UK Delivery', body: 'Completely free on all orders over £500 to mainland UK. For orders under £500, a standard £49 fee applies.' },
  { title: 'White-Glove Service',       body: 'Our 2-person team brings your sofa to your room of choice, assembles it if required, and removes all packaging.' },
  { title: 'Delivery Timeline',         body: 'In-stock items: 3–7 working days. Made-to-order: 4–6 weeks. We confirm your 3-hour window 48 hours before.' },
  { title: 'Cash on Delivery',          body: 'Pay your driver via cash or mobile card terminal only once your furniture has arrived and you are satisfied.' },
]

const returnItems = [
  { title: '30-Day Home Trial',     body: 'Not delighted? Return any standard item within 30 days of delivery — no awkward questions asked.' },
  { title: 'Condition of Goods',    body: 'Items must be returned in original condition. We cannot accept goods that have been damaged or structurally altered.' },
  { title: 'Collection Fee',        body: 'A £50 collection fee is deducted from your refund to cover logistics. Faulty items are collected free of charge.' },
  { title: 'How to Initiate',       body: 'Email support@uksofashop.co.uk with your order number. We\'ll arrange a collection date within 48 hours.' },
]

function Section({ icon: Icon, title, colour, items }: { icon: React.ElementType; title: string; colour: string; items: { title: string; body: string }[] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: `3px solid ${colour}`, background: `${colour}08` }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Icon style={{ width: 20, height: 20, color: colour }} />
        </div>
        <h2 className="font-playfair" style={{ fontSize: 22, fontWeight: 700, color: '#1c1917' }}>{title}</h2>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map(({ title: t, body }) => (
          <div key={t} style={{ paddingBottom: 14, borderBottom: '1px solid #f5f5f4' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', marginBottom: 5 }}>{t}</div>
            <div style={{ fontSize: 12, color: '#57534e', lineHeight: 1.7 }}>{body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeliveryReturnsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      {/* Hero */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 32px' }}>
          <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Policies</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 10 }}>
            Delivery &amp; Returns
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 400, lineHeight: 1.7 }}>
            Everything you need to know about getting your sofa delivered and our no-fuss return process.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Quick trust pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {[
            [Truck,        'Free Delivery Over £500'],
            [Clock,        '3–7 Day Delivery'],
            [RotateCcw,    '30-Day Returns'],
            [Wallet,       'Pay on Delivery'],
            [ShieldCheck,  '10-Year Guarantee'],
          ].map(([Icon, label]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: '#fff', borderRadius: 20, border: '1px solid #f0ede8', fontSize: 11, color: '#57534e', fontWeight: 600 }}>
              {/* @ts-ignore */}
              <Icon style={{ width: 13, height: 13, color: ACCENT }} />
              {label as string}
            </div>
          ))}
        </div>

        {/* Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 24 }}>
          <Section icon={Truck}     title="Delivery" colour={ACCENT}     items={deliveryItems} />
          <Section icon={RotateCcw} title="Returns"  colour="#7c3aed"    items={returnItems}   />
        </div>

        {/* CTA */}
        <div style={{ background: '#0c0c0b', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Have a specific question?</div>
            <div style={{ fontSize: 12, color: '#57534e' }}>Our team can advise on delivery slots, access requirements, and returns.</div>
          </div>
          <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', padding: '11px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Contact Us <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </div>
    </div>
  )
}