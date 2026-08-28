'use client';
// src/components/Layout/Mobilenav.tsx

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { House, Grid2X2, Star, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { DUR, EASE } from '@/components/Motion/tokens';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';


const tabs = [
  { href: '/',         icon: House,       label: 'Home' },
  { href: '/shop/all', icon: Grid2X2,     label: 'Shop' },
  { href: '/reviews',  icon: Star,        label: 'Reviews' },
  { href: '/checkout', icon: ShoppingBag, label: 'Cart', isCart: true },
  { href: '/account',  icon: User,        label: 'Account' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const reduced = useReducedMotionSafe();

  if (pathname.startsWith('/admin')) return null;

  return (
    <nav
      aria-label="Primary"
      /**
       * z-bottom-nav (40) sits above z-sticky-bar (30).
       *
       * Both used to be a hardcoded z-50, and with the tie broken by DOM order
       * the product page's add-to-cart bar rendered later and won — so on every
       * product page the bar covered the navigation entirely.
       */
      className="no-select fixed inset-x-0 bottom-0 z-bottom-nav border-t border-calico-300 bg-calico-50/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(25,28,27,0.06)] backdrop-blur-lg lg:hidden"
    >
      <ul className="m-0 flex h-14 list-none items-stretch p-0">
        {tabs.map(({ href, icon: Icon, label, isCart }) => {
          const active = pathname === href || (href === '/shop/all' && pathname.startsWith('/shop'));
          // The cart reads as full whenever it holds something, not only when
          // you happen to be standing on the cart tab.
          const filled = isCart ? itemCount > 0 : active;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                data-press
                aria-current={active ? 'page' : undefined}
                aria-label={isCart && itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : undefined}
                className="relative flex h-full min-h-11 flex-col items-center justify-center gap-1 no-underline"
              >
                {/* One element shared across all five tabs, so it slides from
                    the old tab to the new one instead of shrinking to nothing
                    and growing back somewhere else. */}
                {active && (
                  <motion.span
                    layoutId={reduced ? undefined : 'bottom-nav-indicator'}
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 mx-auto h-0.5 w-6 rounded-b-sm bg-ember-500"
                    transition={{ duration: DUR.base, ease: EASE.out }}
                  />
                )}

                <span className="relative grid h-6 w-6 place-items-center">
                  <Icon
                    aria-hidden="true"
                    strokeWidth={active ? 2.2 : 1.8}
                    className={`h-5 w-5 transition-colors duration-swift ${
                      active ? 'text-ember-700' : 'text-ink-500'
                    } ${filled ? 'fill-ember-500' : 'fill-none'}`}
                  />
                  {isCart && itemCount > 0 && (
                    <span
                      key={itemCount}
                      className="cart-pop absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-pill border-2 border-calico-50 bg-ember-500 px-1 font-data text-caption font-bold leading-none text-ink-900"
                    >
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </span>

                <span
                  className={`text-caption leading-none transition-colors duration-swift ${
                    active ? 'font-bold text-ember-700' : 'font-medium text-ink-500'
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
