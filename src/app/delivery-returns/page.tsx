// src/app/delivery-returns/page.tsx
import type { Metadata } from 'next'
import { Truck, RotateCcw, Wallet, Clock, ArrowRight, AlertTriangle, Mail, PoundSterling } from 'lucide-react'
import Link from 'next/link'
import { ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'

const ACCENT = '#d4871a'
const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

export const metadata: Metadata = {
  title: 'Delivery & Returns',
  description:
    'Free delivery across UK Mainland in 2–4 working days, paid on delivery. What to do if your sofa arrives damaged, and your 14-day right to change your mind.',
  alternates: { canonical: '/delivery-returns' },
}

const deliveryItems = [
  {
    title: 'Free delivery across UK Mainland',
    body: 'Delivery is free to every UK Mainland address, with no minimum order value. Our drivers bring your sofa to the ground floor, or to a ground-floor room of your choice.',
  },
  {
    title: 'Usually 2–4 working days',
    body: 'Most orders arrive within 2–4 working days of purchase. Wales, Scotland and a few specific postcodes can take 5–7 working days — we can’t confirm which at the point of ordering, so if there’s any delay on yours we’ll tell you straight away, as soon as we’ve received the order. Around 90% of orders arrive within the stated period, unless you’ve asked us to hold it back.',
  },
  {
    title: 'Please check we can get in',
    body: 'Have a think about access before your delivery day. Our vehicle needs to be able to reach the property so the team can unload safely — narrow lanes, low archways, permit-only parking and blocked driveways are the usual culprits. Tell us in advance if any of those apply.',
  },
  {
    title: 'Delivering upstairs',
    body: 'We can take your sofa above the ground floor for a small fee, which you can add at checkout. If you’re unsure whether it will fit or how many floors are involved, please check with us before you buy rather than on the day.',
  },
  {
    title: 'If you miss your delivery',
    body: 'Once a delivery slot has been confirmed with you, a missed delivery means the whole trip has to be made again — so a £50 re-delivery charge applies. Just let us know as early as you can if the day stops working for you.',
  },
  {
    title: 'Changing or cancelling your delivery date',
    body: `Email us within 2 working days of placing your order, at ${SUPPORT_EMAIL}, with your order number, your name and your full postcode. That gives us time to catch it before the order is prepared for dispatch.`,
  },
]

const charges = [
  { label: 'Delivery to UK Mainland, ground floor', price: 'Free' },
  { label: 'Upstairs delivery', price: `From £${UPSTAIRS_FIRST_FLOOR}`, note: 'Add at checkout' },
  { label: 'Assembly in the room', price: `£${ASSEMBLY_FEE}`, note: 'Add at checkout' },
  { label: 'Taking your old sofa away', price: `£${SOFA_REMOVAL_FEE}`, note: 'May change for very large items — we’ll tell you as soon as we’ve received your order' },
  { label: 'Re-delivery after a missed slot', price: '£50' },
]

const damageItems = [
  {
    title: 'Check it before you pay',
    body: 'You pay on delivery, which means you get to look at your sofa first. Please do — have a proper look at it while the driver is still with you, and only hand over payment once you’re happy with the condition it’s arrived in.',
  },
  {
    title: 'Tell us within 24 hours',
    body: `If you spot damage from transit, email ${SUPPORT_EMAIL} within 24 hours with photographs of the problem. Photos matter — they’re what let us sort it out quickly rather than going back and forth.`,
  },
  {
    title: 'Minor damage you can live with',
    body: 'If the damage is small and the furniture is perfectly usable, we’ll log an incident report with your photographs and recommend you carry on using it. That record stays on your order in case anything develops later.',
  },
  {
    title: 'Considerable damage',
    body: 'If the damage is significant, we’ll offer you a replacement.',
  },
  {
    title: 'Beyond repair',
    body: 'If the item can’t be repaired and is deemed faulty, we’ll collect it from you and issue a full refund. There’s no collection charge for faulty goods.',
  },
]

const returnItems = [
  {
    title: 'You have 14 days',
    body: 'If you simply change your mind, you have 14 days from the day your sofa is delivered to cancel your order. That’s your right under the Consumer Contracts Regulations and it applies whatever the reason — you don’t need to explain yourself to us.',
  },
  {
    title: 'Getting it back to us',
    body: 'For a change-of-mind return, you arrange and pay for the return carriage. Sofas are large and awkward, so it’s worth getting a quote before you commit. (This is different from a faulty item — those we collect ourselves, free of charge.)',
  },
  {
    title: 'Condition when it comes back',
    body: 'Please send it back in the condition it reached you in. If the sofa comes back damaged, we’ll charge a fee accordingly and deduct it from your refund.',
  },
  {
    title: 'Made-to-measure orders',
    body: 'The 14-day right doesn’t apply to bespoke or made-to-measure items — anything built to your own choice of fabric, colour or dimensions. That’s the standard exemption in the Regulations, and it’s because we can’t resell a sofa made to your specification. We’ll always make this clear before you commit to a custom order.',
  },
]

function Section({
  icon: Icon, eyebrow, title, intro, colour, items,
}: {
  icon: React.ElementType
  eyebrow: string
  title: string
  intro?: string
  colour: string
  items: { title: string; body: string }[]
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: `3px solid ${colour}`, background: `${colour}08` }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Icon style={{ width: 20, height: 20, color: colour }} />
        </div>
        <div style={{ fontSize: 10, color: colour, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
          {eyebrow}
        </div>
        <h2 className="font-playfair" style={{ fontSize: 22, fontWeight: 700, color: '#1c1917' }}>{title}</h2>
        {intro && (
          <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.7, marginTop: 8, marginBottom: 0 }}>{intro}</p>
        )}
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map(({ title: t, body }, i) => (
          <div key={t} style={{ paddingBottom: i < items.length - 1 ? 16 : 0, borderBottom: i < items.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', marginBottom: 6 }}>{t}</h3>
            <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.75, margin: 0 }}>{body}</p>
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
          <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Policies</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 10 }}>
            Delivery &amp; Returns
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 520, lineHeight: 1.75 }}>
            How your sofa gets to you, what it costs, and what happens if something isn’t right when it arrives.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Quick facts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {([
            [Truck,      'Free UK Mainland delivery'],
            [Clock,      '2–4 working days'],
            [Wallet,     'Pay on delivery'],
            [RotateCcw,  '14 days to change your mind'],
          ] as const).map(([Icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: '#fff', borderRadius: 20, border: '1px solid #f0ede8', fontSize: 12, color: '#57534e', fontWeight: 600 }}>
              <Icon style={{ width: 13, height: 13, color: ACCENT, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        {/* Delivery */}
        <div style={{ marginBottom: 20 }}>
          <Section
            icon={Truck}
            eyebrow="Getting it to you"
            title="Delivery"
            colour={ACCENT}
            items={deliveryItems}
          />
        </div>

        {/* Charges */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0ede8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <PoundSterling style={{ width: 16, height: 16, color: ACCENT }} />
              <h2 className="font-playfair" style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>What things cost</h2>
            </div>
            <p style={{ fontSize: 13, color: '#78716c', margin: 0, lineHeight: 1.6 }}>
              Everything here is paid on delivery along with the sofa itself — nothing is taken upfront.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
              <tbody>
                {charges.map(({ label, price, note }, i) => (
                  <tr key={label} style={{ borderBottom: i < charges.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
                    <td style={{ padding: '13px 20px', fontSize: 13, color: '#1c1917', fontWeight: 600 }}>
                      {label}
                      {note && <span style={{ display: 'block', fontSize: 12, color: '#a8a29e', fontWeight: 400, marginTop: 3, lineHeight: 1.5 }}>{note}</span>}
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', color: price === 'Free' ? '#16a34a' : ACCENT }}>
                      {price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Two distinct situations, deliberately separated so a faulty sofa and a
            change of mind are never confused for one another. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 24 }}>
          <Section
            icon={AlertTriangle}
            eyebrow="Something's wrong with it"
            title="If your sofa arrives damaged"
            intro="Unfortunate things do happen in transit. Here's exactly what we'll do about it."
            colour="#dc2626"
            items={damageItems}
          />
          <Section
            icon={RotateCcw}
            eyebrow="You've simply changed your mind"
            title="Returning an undamaged sofa"
            intro="Nothing wrong with it, but it isn't for you. That's a different situation from the one on the left."
            colour="#7c3aed"
            items={returnItems}
          />
        </div>

        {/* CTA */}
        <div style={{ background: '#0c0c0b', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Not sure about something?</div>
            <div style={{ fontSize: 13, color: '#78716c', lineHeight: 1.6 }}>
              Ask us before you order — especially about access, upstairs delivery, or whether a sofa will fit.
              We’d far rather talk it through than have it turn up and not work.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', color: '#e7e5e0', padding: '11px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Mail style={{ width: 13, height: 13 }} /> Email us
            </a>
            <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', padding: '11px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Contact Us <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
