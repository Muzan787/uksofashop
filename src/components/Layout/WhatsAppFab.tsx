'use client';
// src/components/Layout/WhatsAppFab.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import { whatsAppHref } from '@/constants/contact';

/** How far down the page before the button is allowed to exist. */
const REVEAL_AFTER = 340;
/** How long the label stays out once something has opened it. */
const COLLAPSE_AFTER = 2800;

/**
 * Is anything already pinned to the bottom of the viewport?
 *
 * The product page raises an add-to-cart bar once you scroll past the real
 * button, and checkout carries a total bar with an expanding summary drawer.
 * Both are `position: fixed` across the foot of the screen, both are on the
 * same z-layer as this button, and both own that space for a better reason
 * than a chat shortcut does. So this button stands down while one is up rather
 * than trying to share the corner with it.
 *
 * Standing down beats lifting above them. A green pill hovering directly over
 * "Add to basket" competes with the one action the page exists to get, and it
 * would be at its loudest at exactly the wrong moment.
 *
 * Two tests, because a bar can be inactive in two different ways:
 *
 *   `display` rather than offsetParent — the add-to-cart bar is `md:hidden`
 *   and the checkout bar `lg:hidden`, so both are still in the DOM on desktop
 *   with no layout box. offsetParent would have been the obvious check and it
 *   is always null for a fixed element, which would have read every bar as
 *   inactive at every width.
 *
 *   `inert`, because the add-to-cart bar does not unmount when it is down. It
 *   translates off the bottom of the screen and marks itself inert, which is
 *   the same signal a keyboard uses to skip it.
 */
function bottomBarShowing(): boolean {
  const bars = document.querySelectorAll<HTMLElement>('[data-bottom-bar]');
  for (const bar of bars) {
    if (bar.hasAttribute('inert')) continue;
    if (getComputedStyle(bar).display === 'none') continue;
    return true;
  }
  return false;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE WHATSAPP BUTTON
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mounted once in MainLayoutWrapper, so it is on every storefront page rather
 * than only the homepage. A contact shortcut that disappears on the product
 * page — where the questions about fabric, size and delivery actually get
 * asked — had it exactly backwards.
 *
 * Four things were wrong with it against the rebuilt homepage.
 *
 * IT SAT ON THE HERO. Fixed to the bottom right from the first frame, it
 * parked a bright green pill over the bottom-right corner of the hero sofa —
 * the single most composed image on the site — before a visitor had read a
 * word. It now waits until the hero has been scrolled past and arrives with a
 * short rise. Nothing floats over the first screen.
 *
 * IT COULD NOT BE READ ON A PHONE. The label only appeared on hover or focus,
 * which on a touch device is never: every mobile visitor got a bare green
 * circle and was left to guess, which is the exact complaint the previous pass
 * on this file set out to fix and only fixed for desktop. It now introduces
 * itself once, the first time it appears, then collapses and stays quiet.
 *
 * THE LABEL FAILED CONTRAST. Calico 50 on WhatsApp green is 2.15:1 — it did
 * not pass for text at any size. It carries Ink 900 now, which is 9.4:1 on the
 * flat green and about 7.6:1 against the darkest stop of the gradient. This is
 * the same rule the palette already applies to Ember: a saturated mid-tone
 * fill is a LIGHT surface and takes dark type, whatever the brand's own
 * marketing does with it.
 *
 * IT WAS THE ONE FLAT ELEMENT LEFT. Everything else on the page is a gradient
 * on a colour-tinted shadow; this was a solid fill with a grey drop shadow. It
 * now uses --grad-whatsapp and --shadow-whatsapp, which are built the same way
 * as the ember pair.
 *
 * The colour itself is untouched — it is WhatsApp's and it is what makes the
 * button recognisable at a glance.
 */
export default function WhatsAppFab() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const introduced = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const expand = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(true);
    timer.current = setTimeout(() => setOpen(false), COLLAPSE_AFTER);
  }, []);

  const collapse = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);

  useEffect(() => {
    const evaluate = () => {
      const past = window.scrollY > REVEAL_AFTER;
      const visible = past && !bottomBarShowing();

      // Passing the same boolean is a no-op in React, so this does not
      // re-render on every frame of a scroll.
      setShown(visible);

      // The one-time introduction. It runs on the button's first appearance
      // rather than on a timer, so it happens when the button is actually on
      // screen to be seen — and never again, because a control that keeps
      // announcing itself is an advert.
      if (visible && !introduced.current) {
        introduced.current = true;
        expand();
      }
    };

    // Scroll is the only thing that changes either input. The reveal threshold
    // is a scroll position, and the add-to-cart bar it has to yield to is
    // itself raised by scrolling — so re-checking here covers both without a
    // second observer. The initial call catches checkout, where the total bar
    // is up from the moment the page loads.
    evaluate();
    window.addEventListener('scroll', evaluate, { passive: true });
    // A resize can cross the breakpoint where a bar stops being display:none.
    window.addEventListener('resize', evaluate);
    return () => {
      window.removeEventListener('scroll', evaluate);
      window.removeEventListener('resize', evaluate);
    };
  }, [expand]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <a
      href={whatsAppHref('I have a question about your sofas')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ask us anything on WhatsApp"
      // Not merely invisible: while it is up on the hero it is out of the tab
      // order and out of the accessibility tree entirely. A control nobody can
      // see should not be the next thing a keyboard lands on.
      inert={!shown}
      onPointerEnter={expand}
      onPointerLeave={collapse}
      onFocus={expand}
      onBlur={collapse}
      // `.fab-offset` clears the bottom navigation and the safe-area inset on
      // mobile, and drops to the ordinary edge inset at lg where there is no
      // navigation to clear. It lives in globals.css because the two values
      // cannot both be written here — see the note on that rule.
      className={`hover-btn btn-whatsapp shadow-whatsapp fab-offset fixed right-4 z-sticky-bar flex h-12 items-center gap-2.5 overflow-hidden rounded-pill bg-whatsapp px-3.5 text-ink-900 no-underline transition-[opacity,transform,padding] duration-base ease-out-expo ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>

      {/* Width, not display: a hidden label would jump the layout open. */}
      <span
        className={`whitespace-nowrap text-body-sm font-semibold transition-[max-width,opacity] duration-base ease-out-expo ${
          open ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0'
        }`}
      >
        Ask us anything
      </span>
    </a>
  );
}
