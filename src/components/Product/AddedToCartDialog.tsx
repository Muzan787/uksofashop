'use client';
// src/components/Product/AddedToCartDialog.tsx

import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import { blurDataURL } from '@/utils/cloudinary';
import { pounds } from '@/utils/pricing';

interface Props {
  title: string;
  /** The colour or fabric the line went in under, as the cart names it. */
  choice: string;
  price: number;
  image: string;
  onBuyNow: () => void;
  onContinue: () => void;
}

/**
 * What "Add to cart" says back (Muaz, 2026-10-30).
 *
 * It used to be a toast at the top of the screen and the button turning to a
 * tick, and the visitor was left to find the cart icon themselves. Now both
 * add-to-cart buttons, and "Build mine in this" in the fabric picker, put the
 * sofa in the cart and then ask the one question that is left: buy it now, or
 * keep looking. Closing it any other way - the cross, Escape, the scrim - is
 * the same as "Continue shopping": the sofa stays in the cart either way.
 *
 * The sofa is shown with the colour or fabric it was added in, because on a
 * made-to-order frame that is the choice most worth a second look.
 */
export default function AddedToCartDialog({ title, choice, price, image, onBuyNow, onContinue }: Props) {
  return (
    <Modal
      title="Added to your cart"
      onClose={onContinue}
      size="sm"
      icon={<Check aria-hidden="true" className="h-4 w-4 shrink-0 text-sage-700" strokeWidth={3} />}
    >
      <div className="flex items-center gap-4">
        <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-md bg-calico-200">
          <Image
            src={image}
            alt=""
            fill
            sizes="80px"
            placeholder={blurDataURL(image) ? 'blur' : 'empty'}
            blurDataURL={blurDataURL(image)}
            unoptimized={image.endsWith('.svg')}
            className="object-cover"
          />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-body font-semibold leading-snug text-ink-900">{title}</span>
          {choice && <span className="mt-0.5 text-body-sm text-ink-500">{choice}</span>}
          <span className="mt-1 font-data text-body font-semibold tabular-nums text-ink-900">{pounds(price)}</span>
        </span>
      </div>

      <p className="m-0 mt-4 text-caption leading-relaxed text-ink-500">
        Nothing to pay now. We confirm your order with you on WhatsApp, and you pay when it arrives.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={onBuyNow}
          className="hover-btn btn-ember sheen shadow-ember flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-ember-500 px-6 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900"
        >
          Buy this now
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="hover-btn flex h-12 cursor-pointer items-center justify-center rounded-pill border border-calico-300 bg-calico-50 px-6 text-body-sm font-semibold text-ink-900"
        >
          Continue shopping
        </button>
      </div>
    </Modal>
  );
}
