'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Phone, Mail, MapPin, Clock,
  Facebook, Instagram, Twitter, Youtube,
  Shield, Truck, RotateCcw, Gem,
  ChevronDown, ChevronUp,
} from 'lucide-react';

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
  { href: '/blog',      label: 'Journal'      },
  { href: '/careers',   label: 'Careers'      },
  { href: '/press',     label: 'Press'        },
  { href: '/sitemap',   label: 'Sitemap'      },
];

const socials = [
  { icon: Facebook,  href: '#', label: 'Facebook'  },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter,   href: '#', label: 'Twitter'   },
  { icon: Youtube,   href: '#', label: 'YouTube'   },
];

const trust = [
  { icon: Truck,     label: 'Free Delivery',   sub: 'Over £500'         },
  { icon: Shield,    label: '10-Yr Guarantee', sub: 'Frame warranty'    },
  { icon: RotateCcw, label: '30-Day Returns',  sub: 'No questions asked'},
  { icon: Gem,       label: 'British Made',    sub: 'Since 1995'        },
];

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setStatus('error'); return; }
    setStatus('loading');
    setTimeout(() => { setStatus('success'); setEmail(''); }, 1200);
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
          You're in! Check your inbox.
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
            <p style={{ fontSize: 10, color: '#f87171', marginTop: 5 }}>Please enter a valid email address.</p>
          )}
          <p style={{ fontSize: 10, color: '#3f3f3f', marginTop: 8 }}>
            No spam, ever. Unsubscribe in one click.
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
    ...categories.map(c => ({ href: `/shop/${c.slug}`, label: c.name })),
    { href: '/new-arrivals', label: 'New Arrivals' },
  ];

  return (
    <footer style={{ background: '#0c0c0b', color: '#78716c' }}>

      {/* ── Trust bar ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
            }}
            className="sm:grid-cols-4"
          >
            {trust.map(({ icon: Icon, label, sub }, i) => (
              <div
                key={label}
                className="group cursor-default"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px',
                  borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,135,26,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
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
                British Craftsmanship Since 1995
              </div>
            </Link>
            <p style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 20, maxWidth: 220 }}>
              Handcrafted luxury sofas for the modern British home. Built to last generations.
            </p>

            {/* Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                { icon: Phone, text: '0800 123 4567', href: 'tel:08001234567' },
                { icon: Mail,  text: 'hello@uksofashop.co.uk', href: 'mailto:hello@uksofashop.co.uk' },
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
            <div style={{ display: 'flex', gap: 8 }}>
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label} href={href} aria-label={label}
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
              Handcrafted luxury sofas for the modern British home.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {socials.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} aria-label={label}
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
                { icon: Phone, text: '0800 123 4567', href: 'tel:08001234567' },
                { icon: Mail,  text: 'hello@uksofashop.co.uk', href: 'mailto:hello@uksofashop.co.uk' },
                { icon: MapPin, text: 'London, United Kingdom', href: null },
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
            © {new Date().getFullYear()} UK Sofa Shop (Vantage Group LTD). All rights reserved.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[['/terms','Terms'],['/privacy','Privacy'],['/cookies','Cookies']].map(([href, label]) => (
              <Link key={href as string} href={href as string}
                style={{ fontSize: 10, color: '#3f3f3f', textDecoration: 'none', transition: 'color 0.2s' }}
                className="hover:text-[#d4871a]">
                {label as string}
              </Link>
            ))}
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