'use client';
// src/components/Product/ProductCard.tsx

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { productTransitionName } from '@/components/Motion/productTransition';
import { blurDataURL } from '@/utils/cloudinary';

export interface CardSwatch {
  id: string;
  /** Human name, for the accessible label. */
  color: string | null;
  /** Rendered dot colour. */
  hex: string | null;
  /** Shown on the card while this dot is hovered. */
  image: string | null;
}

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  /** The price to display, including any variant adjustment the caller applies. */
  price: number;
  href: string;
  image: string | null;
  /** Cross-fades in on hover when there is one. */
  secondaryImage?: string | null;
  /** Small mono badge, top-left. Omitted on a listing where every card shares it. */
  badge?: string | null;
  /** Extra badges beneath it — size and style, inside a collection. */
  badges?: string[];
  reviewCount?: number | null;
  averageRating?: number | null;
  swatches?: CardSwatch[];
  /**
   * Off wherever the same product can appear twice on one page. A
   * view-transition-name must be unique or the browser drops the transition.
   */
  transition?: boolean;
  /** Reveal delay in ms, for grids that stagger. */
  delayMs?: number;
}

const MAX_SWATCHES = 5;

/**
 * The one product card.
 *
 * It replaces three, which were rendering the same sofa at three different
 * aspect ratios — 4:3 on the homepage, square-to-3:4 on the listing, square
 * inside a collection — so the same photograph was cropped three ways
 * depending on which page you arrived from.
 *
 * Two structural notes:
 *
 * The card is NOT a single <Link>. Swatches are buttons, and a button inside
 * an anchor is invalid and unreachable by keyboard. Instead the title's link
 * stretches over the whole card with an ::after, and the swatch row sits above
 * it — so the card is entirely clickable and the dots still work.
 *
 * Every image carries a blur placeholder. Before this, all of them popped out
 * of a flat grey box.
 */
export default function ProductCard({
  id, title, price, href, image, secondaryImage, badge, badges,
  reviewCount, averageRating, swatches = [], transition = true, delayMs = 0,
}: ProductCardData) {
  const [swatchImage, setSwatchImage] = useState<string | null>(null);

  const shown = swatches.slice(0, MAX_SWATCHES);
  const extra = swatches.length - shown.length;
  const hasReviews = (reviewCount ?? 0) > 0;

  return (
    <article
      className="group relative hover-card"
      data-cursor="view"
      style={delayMs ? { animation: `fadeUp var(--dur-base) var(--ease-out-expo) ${delayMs}ms both` } : undefined}
    >
      <div
        data-card-media
        className="relative aspect-square w-full overflow-hidden rounded-md bg-calico-200"
        style={productTransitionName(id, transition)}
      >
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL={blurDataURL(image)}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-calico-300" />
        )}

        {/* The second photograph, revealed on hover. Mounted underneath from
            the start so the swap has nothing to fetch. */}
        {secondaryImage && (
          <Image
            src={secondaryImage}
            alt=""
            fill
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL={blurDataURL(secondaryImage)}
            className={`object-cover transition-opacity ease-out-expo ${
              swatchImage ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{ transitionDuration: 'var(--dur-settle)' }}
          />
        )}

        {/* The hovered swatch's photograph sits on top of both. */}
        {swatchImage && (
          <Image
            key={swatchImage}
            src={swatchImage}
            alt=""
            fill
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL={blurDataURL(swatchImage)}
            className="object-cover"
          />
        )}

        {(badge || badges?.length) && (
          <div className="absolute left-2 top-2 z-raised flex flex-col items-start gap-1">
            {badge && (
              <span className="rounded-sm bg-ember-500 px-2 py-1 font-data text-caption font-semibold uppercase tracking-wider text-ink-900">
                {badge}
              </span>
            )}
            {badges?.map((b) => (
              <span key={b} className="rounded-sm bg-ink-900/85 px-2 py-1 font-data text-caption font-semibold uppercase tracking-wider text-calico-50">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="m-0 font-body text-body font-semibold leading-snug text-ink-900">
          {/* The stretched link. Covers the card without swallowing the
              swatch buttons, which sit above it.
              data-press="off" is load-bearing, not cosmetic. The universal
              press effect gives every a[href] a `scale` while it is held down,
              and a scale is a transform, and a transform would re-anchor this
              ::after to the anchor's own two lines instead of to the card —
              mid-click, between mousedown and mouseup. That is what stopped
              the photograph from being clickable. The card already answers the
              press as a whole via .hover-card:active, so nothing is lost. */}
          <Link
            href={href}
            data-press="off"
            className="line-clamp-2 no-underline transition-colors duration-swift after:absolute after:inset-0 after:content-['']"
          >
            {title}
          </Link>
        </h3>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-data text-[17px] font-semibold tabular-nums text-ink-900">
            £{Math.round(price).toLocaleString('en-GB')}
          </span>

          {/* Only where the product genuinely has approved reviews. */}
          {hasReviews && (
            <span className="flex shrink-0 items-center gap-1">
              <Star aria-hidden="true" className="h-3.5 w-3.5 fill-ember-500 text-ember-500" />
              <span className="font-data text-caption tabular-nums text-ink-500">
                {(averageRating ?? 0).toFixed(1)}
              </span>
              <span className="sr-only">
                out of 5, from {reviewCount} review{reviewCount === 1 ? '' : 's'}
              </span>
            </span>
          )}
        </div>

        {shown.length > 1 && (
          <div
            className="relative z-raised mt-2.5 flex items-center gap-1.5"
            onPointerLeave={() => setSwatchImage(null)}
          >
            {shown.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Preview in ${s.color ?? 'this colour'}`}
                onPointerEnter={() => setSwatchImage(s.image)}
                onFocus={() => setSwatchImage(s.image)}
                onBlur={() => setSwatchImage(null)}
                // Not a link: this previews the colour on the card. Choosing a
                // variant happens on the product page.
                onClick={(e) => e.preventDefault()}
                className="h-4 w-4 rounded-pill border border-ink-900/15 transition-transform duration-swift ease-out-expo hover:scale-125"
                style={{ background: s.hex ?? 'var(--color-calico-300)' }}
              />
            ))}
            {extra > 0 && (
              <span className="font-data text-caption tabular-nums text-ink-500">+{extra}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
