'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid2X2, Star, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const ACCENT = '#d4871a';

const tabs = [
  { href: '/',           icon: Home,       label: 'Home'    },
  { href: '/shop/all',   icon: Grid2X2,    label: 'Shop'    },
  { href: '/reviews',    icon: Star,       label: 'Reviews' },
  { href: '/checkout',   icon: ShoppingBag,label: 'Cart',  isCart: true },
  { href: '/account',    icon: User,       label: 'Account' },
];

export default function MobileNav() {
  const pathname  = usePathname();
  const { itemCount } = useCart();

  // Hide on admin pages
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 no-select"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', height: 56 }}>
        {tabs.map(({ href, icon: Icon, label, isCart }) => {
          const active = pathname === href ||
            (href === '/shop/all' && pathname.startsWith('/shop'));

          return (
            <Link
              key={href}
              href={href}
              className="btn-press"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                position: 'relative',
                minHeight: 44,
              }}
            >
              {/* Active indicator — top pill */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: active ? 24 : 0,
                height: 2,
                background: ACCENT,
                borderRadius: '0 0 3px 3px',
                transition: 'width 0.25s cubic-bezier(.16,1,.3,1)',
              }} />

              {/* Icon wrapper */}
              <div style={{
                position: 'relative',
                width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon
                  style={{
                    width: 20, height: 20,
                    color: active ? ACCENT : '#a8a29e',
                    transition: 'color 0.2s ease, transform 0.2s ease',
                    transform: active ? 'scale(1.1)' : 'scale(1)',
                    ...(isCart && active ? { fill: ACCENT } : {}),
                  }}
                  strokeWidth={active ? 2.2 : 1.8}
                />

                {/* Cart badge */}
                {isCart && itemCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -5, right: -6,
                    minWidth: 16, height: 16,
                    background: ACCENT,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 800,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    border: '2px solid #fff',
                    lineHeight: 1,
                  }}>
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 9,
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.04em',
                color: active ? ACCENT : '#a8a29e',
                transition: 'color 0.2s ease',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}