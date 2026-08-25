'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Phone, Mail, MapPin, Clock,
  Facebook, Instagram,
  Shield, Truck, Gem, Ruler,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { TRUST_POINTS } from '@/constants/promises';
import { subscribeToNewsletter } from '@/app/actions/newsletter';
import { openCookiePreferences } from '@/utils/consent';
import { SOCIAL_PROFILES, PHONE_DISPLAY, PHONE_HREF } from '@/constants/contact';
import TikTokIcon from '@/components/UI/TikTokIcon';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; slug: string; }
interface Props { categories: Category[]; }

// ─── Static data ──────────────────────────────────────────────────────────────
const supportLinks = [
  { href: '/contact',          label: 'Contact Us'        },
  { href: '/delivery-returns', label: 'Delivery & Returns' },
  { href: '/faq',              label: 'FAQs'              },
  { href: '/track-order',      label: 'Track Your Order'  },
  { href: '/size-guide',       label: 'Size Guide'        },
  { href: '/care-guide',       label: 'Care Guide'        },
];

const companyLinks = [
  { href: '/about',     label: 'Our Story'    },
  { href: '/showroom',  label: 'Showroom'     },
  { href: '/journal',      label: 'Journal'      },
  { href: '/careers',   label: 'Careers'      },
  { href: '/sitemap',   label: 'Sitemap'      },
];

// Driven by SOCIAL_PROFILES, which is also what feeds the `sameAs` array in
// structured data - one list, so the footer and the markup cannot disagree
// about which accounts exist.
//
// These were previously four icons all pointing at href="#": they looked like
// working links, did nothing but jump to the top of the page, and claimed a
// Twitter and YouTube presence that was never set up. Only the platforms in
// SOCIAL_PROFILES render now.
const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, tiktok: TikTokIcon } as const
const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' } as const

const socials = SOCIAL_PROFILES.map(({ platform, url }) => ({
  icon: SOCIAL_ICONS[platform],
  href: url,
  label: SOCIAL_LABELS[platform],
}))

// Copy lives in src/constants/promises.ts; only the icons are chosen here.
// NOTE: the "British Made / Since 1995" cell that used to sit here was removed
// with the 30-day returns claim. Origin claims are handled separately - some
// ranges are UK-made and recliners are not, so it can't be a sitewide badge.
const TRUST_ICONS = [Truck, Gem, Ruler, Shield];
const trust = TRUST_POINTS.map((p, i) => ({
  icon: TRUST_ICONS[i] ?? Shield,
  label: p.label,
  sub: p.sub,
}));

