// ─── PRIVACY PAGE  →  src/app/privacy/page.tsx ────────────────────────────────
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

const ACCENT = '#d4871a'

function ProseSection({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0 }}>{num}</span>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1c1917', lineHeight: 1.2 }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 28, fontSize: 13, color: '#57534e', lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 16px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck style={{ width: 18, height: 18, color: ACCENT }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 4 }}>Legal</div>
              <h1 className="font-playfair" style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 700, color: '#fff' }}>Privacy Policy</h1>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 52 }}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px 60px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', border: '1px solid #f0ede8', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

          <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.8, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #f5f5f4' }}>
            At UK Sofa Shop (operated by UK Sofashop LTD), we are committed to protecting your privacy. This policy explains when and why we collect personal information, how we use it, and how we keep it secure.
          </p>

          <ProseSection num="1." title="Information We Collect">
            We collect information when you place an order, make an enquiry, or browse our website. This may include your name, postal address, email address, phone number, IP address, and information about which pages you access and when.
          </ProseSection>

          <ProseSection num="2." title="How We Use Your Information">
            <p style={{ marginBottom: 8 }}>We use your information to:</p>
            <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                'Process and fulfil orders you have placed with us',
                'Notify you of changes to your order status',
                'Send communications you have requested',
                'Improve our website and customer experience',
                'Comply with legal and regulatory obligations',
              ].map(i => <li key={i} style={{ listStyleType: 'disc', listStylePosition: 'outside' }}>{i}</li>)}
            </ul>
          </ProseSection>

          <ProseSection num="3." title="Data Sharing">
            We will never sell or rent your personal data to third parties. We only share the minimum necessary delivery information (name, address, phone number) with our trusted logistics partners to complete your order.
          </ProseSection>

          <ProseSection num="4." title="Cookies">
            We use cookies to improve your browsing experience and deliver a more personalised service. Cookies are small data files stored on your device. You may disable cookies in your browser settings, though this may affect site functionality.
          </ProseSection>

          <ProseSection num="5." title="Data Retention">
            We retain your personal data for as long as necessary to fulfil your order and comply with legal requirements. Order records are kept for 7 years in line with UK tax law. You may request deletion of non-essential data at any time.
          </ProseSection>

          <ProseSection num="6." title="Your Rights (UK GDPR)">
            <p style={{ marginBottom: 8 }}>Under UK GDPR you have the right to:</p>
            <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                'Access the personal data we hold about you',
                'Request correction of inaccurate data',
                'Request deletion of your data ("right to be forgotten")',
                'Object to or restrict how we process your data',
                'Portability of your data in a machine-readable format',
              ].map(i => <li key={i} style={{ listStyleType: 'disc', listStylePosition: 'outside' }}>{i}</li>)}
            </ul>
            <p style={{ marginTop: 10 }}>To exercise any of these rights, contact us at <a href="mailto:uksofashop.co.uk@gmail.com" style={{ color: ACCENT }}>uksofashop.co.uk@gmail.com</a>.</p>
          </ProseSection>

          <div style={{ paddingTop: 20, borderTop: '1px solid #f5f5f4', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#a8a29e' }}>Questions about this policy?</span>
            <Link href="/contact" style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textDecoration: 'none' }}>Contact our team →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export default PrivacyPage