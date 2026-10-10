'use client';
// src/components/Product/AddToCartFab.tsx

import { Check, ShoppingBag } from 'lucide-react';

interface Props {
  price: number;
  added: boolean;
  onAdd: () => void;
  /**
   * Decided by ProductPageClient. On a phone the pill waits until the price
   * has scrolled off the top, and stands aside while the buy box's own button
   * is on screen; from md up it is always shown.
   */
  visible: boolean;
}

/**
 * The floating add-to-cart button.
 *
 * The product page used to carry a full-width bar on phones - photograph,
 * title, price and an "Add" button - that slid up once the real button had
 * scrolled away, and nothing at all on desktop, where the buy box pins but is
 * taller than most viewports, so its button was often off the bottom of the
 * screen anyway. This replaces both with one pill in the bottom-left corner:
 * the mirror image of the WhatsApp pill on the right. Buy on one side, ask on
 * the other.
 *
 * NOT FROM THE FIRST SCREEN ON A PHONE. It was, and at 375x812 it sat exactly
 * over the price, which drew at 745px against the pill's 748-796. A visitor
 * from an ad that quoted a price landed on a page that hid it. It now waits
 * until the price has been seen and scrolled past (see `visible`), which is
 * also why the price is back on it at every width: by the time it appears,
 * the WhatsApp pill opposite has contracted to its 48px circle and the full
 * "ADD TO CART — £549" fits beside it on a 375px phone.
 *
 * SAME BUTTON, SMALLER. It is the buy box's button in every respect that
 * matters - the same ember pill, the same sheen, the same uppercase data face,
 * the same handler and therefore the same AddToCart event - at the WhatsApp
 * pill's 48px rather than the buy box's 56px, so the two corners match. And it
 * confirms the same way: the fill runs to sage and the label becomes a tick for
 * two seconds.
 *
 * POSITION AND STACKING are the WhatsApp button's: `.fab-offset` clears the
 * safe-area inset and any bar pinned to the bottom edge, and z-sticky-bar
 * keeps it under the consent banner and every dialog - so it cannot sit over
 * the fabric picker it is the reason for.
 *
 * The fixed positioning is on a wrapper rather than on the button because
 * `.sheen` (globals.css) sets `position: relative` for the band of light it
 * draws, and as unlayered CSS it beats Tailwind's `fixed` utility every time.
 * The buy box's button is relative anyway; this one would have been pinned
 * to nothing.
 */
export default function AddToCartFab({ price, added, onAdd, visible }: Props) {
  return (
    <div
      // inert while hidden, so a keyboard or screen reader does not land on a
      // button nobody can see.
      inert={!visible || undefined}
      className={`fab-offset fixed left-4 z-sticky-bar transition-[bottom,opacity,transform] duration-base ease-out-expo ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        aria-live="polite"
        className={`flex h-12 items-center gap-2 rounded-pill px-4 font-data text-eyebrow font-bold uppercase tracking-[0.08em] transition-[background-color,box-shadow] duration-base ease-out-expo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 ${
          added
            ? 'bg-sage-700 text-calico-50'
            : 'hover-btn btn-ember sheen bg-ember-500 text-ink-900 shadow-ember'
        }`}
      >
        {added ? (
          <>
            <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Added</span>
          </>
        ) : (
          <>
            <ShoppingBag aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">
              Add to cart — £{price.toFixed(0)}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
