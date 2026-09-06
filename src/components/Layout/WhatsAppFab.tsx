'use client';
// src/components/Layout/WhatsAppFab.tsx

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { whatsAppHref } from '@/constants/contact';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function makeReference(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const suffix = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
  return `UKSS-WA-${yy}${mm}${dd}-${suffix}`;
}

function coveringBarHeight(): number {
  const bars = document.querySelectorAll<HTMLElement>('[data-bottom-bar]');
  let tallest = 0;
  for (const bar of bars) {
    if (bar.hasAttribute('inert')) continue;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    tallest = Math.max(tallest, rect.height);
  }
  return tallest;
}

/**
 * Site-wide acquisition CTA.
 *
 * Visible from the first frame and never hidden. If a sticky product or
 * checkout bar owns the bottom edge, the button moves above it instead.
 * On a canonical product route (/shop/category/product), the WhatsApp message
 * names the visible product and always carries an opaque UKSS-WA reference.
 */
export default function WhatsAppFab() {
  const pathname = usePathname();
  const reference = useMemo(() => makeReference(), [pathname]);
  const [productName, setProductName] = useState<string | null>(null);
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);
    const isProductPage = parts[0] === 'shop' && parts.length >= 3;
    const heading = isProductPage ? document.querySelector('h1')?.textContent?.trim() : '';
    setProductName(heading || null);

    const evaluate = () => {
      const height = coveringBarHeight();
      setExtra(height > 0 ? height + 12 : 0);
    };

    evaluate();
    window.addEventListener('scroll', evaluate, { passive: true });
    window.addEventListener('resize', evaluate);
    return () => {
      window.removeEventListener('scroll', evaluate);
      window.removeEventListener('resize', evaluate);
    };
  }, [pathname]);

  const message = productName
    ? `Hi, I'm enquiring about the ${productName}.\n\nRef: ${reference}`
    : `Hi, I'd like some help with a sofa enquiry.\n\nRef: ${reference}`;

  return (
    <>
      <a
        href={whatsAppHref(message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={productName ? `Enquire about ${productName} on WhatsApp` : 'Chat with us on WhatsApp'}
        style={{ '--ukss-wa-extra': `${extra}px` } as CSSProperties}
        className="ukss-wa-fab hover-btn btn-whatsapp shadow-whatsapp fixed right-4 z-sticky-bar flex h-12 items-center gap-2 rounded-pill bg-whatsapp px-4 text-ink-900 no-underline transition-[bottom] duration-base ease-out-expo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="whitespace-nowrap text-body-sm font-semibold">WhatsApp</span>
      </a>
      <style>{`
        .ukss-wa-fab {
          bottom: calc(var(--bottom-nav) + env(safe-area-inset-bottom) + 16px + var(--ukss-wa-extra, 0px));
        }
        @media (min-width: 64rem) {
          .ukss-wa-fab { bottom: calc(1.5rem + var(--ukss-wa-extra, 0px)); }
        }
      `}</style>
    </>
  );
}
