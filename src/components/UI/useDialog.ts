'use client';
// src/components/Product/useDialog.ts

import { useEffect, useRef } from 'react';
import { useBodyLock } from './useBodyLock';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Everything a dialog on this page has to do, in one place.
 *
 * Locks the page behind it, moves focus in, keeps Tab inside, closes on
 * Escape, and puts focus back on whatever opened it. The product page opens
 * three of these — the lightbox, the dimensions panel and the custom-size
 * panel — and until now each one implemented a different subset: the
 * custom-size panel had Escape and a scroll lock but no trap at all, so Tab
 * walked straight out of it into the page underneath.
 *
 * Attach the returned ref to the panel and give it `tabIndex={-1}`.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  // Held in a ref so a caller passing an inline arrow does not re-bind the key
  // listener — and re-run the focus effect — on every render. Written after
  // commit rather than during render; the handler only ever reads it from an
  // event, which is always later than that.
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useBodyLock(true);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => { opener?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close.current(); return; }
      if (e.key !== 'Tab') return;

      const panel = ref.current;
      const nodes = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        .filter(n => n.offsetParent !== null || n === document.activeElement);

      if (!nodes.length) { e.preventDefault(); return; }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (!panel?.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return ref;
}
