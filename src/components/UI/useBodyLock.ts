'use client';
// src/components/Product/useBodyLock.ts

import { useEffect } from 'react';

/**
 * Freezes the page behind an overlay.
 *
 * The product page opens three things over itself — the lightbox, the
 * dimensions panel and the custom-size panel — and none of them used to stop
 * the page scrolling underneath. This is also what stops Lenis while an
 * overlay is open; see SmoothScroll.
 *
 * Counted, because two overlays can be open at once (tap a swatch photo while
 * the dimensions panel is up) and the first one to close would otherwise hand
 * scrolling back to a page that is still covered.
 */
let locks = 0;

export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      locks -= 1;
      if (locks <= 0) {
        locks = 0;
        document.body.style.overflow = '';
      }
    };
  }, [active]);
}
