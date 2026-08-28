'use client';
// src/components/Product/AddToCart.tsx

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, ShoppingBag } from 'lucide-react';
import { DUR, EASE } from '@/components/Motion';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';


interface Props {
  price: number;
  added: boolean;
  onAdd: () => void;
  inWishlist: boolean;
  wishlistBusy: boolean;
  onWishlist: () => void;
}

/**
 * The commit.
 *
 * Ember 500 with Ink 900 letterforms — 6.6:1, and the reason the palette says
 * an ember fill never carries white. It is 56px tall and takes the whole row
 * because on this page nothing competes with it.
 *
 * On click it changes into its own confirmation rather than being replaced by
 * one: the label dissolves into a tick while the fill runs to sage underneath,
 * and after two seconds it comes back. A toast still fires — this is the
 * acknowledgement in the place the customer is already looking.
 */
export default function AddToCart({
  price, added, onAdd, inWishlist, wishlistBusy, onWishlist,
}: Props) {
  const reduced = useReducedMotionSafe();
  const swift = { duration: reduced ? 0 : DUR.swift, ease: EASE.out };

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        aria-live="polite"
        // The pill, the ember gradient and the sheen are the same three things
        // every primary action on the site carries — the hero's "Shop all
        // sofas", the closing panel, the rail's end card. This is the most
        // important button on the site and it was the one still drawn as a
        // flat square fill.
        //
        // The sheen is dropped in the confirmed state. A band of light crossing
        // "Added to cart" reads as the button still asking to be pressed.
        className={`relative flex h-14 flex-1 items-center justify-center overflow-hidden rounded-pill font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-[background-color,box-shadow] duration-base ease-out-expo ${
          added
            ? 'bg-sage-700 text-calico-50'
            : 'hover-btn btn-ember sheen bg-ember-500 text-ink-900 shadow-ember'
        }`}
      >
        {/* Both labels are absolutely placed so they overlap for the length of
            the dissolve. Laid out in flow they would push each other sideways
            and the tick would arrive from off-centre. */}
        <AnimatePresence initial={false}>
          {added ? (
            <motion.span
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={swift}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              Added to cart
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={swift}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              Add to cart — £{price.toFixed(0)}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <button
        type="button"
        onClick={onWishlist}
        disabled={wishlistBusy}
        aria-pressed={inWishlist}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
        className="hover-icon relative flex h-14 w-14 shrink-0 items-center justify-center rounded-pill border border-calico-300 bg-calico-50 shadow-e1"
      >
        <Heart aria-hidden="true" className="h-6 w-6 fill-transparent text-ink-500" />

        {/* The fill grows out of the middle of the outline rather than
            appearing at full size, so saving something reads as an action
            rather than as a repaint. */}
        <AnimatePresence initial={false}>
          {inWishlist && (
            <motion.span
              key="filled"
              initial={{ scale: reduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : DUR.base, ease: EASE.out }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Heart aria-hidden="true" className="h-6 w-6 fill-ember-500 text-ember-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
