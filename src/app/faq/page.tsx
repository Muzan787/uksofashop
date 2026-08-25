// src/app/faq/page.tsx
//
// Server component. The accordion is a native <details>/<summary>, so this page
// ships no JavaScript at all - it used to be a client component purely to hold
// one boolean per question.
import type { Metadata } from 'next'
import { HelpCircle, ArrowRight, Phone, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'

const ACCENT = '#d4871a'
const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Delivery times, cash and bank transfer on delivery, assembly and old sofa removal, our 1-year frame guarantee, and how returns work. Answers for UK Mainland customers.',
  alternates: { canonical: '/faq' },
}

interface Faq { q: string; a: string }
interface FaqGroup { group: string; items: Faq[] }

const faqGroups: FaqGroup[] = [
  {
    group: 'Delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'Most orders reach UK Mainland addresses within 2–4 working days of purchase. Wales, Scotland and certain postcodes can take 5–7 working days — we can’t confirm which at the point of ordering, so if there’s any delay on yours we’ll let you know straight away, as soon as we’ve received the order. Around 90% of orders arrive within the stated period, unless you’ve asked us to hold it back.',
      },
      {
        q: 'Where do you deliver?',
        a: 'We deliver across UK Mainland, and it’s free — there’s no minimum order value. Our drivers bring your sofa to the ground floor, or to a ground-floor room of your choice.',
      },
      {
        q: 'Do you deliver to Northern Ireland or the Scottish Islands?',
        a: `Yes, we do — we just can’t quote for it automatically on the website. Get in touch before you order, at ${SUPPORT_EMAIL} or on 07476 616022, and we’ll arrange it with you directly.`,
      },
      {
        q: 'Do you deliver upstairs?',
        a: `As standard we deliver to the ground floor, or a ground-floor room of your choice. We can take it upstairs for a fee, starting at £${UPSTAIRS_FIRST_FLOOR}, which you can add at checkout. If you’re not sure how many floors are involved or whether it will fit up your stairwell, please check with us before you buy rather than on the day.`,
      },
      {
        q: 'Do you assemble the sofa?',
        a: `Yes — assembly in the room costs £${ASSEMBLY_FEE}, and you can add it when you check out. Like everything else, you pay for it on delivery rather than upfront.`,
      },
      {
        q: 'Can you take my old sofa away?',
        a: `Yes. Old sofa removal is £${SOFA_REMOVAL_FEE} and you can add it at checkout. For very large or unusual items the charge may be a little different — if so, we’ll tell you as soon as we’ve received your order, well before delivery day.`,
      },
      {
        q: 'What happens if I miss my delivery?',
        a: 'Once we’ve confirmed a delivery slot with you, a missed delivery means the whole trip has to be made again, so a £50 re-delivery charge applies. If the day stops working for you, just tell us as early as you can and we’ll rearrange it.',
      },
      {
        q: 'Will my sofa fit through my door?',
        a: 'Every product page lists the dimensions, so start by measuring your doorways, hallway and any turns on the way in. If you’re at all unsure, talk to us — our team does this every day and will happily walk you through it. Send us your measurements and we’ll tell you honestly whether it will go in.',
      },
    ],
  },
  {
    group: 'Paying',
    items: [
      {
        q: 'How do I pay?',
        a: 'You pay when your sofa arrives, not before. Either hand the driver cash, or make a bank transfer at the door — the driver gives you our account details and waits for the payment to come through. We don’t accept card payments of any kind.',
      },
      {
        q: 'Do I pay anything upfront?',
        a: 'No. Nothing is taken when you place your order. Everything — the sofa, assembly, upstairs delivery, old sofa removal — is paid on the day it arrives, once you’ve seen it and you’re happy with it.',
      },
    ],
  },
  {
    group: 'Your order',
    items: [
      {
        q: 'Can I change or cancel my order?',
        a: `Email us within 2 working days of placing your order, at ${SUPPORT_EMAIL}, with your order number, your name and your full postcode. That gives us time to catch it before the order is prepared for dispatch.`,
      },
      {
        q: 'Can I return a sofa if I change my mind?',
        a: 'Yes. You have 14 days from delivery to cancel, as required by the Consumer Contracts Regulations, and you don’t need to give a reason. For a change-of-mind return you arrange and pay for the return carriage — worth getting a quote first, as sofas are awkward to move. If the sofa comes back damaged we’ll charge a fee accordingly and deduct it from your refund. This is separate from faulty goods, which we collect ourselves free of charge.',
      },
    ],
  },
  {
    group: 'Choosing your sofa',
    items: [
      {
        q: 'Can I choose my own fabric, colour or size?',
        a: 'On our fabric sofas, yes — we make them to order in a colour, material or size of your choosing. Look for the “Made to order” block on the product page and tap “Design yours on WhatsApp”: it opens a message with that sofa’s details already filled in, and you just add what you want changed. We’ll come back to you with the price and how long it will take. Our recliner ranges aren’t made this way, so those come as listed. One thing to know before you commit: made-to-measure orders are exempt from the 14-day change-of-mind return, because they’re built specifically for you. Faulty items are still covered as normal.',
      },
    ],
  },
  {
    group: 'Guarantee and problems',
    items: [
      {
        q: 'What does the 1-year guarantee cover?',
        a: 'Every sofa carries a 1-year guarantee covering structural faults — the wooden frame and the springs. It doesn’t cover general wear and tear, fabric fading, or accidental damage. If you think something structural has gone wrong, contact us with photographs and we’ll look at it.',
      },
      {
        q: 'What if my sofa arrives damaged?',
        a: `Because you pay on delivery, check your sofa properly while the driver is still there and only pay once you’re happy with it. If you do find transit damage afterwards, email ${SUPPORT_EMAIL} within 24 hours with photographs. If the damage is minor and the sofa is usable, we’ll log an incident report with your photos. If it’s considerable, we’ll offer a replacement. If it can’t be repaired and is deemed faulty, we’ll collect it and issue a full refund.`,
      },
    ],
  },
]

