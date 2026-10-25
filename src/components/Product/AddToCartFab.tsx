'use client';
// src/components/Product/AddToCartFab.tsx

import { Check, ShoppingBag } from 'lucide-react';

interface Props {
  price: number;
  added: boolean;
  onAdd: () => void;
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
 * ON SCREEN FOR THE WHOLE PAGE, at every width, from the first screen to the
 * footer (Muaz, 2026-10-26). For a while it waited on phones until the price
 * had scrolled past, because at 375x812 it once covered a price drawn at
 * 745px; the price has drawn well above the pill since the 10 Oct pass. The
 * price stays on its label, so it repeats what the button costs wherever the
 * visitor is.
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
export default function AddToCartFab({ price, added, onAdd }: Props) {
  return (
    <div
      data-journey-section="sticky"
      className="fab-offset fixed left-4 z-sticky-bar transition-[bottom] duration-base ease-out-expo"
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
