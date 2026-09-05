'use client';
// src/components/Layout/MobileMenu.tsx

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House, Sofa, LayoutGrid, Palette, Star, PackageSearch, Mail,
  Phone, ShoppingBag, X, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { PHONE_HREF, PHONE_DISPLAY } from '@/constants/contact';
import { STAGGER_STEP, STAGGER_CAP } from '@/components/Motion/tokens';

interface Category { id: string; name: string; slug: string }

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  itemCount: number;
  /** Restored focus goes here on close. */
  triggerRef: React.RefObject<HTMLElement | null>;
}

/** Lucide, replacing the ⌂ 🛋 ⊞ ★ ◎ ✉ glyphs, which rendered differently on
 *  every platform and were read aloud as punctuation. */
const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/',            label: 'Home',         icon: House },
  { href: '/shop/all',    label: 'All Sofas',    icon: Sofa },
  { href: '/collection',  label: 'Collections',  icon: LayoutGrid },
  // Palette, not Package: PackageSearch is two rows below on Track Order, and
  // two parcel outlines a thumb apart is a distinction nobody makes at a
  // glance. This row is about choosing a colour anyway.
  { href: '/swatches',    label: 'Free Samples', icon: Palette },
  { href: '/reviews',     label: 'Reviews',      icon: Star },
  { href: '/track-order', label: 'Track Order',  icon: PackageSearch },
  { href: '/contact',     label: 'Contact Us',   icon: Mail },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export default function MobileMenu({ open, onClose, categories, itemCount, triggerRef }: Props) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDivElement>(null);

  /**
   * A real focus trap. This one is a modal sheet opened by an explicit tap, so
   * unlike the hover-opened mega menu there is no ambiguity about intent:
   * focus moves in on open, cycles inside while it is open, and returns to the
   * hamburger on close. Before this the sheet locked body scroll and nothing
   * else — a keyboard user tabbed straight through it into the page behind.
   */
  useEffect(() => {
    if (!open) return;

    const node = sheet.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !node) return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const firstEl = items[0];
      const lastEl = items[items.length - 1];

      // Focus escaping the sheet entirely — a click elsewhere, say — is pulled
      // back in rather than left outside a modal.
      if (!node.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, triggerRef]);

  return (
    <>
      {/* The scrim. Tapping it closes, which the old sheet had no way to do.
          Blurred as well as darkened: the page behind a modal should be
          plainly out of reach, and 60% ink on its own still left a legible
          page competing with the sheet in front of it. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-drawer bg-ink-900/60 backdrop-blur-sm transition-opacity duration-base ease-in-out-quart lg:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={sheet}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        data-ground="dark"
        className={`grad-ink grain fixed inset-y-0 left-0 z-drawer isolate flex w-[min(88vw,380px)] flex-col overflow-hidden bg-ink-900 shadow-e3 transition-transform duration-base ease-in-out-quart lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* The same lighting as the hero and the footer. Warm and low only —
            the indigo wash belongs to the one cool section on the homepage. */}
        <div aria-hidden="true" className="aurora">
          <span className="aurora__warm" />
          <span className="aurora__deep" />
        </div>

        {/* The ember edge, fading out rather than stopping dead at the corner. */}
        <span
          aria-hidden="true"
          className="relative block h-0.5 shrink-0"
          style={{ backgroundImage: 'var(--grad-rule)' }}
        />

        <div className="relative flex shrink-0 items-center justify-between border-b border-calico-50/10 p-4">
          <span className="font-display text-h3 font-semibold text-calico-50">
            UK Sofa<span className="text-ember-300">Shop</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="hover-icon-dark glass-dark-panel grid h-11 w-11 place-items-center rounded-pill text-calico-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile" data-lenis-prevent className="relative flex-1 overflow-y-auto px-4 py-2">
          <ul className="m-0 list-none p-0">
            {LINKS.map(({ href, label, icon: Icon }, i) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={`group flex min-h-14 items-center gap-3.5 no-underline transition-[opacity,transform] duration-base ease-out-expo ${
                      open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                    }`}
                    style={{
                      transitionDelay: open
                        ? `${Math.min(i, STAGGER_CAP - 1) * STAGGER_STEP * 1000 + 80}ms`
                        : '0ms',
                    }}
                  >
                    {/* The icon sits in its own well rather than loose against
                        the type. It was ink-400 on ink-900 — 4.4:1, technically
                        legible and visually almost absent, so the row read as
                        text with a smudge in front of it. */}
                    <span
                      aria-hidden="true"
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill transition-colors duration-swift ease-out-expo ${
                        current ? 'bg-ember-500/15' : 'glass-dark-panel'
                      }`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 ${current ? 'text-ember-300' : 'text-calico-300'}`}
                      />
                    </span>

                    <span
                      className={`flex-1 font-display text-h2 font-semibold leading-none ${
                        current ? 'text-ember-300' : 'text-calico-50'
                      }`}
                    >
                      {label}
                    </span>

                    <ArrowRight
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 transition-transform duration-swift ease-out-expo group-hover:translate-x-1 ${
                        current ? 'text-ember-300' : 'text-calico-300/50'
                      }`}
                    />
                  </Link>

                  {/* An ember lead into a fading hairline — the mark the
                      figures band, the section headings and the footer columns
                      all carry. It was a flat 25% ember line straight across. */}
                  <span aria-hidden="true" className="flex w-full">
                    <span className="block h-px w-6 bg-ember-500" />
                    <span className="block h-px flex-1 bg-calico-50/12" />
                  </span>
                </li>
              );
            })}
          </ul>

          {categories.length > 0 && (
            <div className="mt-7">
              <p className="eyebrow m-0 mb-3.5 flex items-center gap-2.5 text-ember-300">
                <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/shop/${cat.slug}`}
                    className="glass-dark-panel hover-btn hover-btn-dark rounded-pill px-3.5 py-2 text-caption text-calico-300 no-underline"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* The foot. `pb-safe` rather than the bottom-nav clearance: this sheet
            sits ABOVE that bar in the z-stack (drawer 70, nav 40) and covers
            it, so there is nothing to clear — only the handset's own home
            indicator to stay clear of.

            Written as px-4 pt-4 rather than p-4, because `p-4` and `pb-safe`
            are both single-class utilities setting padding-bottom and the
            winner comes down to the order they land in the stylesheet rather
            than the order they are written here. `pb-safe` happened to win and
            the foot sat on 12px; either way it was luck. Not overlapping them
            leaves nothing to resolve. */}
        <div className="relative flex shrink-0 flex-wrap items-center gap-3 border-t border-calico-50/10 px-4 pt-4 pb-safe">
          <a
            href={PHONE_HREF}
            className="glass-dark-panel hover-btn hover-btn-dark flex min-h-11 items-center gap-2 rounded-pill px-3.5 font-data text-caption tabular-nums text-calico-300 no-underline"
          >
            <Phone aria-hidden="true" className="h-3.5 w-3.5 text-ember-300" />
            {PHONE_DISPLAY}
          </a>

          <Link
            href="/checkout"
            className="hover-btn btn-ember sheen shadow-ember ml-auto flex min-h-11 items-center gap-2 rounded-pill bg-ember-500 px-5 text-caption font-semibold text-ink-900 no-underline"
          >
            <ShoppingBag aria-hidden="true" className="h-3.5 w-3.5" />
            Cart {itemCount > 0 && `(${itemCount})`}
          </Link>
        </div>
      </div>
    </>
  );
}