const allFaqs = faqGroups.flatMap(g => g.items)

// FAQPage markup. Google restricted FAQ rich results to government and health
// sites in 2023, so this will not produce a dropdown in UK results for a
// retailer - it is here because it is accurate, costs nothing, and helps search
// engines understand what the page covers.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allFaqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

function FaqItem({ q, a }: Faq) {
  return (
    <details className="faq-item">
      <summary>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1917', lineHeight: 1.4 }}>{q}</span>
        <ChevronDown className="faq-chevron" style={{ width: 17, height: 17, color: ACCENT, flexShrink: 0 }} />
      </summary>
      <div style={{ padding: '0 18px 16px', fontSize: 13.5, color: '#57534e', lineHeight: 1.8 }}>
        {a}
      </div>
    </details>
  )
}

export default function FAQPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
      />

      <style>{`
        .faq-item { background: #fff; border-radius: 10px; border: 1px solid #f0ede8; overflow: hidden; }
        .faq-item + .faq-item { margin-top: 8px; }
        .faq-item > summary {
          display: flex; align-items: center; justify-content: space-between; gap: 16;
          padding: 15px 18px; cursor: pointer; list-style: none; text-align: left;
        }
        .faq-item > summary::-webkit-details-marker { display: none; }
        .faq-item > summary:hover span { color: ${ACCENT}; }
        .faq-item[open] > summary { border-bottom: 1px solid #f5f5f4; padding-bottom: 13px; }
        .faq-item[open] > summary span { color: ${ACCENT}; }
        .faq-item[open] .faq-chevron { transform: rotate(180deg); }
        .faq-chevron { transition: transform 0.25s ease; }
        .faq-item[open] > div { padding-top: 13px; }
        @media (prefers-reduced-motion: reduce) { .faq-chevron { transition: none; } }
      `}</style>

      {/* Hero */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 16px 32px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <HelpCircle style={{ width: 22, height: 22, color: ACCENT }} />
          </div>
          <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Help Centre</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
            Delivery, payment, customising your sofa and what happens if something isn’t right.
            If your question isn’t here, just ask us.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px 60px' }}>

        {faqGroups.map(({ group, items }) => (
          <section key={group} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 11, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 12, paddingLeft: 2 }}>
              {group}
            </h2>
            {items.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </section>
        ))}

        {/* Still stuck */}
        <div style={{ background: '#0c0c0b', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone style={{ width: 18, height: 18, color: ACCENT }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Still have questions?</div>
            <div style={{ fontSize: 12, color: '#78716c', marginTop: 3 }}>
              Mon–Fri 9am–6pm, Sat 10am–4pm. We’d rather talk it through than have a sofa turn up that doesn’t fit.
            </div>
          </div>
          <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 5, background: ACCENT, color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
            Contact Us <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
