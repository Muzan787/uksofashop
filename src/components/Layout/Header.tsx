'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, X, Search, ChevronDown, User, Heart, Sofa } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ANNOUNCEMENTS } from '@/constants/promises';
import { useCategories } from '@/hooks/useCategories';
import MegaMenu from './MegaMenu';
import MobileMenu from './MobileMenu';
import SearchOverlay from './SearchOverlay';

/** One message. This bar used to cycle four of them every four seconds. */
const ANNOUNCEMENT = ANNOUNCEMENTS[0];

const navLinks = [
  { href: '/',            label: 'Home' },
  { href: '/shop/all',    label: 'Shop', hasMenu: true },
  { href: '/collection',  label: 'Collections' },
  { href: '/reviews',     label: 'Reviews' },
  { href: '/track-order', label: 'Track' },
  { href: '/contact',     label: 'Contact' },
];

/**
 * The lockup, rendered twice — left on desktop, centred on mobile.
 *
 * The 6.5px "Pay on Delivery" sub-line is gone rather than resized. At the
 * 12px floor it was 144px wide with its letterspacing and crowded the
 * hamburger on a 360px screen, and the announcement bar directly above it
 * already says the same thing.
 */
function Wordmark({ light, className = '' }: { light: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="UK Sofa Shop — home"
      className={`flex min-h-11 items-center gap-2 no-underline ${className}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-ember-500">
        <Sofa className="h-5 w-5 text-ink-900" aria-hidden="true" />
      </span>
      <span
        className={`font-display text-h3 font-semibold leading-none tracking-tight transition-colors duration-swift ${
          light ? 'text-calico-50' : 'text-ink-900'
        }`}
      >
        UK Sofa<span className="text-ember-500">Shop</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const { itemCount } = useCart();
  const categories = useCategories();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up');
  const prevY = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [annoVisible, setAnnoVisible] = useState(true);

  const megaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const megaTrigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  // Focus is only pulled into the drawer when it was opened from the keyboard;
  // doing it on hover would strand a mouse user who then pressed Tab.
  const [megaFromKeyboard, setMegaFromKeyboard] = useState(false);

  // Scroll position and direction. The 2px threshold stops a trackpad or an
  // iOS rubber-band from flipping the direction on every frame.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 40);
        if (Math.abs(y - prevY.current) > 2) {
          setScrollDir(y > prevY.current ? 'down' : 'up');
        }
        prevY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close every overlay when the route changes.
  //
  // Adjusted during render rather than in an effect. An effect would paint the
  // new page once with the drawer still open and only then close it — a visible
  // flash — and it is the pattern React's own docs steer away from. Comparing
  // the stored path to the current one settles it before the first paint.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }

  const openMega = useCallback(() => {
    clearTimeout(megaTimer.current);
    setMegaFromKeyboard(false);
    setMegaOpen(true);
  }, []);
  const closeMega = useCallback(() => {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 180);
  }, []);

  // Lock the page behind anything that opens over it. SmoothScroll watches this
  // exact attribute to stop Lenis, so every overlay gets that for free.
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, searchOpen]);

  const isHome = pathname === '/';

  /**
   * On the homepage, before any scrolling, the chrome sits ON the hero.
   *
   * The old build set the background to a fully transparent black and left the
   * text dark — but the header was in normal flow above the hero, so what you
   * actually saw was the white page showing through: a pale bar sandwiched
   * between the dark announcement bar and the dark hero.
   *
   * The `-mb-14` below is what makes it real. It pulls the following content
   * up by exactly the height of the bar, so the hero starts at the top of the
   * viewport and the header floats over it with Calico 50 text.
   */
  const onHero = isHome && !scrolled;
  const hidden = scrolled && scrollDir === 'down' && !menuOpen && !searchOpen;

  const iconButton =
    'touch-target hover-icon relative grid place-items-center rounded-sm no-underline';
  const iconTone = onHero ? 'text-calico-50' : 'text-ink-700';

  return (
    <>
      {/* The first focusable element in the document. */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-modal focus-visible:rounded-sm focus-visible:bg-ink-900 focus-visible:px-4 focus-visible:py-3 focus-visible:text-body-sm focus-visible:font-semibold focus-visible:text-calico-50 focus-visible:no-underline"
      >
        Skip to content
      </a>

      {/* ── Announcement ──────────────────────────────────────────────────── */}
      {annoVisible && (
        <div className="relative flex min-h-9 items-center justify-center bg-ink-900 px-12 py-2">
          <p aria-live="polite" className="eyebrow m-0 text-center text-calico-300">
            {ANNOUNCEMENT}
          </p>
          <button
            type="button"
            onClick={() => setAnnoVisible(false)}
            aria-label="Dismiss announcement"
            className="hover-icon-dark absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-sm text-calico-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <header
        className={[
          'relative sticky top-0 z-header transition-[transform,background-color,box-shadow] duration-base ease-out-expo',
          hidden ? '-translate-y-full' : 'translate-y-0',
          onHero ? 'bg-transparent' : 'bg-calico-50 shadow-e1',
          isHome ? '-mb-14' : '',
        ].join(' ')}
      >
        {/* The ember rule sweeps in from the left as the bar solidifies. */}
        <span
          aria-hidden="true"
          className={`block h-0.5 origin-left bg-ember-500 transition-transform duration-settle ease-out-expo ${
            scrolled ? 'scale-x-100' : 'scale-x-0'
          }`}
        />

        <div className="mx-auto max-w-shell px-3">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center">
            {/* Left — hamburger on mobile, wordmark on desktop */}
            <div className="flex items-center justify-start">
              <button
                type="button"
                ref={menuTrigger}
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                aria-controls="mobile-menu"
                className={`${iconButton} lg:hidden ${onHero ? 'text-calico-50' : 'text-ink-900'}`}
              >
                <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true">
                  <span className="block h-px w-5 bg-current" />
                  <span className="block h-px w-3.5 bg-current" />
                  <span className="block h-px w-5 bg-current" />
                </span>
              </button>
              <Wordmark light={onHero} className="hidden lg:flex" />
            </div>

            {/* Centre — wordmark on mobile, nav on desktop */}
            <div className="flex items-center justify-center">
              <Wordmark light={onHero} className="lg:hidden" />

              <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
                {navLinks.map(({ href, label, hasMenu }) =>
                  hasMenu ? (
                    <div key={label} onPointerEnter={openMega} onPointerLeave={closeMega}>
                      <button
                        ref={megaTrigger}
                        type="button"
                        aria-expanded={megaOpen}
                        aria-haspopup="dialog"
                        aria-controls="mega-menu"
                        // Opens; never toggles closed. On a hover device the
                        // pointer has already opened the drawer by the time a
                        // click lands, so a toggle here shut it again the
                        // instant you clicked the thing that opens it.
                        // Closing is Escape, outside-click or route change.
                        //
                        // detail === 0 means the activation came from the
                        // keyboard, which is when focus should move inside.
                        onClick={(e) => {
                          setMegaFromKeyboard(e.detail === 0);
                          setMegaOpen(true);
                        }}
                        className={`hover-link flex items-center gap-1 rounded-sm px-3 py-2 text-body-sm font-medium ${
                          onHero ? 'text-calico-50' : 'text-ink-700'
                        }`}
                      >
                        {label}
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-3 w-3 text-ember-500 transition-transform duration-base ease-out-expo ${megaOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  ) : (
                    <Link
                      key={href}
                      href={href}
                      aria-current={pathname === href ? 'page' : undefined}
                      className={`hover-link rounded-sm px-3 py-2 text-body-sm font-medium no-underline ${
                        pathname === href
                          ? 'text-ember-500'
                          : onHero ? 'text-calico-50' : 'text-ink-700'
                      }`}
                    >
                      {label}
                    </Link>
                  ),
                )}
              </nav>
            </div>

            {/* Right — search and cart everywhere, wishlist and account on desktop */}
            <div className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                ref={searchTrigger}
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className={`${iconButton} ${iconTone}`}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              <Link href="/wishlist" aria-label="Wishlist" className={`${iconButton} hidden lg:grid ${iconTone}`}>
                <Heart className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link href="/account" aria-label="Your account" className={`${iconButton} hidden lg:grid ${iconTone}`}>
                <User className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                href="/checkout"
                aria-label={itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Cart, empty'}
                className={`${iconButton} ${iconTone}`}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {itemCount > 0 && (
                  <span key={itemCount} className="cart-pop absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-pill border-2 border-calico-50 bg-ember-500 px-1 font-data text-caption font-bold leading-none text-ink-900">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
        <MegaMenu
          open={megaOpen}
          categories={categories}
          onClose={() => setMegaOpen(false)}
          onPointerEnter={openMega}
          onPointerLeave={closeMega}
          triggerRef={megaTrigger}
          fromKeyboard={megaFromKeyboard}
        />
      </header>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        categories={categories}
        triggerRef={searchTrigger}
      />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
        itemCount={itemCount}
        triggerRef={menuTrigger}
      />
    </>
  );
}
