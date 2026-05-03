'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag, Menu, X, Search, ChevronDown,
  User, Heart, Package, Phone, Truck, Shield,
  Sparkles, ArrowRight, Clock,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; slug: string; }

// ─── Announcement messages ────────────────────────────────────────────────────
const announcements = [
  { icon: Truck,     text: 'Free White-Glove Delivery on Orders Over £500' },
  { icon: Shield,    text: '10-Year Frame Guarantee on Every Sofa'         },
  { icon: Sparkles,  text: 'Cash on Delivery Available Nationwide'          },
  { icon: Clock,     text: 'Next-Day Delivery Available — Order Before 2pm' },
];

// ─── Nav links ────────────────────────────────────────────────────────────────
const navLinks = [
  { href: '/',              label: 'Home'     },
  { href: '/shop/all',      label: 'Shop',  hasMenu: true },
  { href: '/showroom',      label: 'Showroom' },
  { href: '/track-order',   label: 'Track'    },
  { href: '/contact',       label: 'Contact'  },
];

const mobileLinks = [
  { href: '/',            label: 'Home',          icon: '⌂'  },
  { href: '/shop/all',    label: 'All Sofas',     icon: '🛋'  },
  { href: '/showroom',    label: 'Showroom',      icon: '◈'  },
  { href: '/track-order', label: 'Track Order',   icon: '◎'  },
  { href: '/contact',     label: 'Contact Us',    icon: '✉'  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Header() {
  const { itemCount } = useCart();
  const pathname = usePathname();

  // State
  const [scrolled, setScrolled]         = useState(false);
  const [scrollDir, setScrollDir]       = useState<'up'|'down'>('up');
  const [prevY, setPrevY]               = useState(0);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [megaOpen, setMegaOpen]         = useState(false);
  const [annoIdx, setAnnoIdx]           = useState(0);
  const [annoVisible, setAnnoVisible]   = useState(true);
  const [annoExiting, setAnnoExiting]   = useState(false);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [query, setQuery]               = useState('');
  const [prevCount, setPrevCount]       = useState(0);
  const [cartBounce, setCartBounce]     = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const megaRef   = useRef<HTMLDivElement>(null);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Scroll behaviour
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled(y > 40);
          setScrollDir(y > prevY ? 'down' : 'up');
          setPrevY(y);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [prevY]);

  // Fetch categories
  useEffect(() => {
    createClient()
      .from('categories').select('id,name,slug').order('name')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  // Focus search on open
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 80);
  }, [searchOpen]);

  // Announcement cycle
  useEffect(() => {
    const id = setInterval(() => {
      setAnnoExiting(true);
      setTimeout(() => {
        setAnnoIdx(i => (i + 1) % announcements.length);
        setAnnoExiting(false);
      }, 350);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Cart badge bounce
  useEffect(() => {
    if (itemCount > prevCount) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 600);
    }
    setPrevCount(itemCount);
  }, [itemCount]);

  // Mega menu delay helpers
  const openMega  = useCallback(() => {
    clearTimeout(megaTimer.current);
    setMegaOpen(true);
  }, []);
  const closeMega = useCallback(() => {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 180);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Derived
  const isTransparent = !scrolled && pathname === '/';
  const hidden        = scrolled && scrollDir === 'down' && !menuOpen && !searchOpen;

  const AnnoIcon = announcements[annoIdx].icon;

  return (
    <>
      {/* ══════════════════════════════════════
          ANNOUNCEMENT BAR
      ══════════════════════════════════════ */}
      {annoVisible && (
        <div
          className="relative overflow-hidden"
          style={{ background: '#0c0c0b', height: 34 }}
        >
          {/* Shimmer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(212,135,26,0.06) 50%, transparent 100%)',
              animation: 'shimmer 3s linear infinite',
              backgroundSize: '200% 100%',
            }}
          />

          {/* Message */}
          <div className="flex items-center justify-center h-full gap-2 px-10">
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                opacity: annoExiting ? 0 : 1,
                transform: annoExiting ? 'translateY(-8px)' : 'translateY(0)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              <AnnoIcon style={{ width: 12, height: 12, color: '#d4871a', flexShrink: 0 }} />
              <span style={{ fontSize: 10, letterSpacing: '0.16em', color: '#a8a29e', textTransform: 'uppercase', fontWeight: 500 }}>
                {announcements[annoIdx].text}
              </span>
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setAnnoVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-300 transition-colors"
            style={{ lineHeight: 1 }}
            aria-label="Dismiss"
          >
            <X style={{ width: 11, height: 11 }} />
          </button>

          {/* Dot indicators */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={() => setAnnoIdx(i)}
                style={{
                  width: i === annoIdx ? 14 : 4, height: 4, borderRadius: 2,
                  background: i === annoIdx ? '#d4871a' : '#3f3f3f',
                  transition: 'width 0.3s ease, background 0.3s ease',
                  border: 'none', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          MAIN HEADER
      ══════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.4s cubic-bezier(.16,1,.3,1), background 0.4s ease, box-shadow 0.4s ease',
          background: isTransparent ? 'rgba(12,12,11,0)' : 'rgba(255,255,255,0.97)',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.07)' : 'none',
        }}
      >
        {/* Amber top rule — only when scrolled */}
        <div
          style={{
            height: 2,
            background: '#d4871a',
            transform: scrolled ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.5s cubic-bezier(.16,1,.3,1)',
          }}
        />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>

            {/* ── Hamburger (mobile) ── */}
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden flex flex-col justify-center items-center gap-1"
              style={{ width: 36, height: 36 }}
              aria-label="Open menu"
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: i === 1 ? 16 : 22,
                    height: 1.5,
                    background: isTransparent ? '#fff' : '#1c1917',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              ))}
            </button>

            {/* ── Logo ── */}
            <Link
              href="/"
              style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
            >
              {/* Icon mark */}
              <div
                style={{
                  width: 32, height: 32,
                  background: '#d4871a',
                  borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.3s ease',
                }}
                className="hover:scale-110"
              >
                <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, fill: 'white' }}>
                  <path d="M21 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zM5 7h14v2H5zm14 8H5v-1h14zm1-3H4v-1h16z"/>
                </svg>
              </div>
              {/* Wordmark */}
              <div className="hidden sm:block">
                <div
                  className="font-playfair font-bold leading-none"
                  style={{
                    fontSize: 18,
                    color: isTransparent ? '#fff' : '#1c1917',
                    transition: 'color 0.4s ease',
                  }}
                >
                  UK Sofa<span style={{ color: '#d4871a' }}>Shop</span>
                </div>
                <div
                  style={{
                    fontSize: 8,
                    letterSpacing: '0.2em',
                    color: isTransparent ? 'rgba(255,255,255,0.45)' : '#a8a29e',
                    textTransform: 'uppercase',
                    transition: 'color 0.4s ease',
                  }}
                >
                  British Craftsmanship
                </div>
              </div>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center" style={{ gap: 4 }}>
              {navLinks.map(({ href, label, hasMenu }) =>
                hasMenu ? (
                  <div
                    key={label}
                    ref={megaRef}
                    onMouseEnter={openMega}
                    onMouseLeave={closeMega}
                    style={{ position: 'relative' }}
                  >
                    <button
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px',
                        fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
                        color: isTransparent ? 'rgba(255,255,255,0.8)' : '#44403c',
                        background: megaOpen ? (isTransparent ? 'rgba(255,255,255,0.08)' : '#fef9f0') : 'transparent',
                        border: 'none', cursor: 'pointer', borderRadius: 6,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {label}
                      <ChevronDown
                        style={{
                          width: 12, height: 12,
                          transform: megaOpen ? 'rotate(180deg)' : 'rotate(0)',
                          transition: 'transform 0.3s ease',
                          color: '#d4871a',
                        }}
                      />
                    </button>

                    {/* Mega menu */}
                    <div
                      onMouseEnter={openMega}
                      onMouseLeave={closeMega}
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
                        transform: `translateX(-50%) ${megaOpen ? 'translateY(0)' : 'translateY(-8px)'}`,
                        opacity: megaOpen ? 1 : 0,
                        pointerEvents: megaOpen ? 'auto' : 'none',
                        transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(.16,1,.3,1)',
                        width: 440,
                        background: '#fff',
                        borderRadius: 10,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 1px 0 rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Amber top border */}
                      <div style={{ height: 2, background: '#d4871a' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                        {/* Categories */}
                        <div style={{ padding: '18px 20px', borderRight: '1px solid #f5f5f4' }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
                            Categories
                          </div>
                          {categories.slice(0, 6).map((cat, i) => (
                            <Link
                              key={cat.id}
                              href={`/shop/${cat.slug}`}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '7px 0',
                                fontSize: 12, color: '#57534e',
                                textDecoration: 'none',
                                borderBottom: i < categories.length - 1 ? '1px solid #f5f5f4' : 'none',
                                transition: 'color 0.2s ease',
                              }}
                              className="group"
                            >
                              <span className="group-hover:text-[#d4871a] transition-colors">{cat.name}</span>
                              <ArrowRight style={{ width: 10, height: 10, opacity: 0, transition: 'opacity 0.2s' }}
                                className="group-hover:opacity-100 text-[#d4871a]" />
                            </Link>
                          ))}
                        </div>
                        {/* Promo */}
                        <div
                          style={{
                            padding: '18px 20px',
                            background: '#0c0c0b',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                              New Arrivals
                            </div>
                            <div className="font-playfair" style={{ fontSize: 17, color: '#fff', lineHeight: 1.2, fontWeight: 700 }}>
                              Fresh from Our<br />
                              <em style={{ color: '#d4871a', fontStyle: 'normal' }}>Workshop</em>
                            </div>
                            <p style={{ fontSize: 11, color: '#78716c', marginTop: 6, lineHeight: 1.5 }}>
                              Discover the latest additions to our British luxury collection.
                            </p>
                          </div>
                          <Link
                            href="/shop/all"
                            className="group"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              marginTop: 16, padding: '8px 14px',
                              background: '#d4871a', color: '#fff',
                              fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                              textDecoration: 'none', borderRadius: 5,
                              transition: 'background 0.2s ease',
                            }}
                          >
                            Shop All
                            <ArrowRight style={{ width: 10, height: 10 }} className="group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      position: 'relative',
                      padding: '6px 12px',
                      fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
                      color: pathname === href
                        ? '#d4871a'
                        : (isTransparent ? 'rgba(255,255,255,0.8)' : '#44403c'),
                      textDecoration: 'none',
                      borderRadius: 6,
                      transition: 'color 0.2s ease',
                    }}
                    className="hover:text-[#d4871a]"
                  >
                    {label}
                    {/* Active underline */}
                    <span
                      style={{
                        position: 'absolute', bottom: 2, left: 12, right: 12, height: 1.5,
                        background: '#d4871a', borderRadius: 1,
                        transform: pathname === href ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'transform 0.3s cubic-bezier(.16,1,.3,1)',
                      }}
                    />
                  </Link>
                )
              )}
            </nav>

            {/* ── Right icons ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="hidden lg:flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  width: 34, height: 34, borderRadius: 7,
                  background: isTransparent ? 'rgba(255,255,255,0.1)' : '#f5f5f4',
                  border: 'none', cursor: 'pointer',
                  color: isTransparent ? '#fff' : '#57534e',
                }}
              >
                <Search style={{ width: 14, height: 14 }} />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="hidden md:flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  width: 34, height: 34, borderRadius: 7,
                  background: isTransparent ? 'rgba(255,255,255,0.1)' : '#f5f5f4',
                  color: isTransparent ? '#fff' : '#57534e',
                }}
              >
                <Heart style={{ width: 14, height: 14 }} />
              </Link>

              {/* Account */}
              <Link
                href="/account"
                aria-label="Account"
                className="hidden md:flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  width: 34, height: 34, borderRadius: 7,
                  background: isTransparent ? 'rgba(255,255,255,0.1)' : '#f5f5f4',
                  color: isTransparent ? '#fff' : '#57534e',
                }}
              >
                <User style={{ width: 14, height: 14 }} />
              </Link>

              {/* Cart */}
              <Link
                href="/checkout"
                aria-label="Cart"
                style={{
                  position: 'relative',
                  width: 34, height: 34, borderRadius: 7,
                  background: '#d4871a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s ease, transform 0.2s ease',
                  transform: cartBounce ? 'scale(1.18)' : 'scale(1)',
                }}
                className="hover:bg-[#b8721a]"
              >
                <ShoppingBag style={{ width: 14, height: 14, color: '#fff' }} />
                {itemCount > 0 && (
                  <span
                    style={{
                      position: 'absolute', top: -5, right: -5,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#0c0c0b',
                      color: '#fff',
                      fontSize: 9, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid #fff',
                      animation: cartBounce ? 'none' : undefined,
                    }}
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════
          FULL-SCREEN SEARCH OVERLAY
      ══════════════════════════════════════ */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(12,12,11,0.92)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 120,
          opacity: searchOpen ? 1 : 0,
          pointerEvents: searchOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      >
        <button
          onClick={() => setSearchOpen(false)}
          style={{
            position: 'absolute', top: 20, right: 20,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s ease',
          }}
          aria-label="Close search"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>

        <div style={{ width: '100%', maxWidth: 560, padding: '0 20px' }}>
          <div
            style={{
              transform: searchOpen ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'transform 0.4s cubic-bezier(.16,1,.3,1)',
            }}
          >
            <p style={{ fontSize: 9, letterSpacing: '0.25em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
              Search
            </p>
            <div style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Sofas, corner sofas, fabric…"
                onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                style={{
                  width: '100%', padding: '14px 50px 14px 18px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderBottom: '2px solid #d4871a',
                  color: '#fff', fontSize: 16, outline: 'none', borderRadius: '6px 6px 0 0',
                  boxSizing: 'border-box',
                }}
              />
              <button
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#d4871a',
                }}
              >
                <Search style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: '#57534e', marginTop: 10, textAlign: 'center' }}>
              Press <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>ESC</kbd> to close
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MOBILE FULL-SCREEN MENU
      ══════════════════════════════════════ */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: '#0c0c0b',
          display: 'flex', flexDirection: 'column',
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(.16,1,.3,1)',
        }}
      >
        {/* Amber rule */}
        <div style={{ height: 2, background: '#d4871a', flexShrink: 0 }} />

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="font-playfair font-bold text-white" style={{ fontSize: 18 }}>
            UK Sofa<span style={{ color: '#d4871a' }}>Shop</span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Links — staggered */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '24px 18px' }}>
          {mobileLinks.map(({ href, label, icon }, i) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                textDecoration: 'none',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateX(0)' : 'translateX(-20px)',
                transition: `opacity 0.4s ease ${i * 60 + 100}ms, transform 0.4s cubic-bezier(.16,1,.3,1) ${i * 60 + 100}ms`,
              }}
            >
              <span
                className="font-playfair font-bold"
                style={{
                  fontSize: 24,
                  color: pathname === href ? '#d4871a' : '#fff',
                }}
              >
                {label}
              </span>
              <ArrowRight style={{ width: 14, height: 14, color: '#3f3f3f' }} />
            </Link>
          ))}

          {/* Categories */}
          {categories.length > 0 && (
            <div
              style={{
                marginTop: 24,
                opacity: menuOpen ? 1 : 0,
                transition: `opacity 0.4s ease 420ms`,
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#d4871a', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
                Categories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    href={`/shop/${cat.slug}`}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#a8a29e', fontSize: 11, borderRadius: 5,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    className="hover:bg-[#d4871a]/20 hover:text-white hover:border-[#d4871a]/30"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer strip */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            opacity: menuOpen ? 1 : 0,
            transition: 'opacity 0.4s ease 500ms',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <a href="tel:08001234567"
              style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#78716c', fontSize: 11 }}>
              <Phone style={{ width: 12, height: 12, color: '#d4871a' }} />
              0800 123 4567
            </a>
            <Link href="/track-order"
              style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#78716c', fontSize: 11 }}>
              <Package style={{ width: 12, height: 12, color: '#d4871a' }} />
              Track Order
            </Link>
            <Link href="/checkout"
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                background: '#d4871a', color: '#fff', fontSize: 11, fontWeight: 600,
                padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
              }}>
              <ShoppingBag style={{ width: 12, height: 12 }} />
              Cart {itemCount > 0 && `(${itemCount})`}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}