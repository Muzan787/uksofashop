'use client';
// src/components/Product/StickyBar.tsx

import Image from 'next/image';
import { Check, ShoppingBag } from 'lucide-react';
import { blurDataURL } from '@/utils/cloudinary';

interface Props {
  /** The selected variant's photograph. */
  image: string | null;
  title: string;
  price: number;
  /** True once the in-flow add-to-cart button has scrolled off the top. */
  visible: boolean;
  added: boolean;
  onAdd: () => void;
}

/** Height of the site's bottom navigation. */

/**
 * The phone's add-to-cart bar.
 *
 * It used to be pinned at `bottom: calc(env(safe-area-inset-bottom) - 56px)`.
 * On a device that reports no safe-area inset — every Android handset — that
 * resolves to -56px, so the bar hung off the bottom of the viewport: its lower
 * half, including the WhatsApp card it carried, was simply not on screen, and
 * what remained sat on top of the bottom navigation rather than above it. It
 * is now offset by the navigation's height PLUS the inset, so it stacks on the
 * navigation on every device and the inset only ever adds clearance.
 *
 * The WhatsApp card is gone from here entirely. It is a secondary action and
 * it was making the primary conversion bar two rows tall.
 *
 * The bar is also no longer permanent. It stays down until the visitor scrolls
 * past the real add-to-cart button and then slides up, so the first screenful
 * of a product page is the product rather than a toolbar. That is only safe
 * because the in-flow button now renders on phones as well — the bar is a
 * reminder of a control that exists, not the only way to buy.
 */
export default function StickyBar({ image, title, price, visible, added, onAdd }: Props) {
  const clearance = 'calc(var(--bottom-nav) + env(safe-area-inset-bottom))';

  return (
    <div
      // Out of the tab order and out of the accessibility tree while it is off
      // screen, so a keyboard does not land on a second add-to-cart nobody can
      // see. aria-hidden alone would leave the button focusable.
      inert={!visible}
      aria-label="Add to cart"
      style={{
        bottom: clearance,
        // Its own height plus everything below it, so it clears the viewport
        // rather than parking 56px up from the bottom edge.
        transform: visible ? 'translateY(0)' : `translateY(calc(100% + ${clearance}))`,
      }}
      // Tells the floating WhatsApp button to stand down while this is up.
      // See bottomBarShowing() in src/components/Layout/WhatsAppFab.tsx.
      data-bottom-bar=""
      className="fixed inset-x-0 z-sticky-bar border-t border-calico-300 bg-calico-50/90 backdrop-blur-md transition-transform duration-base ease-out-expo md:hidden"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-calico-200">
          {image && (
            <Image
              src={image}
              alt=""
              fill
              sizes="44px"
              loading="lazy"
              placeholder="blur"
              blurDataURL={blurDataURL(image)}
              className="object-cover"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-semibold leading-tight text-ink-900">
            {title}
          </span>
          <span className="mt-0.5 block font-data text-body-sm font-semibold tabular-nums leading-tight text-ink-700">
            £{price.toFixed(0)}
          </span>
        </span>

        <button
          type="button"
          onClick={onAdd}
          disabled={added}
          // Same pill and the same ember gradient as the real button it is a
          // reminder of. No sheen: the bar is already asking for attention by
          // sliding into view, and a second moving thing inside it is noise.
          className={`hover-btn flex h-11 shrink-0 items-center justify-center gap-2 rounded-pill px-5 font-data text-eyebrow font-bold uppercase tracking-[0.08em] transition-colors duration-base ease-out-expo ${
            added ? 'bg-sage-700 text-calico-50' : 'btn-ember bg-ember-500 text-ink-900 shadow-ember'
          }`}
        >
          {added
            ? <><Check aria-hidden="true" className="h-4 w-4" /> Added</>
            : <><ShoppingBag aria-hidden="true" className="h-4 w-4" /> Add</>}
        </button>
      </div>
    </div>
  );
}
