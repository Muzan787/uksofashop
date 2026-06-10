// ─── FAQ PAGE  →  src/app/faq/page.tsx ────────────────────────────────────────
'use client'
import { useState } from 'react'
import { HelpCircle, ChevronDown, ArrowRight, Phone } from 'lucide-react'
import Link from 'next/link'

const ACCENT = '#d4871a'

const faqs = [
  { q: 'Do you offer Cash on Delivery?',               a: 'Yes! Pay our delivery driver securely via cash or mobile card terminal only once your sofa has arrived and you are happy with it. Zero upfront payment required.' },
  { q: 'Do you deliver outside of the UK?',            a: 'We currently operate within the United Kingdom only. Free delivery applies to all Mainland UK addresses on orders over £500.' },
  { q: 'What does the 1-year Guarantee cover?',       a: 'Our guarantee covers all structural faults including the wooden frame and springs. It does not cover general wear and tear, fabric fading, or accidental damage.' },
  { q: 'Can I cancel my order?',                       a: 'You can cancel free of charge any time before dispatch. If your sofa has already left our warehouse, a return collection fee may apply.' },
  { q: 'Will my sofa fit through my door?',            a: 'Check the dimensions listed on the product page. If unsure, contact our team with your door frame measurements and we\'ll advise you directly.' },
  { q: 'How long does delivery take?',                 a: 'In-stock items typically deliver within 3–7 working days. Made-to-order items take 4–6 weeks. We\'ll contact you 48 hours before to arrange a 3-hour delivery window.' },
  { q: 'Can I customise the fabric or colour?',        a: 'Yes — many of our sofas are available in a range of fabrics and colours. Use the variant selector on the product page, or contact us to discuss bespoke options.' },
  { q: 'What happens if my sofa arrives damaged?',     a: 'Please photograph any damage before signing and contact us immediately. We will arrange a replacement or repair at no cost to you.' },
]

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #f0ede8', overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: open ? '0 4px 16px rgba(0,0,0,0.06)' : 'none' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: open ? ACCENT : '#1c1917', transition: 'color 0.2s', lineHeight: 1.3 }}>{q}</span>
        <ChevronDown style={{ width: 16, height: 16, color: ACCENT, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }} />
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ padding: '0 18px 16px', fontSize: 12, color: '#57534e', lineHeight: 1.75, borderTop: '1px solid #f5f5f4', paddingTop: 12 }}>
          {a}
        </div>
      </div>
    </div>
  )
}

// FIX: Removed 'export' from this function declaration
function FAQPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px 32px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <HelpCircle style={{ width: 22, height: 22, color: ACCENT }} />
          </div>
          <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Help Centre</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>Frequently Asked Questions</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Can't find the answer? Contact our team and we'll help.</p>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {faqs.map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
        <div style={{ background: '#0c0c0b', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone style={{ width: 18, height: 18, color: ACCENT }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Still have questions?</div>
            <div style={{ fontSize: 11, color: '#57534e', marginTop: 2 }}>Our team is available Mon–Fri 9am–6pm</div>
          </div>
          <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 5, background: ACCENT, color: '#fff', padding: '9px 16px', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
            Contact Us <ArrowRight style={{ width: 11, height: 11 }} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Next.js recognizes this valid default export
export default FAQPage