// ─── Accordion section (mobile) ───────────────────────────────────────────────
function AccordionSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
          color: '#e7e5e0',
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
          {title}
        </span>
        {open
          ? <ChevronUp style={{ width: 13, height: 13, color: '#d4871a' }} />
          : <ChevronDown style={{ width: 13, height: 13, color: '#78716c' }} />
        }
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div style={{ paddingBottom: 14 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Link list shared helper ──────────────────────────────────────────────────
function FooterLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            className="group"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 0',
              fontSize: 12, color: '#78716c',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <span
              style={{
                display: 'inline-block', width: 12, height: 1,
                background: '#d4871a', flexShrink: 0,
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.25s ease',
              }}
              className="group-hover:[transform:scaleX(1)]"
            />
            <span className="group-hover:text-[#d4871a] transition-colors">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── Newsletter form ──────────────────────────────────────────────────────────
function Newsletter() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [focused, setFocused] = useState(false);

  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    const res = await subscribeToNewsletter(email);

    if (res?.error) {
      setStatus('error');
      setMessage(res.error);
      return;
    }
    setStatus('success');
    setMessage(res?.message ?? '');
    setEmail('');
  };

  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.22em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
        Join the Family
      </div>
      <p className="font-playfair font-bold text-white" style={{ fontSize: 20, lineHeight: 1.2, marginBottom: 8 }}>
        Get Exclusive<br />
        <em style={{ color: '#d4871a', fontStyle: 'normal' }}>Offers & Inspiration</em>
      </p>
      <p style={{ fontSize: 11, color: '#57534e', lineHeight: 1.6, marginBottom: 16 }}>
        Interior design tips, early access to new collections, and subscriber-only discounts.
      </p>

      {status === 'success' ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px',
            background: 'rgba(212,135,26,0.1)', border: '1px solid rgba(212,135,26,0.25)',
            borderRadius: 7, color: '#d4871a', fontSize: 12,
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <span>{message}</span>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div
            style={{
              display: 'flex',
              border: `1px solid ${focused ? '#d4871a' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 7, overflow: 'hidden',
              transition: 'border-color 0.25s ease',
            }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1, padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)', border: 'none',
                color: '#fff', fontSize: 12, outline: 'none',
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              className="group"
              disabled={status === 'loading'}
              style={{
                padding: '0 16px',
                background: status === 'loading' ? '#78716c' : '#d4871a',
                border: 'none', cursor: status === 'loading' ? 'wait' : 'pointer',
                color: '#fff', flexShrink: 0,
                transition: 'background 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {status === 'loading'
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <ArrowRight style={{ width: 14, height: 14 }} className="group-hover:translate-x-0.5 transition-transform" />
              }
            </button>
          </div>
          {status === 'error' && (
            <p style={{ fontSize: 11, color: '#f87171', marginTop: 5 }}>{message || 'Please enter a valid email address.'}</p>
          )}
          <p style={{ fontSize: 10, color: '#3f3f3f', marginTop: 8 }}>
            We&apos;ll email you to confirm first. No spam, and one-click unsubscribe on every message.
          </p>
        </form>
      )}
    </div>
  );
}

// ─── Back to top ──────────────────────────────────────────────────────────────
function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(212,135,26,0.15)',
        border: '1px solid rgba(212,135,26,0.3)',
        color: '#d4871a', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, background 0.2s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      className="hover:bg-[#d4871a]/30"
    >
      <ChevronUp style={{ width: 14, height: 14 }} />
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FooterClient({ categories }: Props) {
  const shopLinks = [
    { href: '/shop/all', label: 'All Sofas' },
    { href: '/collection', label: 'Collections' }, // <-- NEW
    ...categories.map(c => ({ href: `/shop/${c.slug}`, label: c.name })),
    { href: '/new-arrivals', label: 'New Arrivals' },
  ];

  return (
    <footer style={{ background: '#0c0c0b', color: '#78716c' }}>

      {/* ── Trust bar ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
          <div
            className="grid grid-cols-2 sm:grid-cols-4"
            style={{ gap: 1, background: 'rgba(255,255,255,0.05)' }}
          >
            {trust.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="group cursor-default"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px',
                  background: '#0c0c0b',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,135,26,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0c0c0b')}
              >
                <Icon
                  style={{ width: 14, height: 14, color: '#d4871a', flexShrink: 0 }}
                  className="group-hover:scale-110 transition-transform duration-200"
                />
                <div>
                  <div style={{ fontSize: 11, color: '#e7e5e0', fontWeight: 600, lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main body ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>

        {/* Desktop: 4-col grid */}
        <div
          className="hidden lg:grid"
          style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40, padding: '40px 0 32px' }}
        >
          {/* Brand col */}
          <div>
            <Link href="/" style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
              <div className="font-playfair font-bold text-white" style={{ fontSize: 20 }}>
                UK Sofa<span style={{ color: '#d4871a' }}>Shop</span>
              </div>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: '#3f3f3f', textTransform: 'uppercase', marginTop: 3 }}>
                Free UK Mainland Delivery
              </div>
            </Link>
            <p style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 20, maxWidth: 220 }}>
              Quality sofas delivered free across UK Mainland, and you pay only when they arrive.
            </p>

            {/* Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                { icon: Phone, text: PHONE_DISPLAY, href: PHONE_HREF },
                { icon: Mail,  text: 'uksofashop.co.uk@gmail.com', href: 'mailto:uksofashop.co.uk@gmail.com' },
                { icon: Clock, text: 'Mon–Fri 9am–6pm · Sat 10am–4pm', href: null },
              ].map(({ icon: Icon, text, href }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Icon style={{ width: 12, height: 12, color: '#d4871a', flexShrink: 0, marginTop: 1 }} />
                  {href
                    ? <a href={href} style={{ fontSize: 11, color: '#57534e', textDecoration: 'none', transition: 'color 0.2s' }}
                        className="hover:text-[#d4871a]">{text}</a>
                    : <span style={{ fontSize: 11 }}>{text}</span>
                  }
                </div>
              ))}
            </div>

            {/* Socials */}
            {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label} href={href} aria-label={label}
                  target="_blank" rel="noopener noreferrer"
                  className="group"
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#d4871a'; (e.currentTarget as HTMLElement).style.borderColor = '#d4871a'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <Icon style={{ width: 12, height: 12, color: '#57534e', transition: 'color 0.2s' }}
                    className="group-hover:text-white" />
                </a>
              ))}
            </div>
            )}
          </div>

          {/* Shop */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>
              Shop
            </div>
            <FooterLinks links={shopLinks} />
          </div>

          {/* Support */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>
              Support
            </div>
            <FooterLinks links={supportLinks} />
          </div>

          {/* Newsletter */}
          <div>
            <Newsletter />
          </div>
        </div>

        {/* Mobile: accordion */}
        <div className="lg:hidden" style={{ padding: '24px 0 0' }}>
          {/* Brand */}
          <div style={{ paddingBottom: 24, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="font-playfair font-bold text-white" style={{ fontSize: 20, marginBottom: 6 }}>
              UK Sofa<span style={{ color: '#d4871a' }}>Shop</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 280 }}>
              Quality sofas, delivered free across UK Mainland.
            </p>
            {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {socials.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Icon style={{ width: 12, height: 12, color: '#57534e' }} />
                </a>
              ))}
            </div>
            )}
          </div>

          {/* Newsletter */}
          <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Newsletter />
          </div>

          <AccordionSection title="Shop">
            <FooterLinks links={shopLinks} />
          </AccordionSection>
          <AccordionSection title="Support">
            <FooterLinks links={supportLinks} />
          </AccordionSection>
          <AccordionSection title="Company">
            <FooterLinks links={companyLinks} />
          </AccordionSection>

          {/* Contact */}
          <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: Phone, text: PHONE_DISPLAY, href: PHONE_HREF },
                { icon: Mail,  text: 'uksofashop.co.uk@gmail.com', href: 'mailto:uksofashop.co.uk@gmail.com' },
                { icon: MapPin, text: 'Unit 02, Waverledge Street, Blackburn, BB6 7LS', href: null },
              ].map(({ icon: Icon, text, href }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon style={{ width: 12, height: 12, color: '#d4871a', flexShrink: 0 }} />
                  {href
                    ? <a href={href} style={{ fontSize: 12, color: '#57534e', textDecoration: 'none' }}>{text}</a>
                    : <span style={{ fontSize: 12 }}>{text}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10,
            padding: '14px 0',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <p style={{ fontSize: 10, color: '#3f3f3f', margin: 0 }}>
            © {new Date().getFullYear()} UK Sofa Shop. All rights reserved.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[['/terms','Terms'],['/privacy','Privacy'],['/cookies','Cookies']].map(([href, label]) => (
              <Link key={href as string} href={href as string}
                style={{ fontSize: 11, color: '#57534e', textDecoration: 'none', transition: 'color 0.2s' }}
                className="hover:text-[#d4871a]">
                {label as string}
              </Link>
            ))}

            {/* Reopens the consent banner so a visitor can change an answer
                they already gave - UK GDPR wants withdrawing consent to be as
                easy as giving it. */}
            <button
              type="button"
              onClick={openCookiePreferences}
              style={{ fontSize: 11, color: '#57534e', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none', transition: 'color 0.2s' }}
              className="hover:text-[#d4871a]"
            >
              Cookie preferences
            </button>
            <BackToTop />
          </div>
        </div>
      </div>

      {/* Spin keyframe for newsletter loader */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </footer>
  );
}