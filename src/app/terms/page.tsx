import type { Metadata } from 'next'


// ─── TERMS PAGE  →  src/app/terms/page.tsx ────────────────────────────────────
import { FileText, Link } from 'lucide-react'


export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Our terms of sale: pricing, payment on delivery, delivery to UK Mainland, and your 14-day right to cancel.',
  alternates: { canonical: '/terms' },
}

const ACCENT = '#d18b41'

const termsSections = [
  { num: '1.', title: 'Introduction', body: 'These Terms and Conditions govern your use of uksofashop.co.uk and the purchase of goods from UK Sofa Shop. By placing an order you confirm that you have read, understood, and agree to these terms.' },
  { num: '2.', title: 'Placing an Order', body: 'When you submit an order, you are making an offer to purchase. We will send an acknowledgement email upon receipt. This is not an acceptance. The contract is formed when we dispatch the goods.' },
  { num: '3.', title: 'Pricing and Payment', body: 'All prices are inclusive of VAT at the current rate. Payment is due in full on delivery, either in cash to the delivery driver or by bank transfer completed at the point of delivery. We do not accept card payments. No payment is taken at the time of ordering.' },
  { num: '4.', title: 'Delivery', body: 'Delivery is free to UK Mainland addresses with no minimum order value, to the ground floor or a ground-floor room of your choice. Delivery dates are estimates. Delays may occasionally occur due to unforeseen factors. We will notify you of any significant delays.' },
  { num: '5.', title: 'Returns and Cancellations', body: 'Under the Consumer Contracts Regulations you have 14 days from delivery to cancel your order. Return carriage is arranged and paid for by the customer. Faulty or damaged items are collected free of charge - see our Delivery & Returns page for the full process.' },
  { num: '6.', title: 'Guarantees', body: 'All sofas include a 1-year structural guarantee covering the frame and springs. This excludes wear and tear, accidental damage, and fabric fading.' },
  { num: '7.', title: 'Limitation of Liability', body: 'We are not liable for indirect or consequential losses arising from use of our products or services. Our liability is limited to the purchase price of the affected goods.' },
  { num: '8.', title: 'Governing Law', body: 'These terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.' },
]

function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 16px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText style={{ width: 18, height: 18, color: ACCENT }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 4 }}>Legal</div>
              <h1 className="font-playfair" style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 700, color: '#fff' }}>Terms &amp; Conditions</h1>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 52 }}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px 60px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', border: '1px solid #f0ede8', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {termsSections.map(({ num, title, body }, i) => (
            <div key={num} style={{ paddingBottom: i < termsSections.length - 1 ? 24 : 0, marginBottom: i < termsSections.length - 1 ? 24 : 0, borderBottom: i < termsSections.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0 }}>{num}</span>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1c1917' }}>{title}</h2>
              </div>
              <p style={{ paddingLeft: 28, fontSize: 13, color: '#57534e', lineHeight: 1.8, margin: 0 }}>{body}</p>
            </div>
          ))}

          <div style={{ paddingTop: 20, borderTop: '1px solid #f5f5f4', marginTop: 4, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#a8a29e' }}>Questions about these terms?</span>
            <Link href="/contact" style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textDecoration: 'none' }}>Contact our team →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export default TermsPage