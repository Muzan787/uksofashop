'use client';
// src/components/Layout/useCompactFab.ts
//
// Whether the floating buttons in the bottom-right corner - WhatsApp and
// "Ask us" - should be showing their word or only their icon.
//
// THE PROBLEM THIS SOLVES. Two labelled pills stacked in the corner of a
// 375px phone were 133px wide and 108px tall between them, and with the
// bottom navigation underneath they took the bottom quarter of the screen
// on every page. Muaz asked for the screen to relax (2026-09-18).
//
// THE RULE. The label is shown while the page is at the top, so a first-time
// visitor sees "WhatsApp" and "Ask us" written out once and learns what the
// two buttons are. Once they scroll, the pills contract to 48px circles and
// stay out of the way of whatever they are reading. Scrolling back to the
// very top expands them again.
//
// Hysteresis, on purpose: contract past 96px, expand only under 24px. A
// single threshold would flicker the label on and off while a thumb rests
// near it, and a label that flickers reads as a bug.
//
// Passive listener, one read of scrollY per frame at most. Starts expanded
// on the server and on the first client render so the hydration pass agrees
// with the HTML; the effect corrects it immediately for a page that was
// reloaded mid-scroll.

import { useEffect, useState } from 'react';

const CONTRACT_AT = 96;
const EXPAND_AT = 24;

export function useCompactFab(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setCompact(prev => (prev ? y > EXPAND_AT : y > CONTRACT_AT));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return compact;
}
