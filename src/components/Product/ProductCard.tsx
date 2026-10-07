'use client';
// src/components/Product/ProductCard.tsx

import { useState, useEffect, useRef } from 'react';
import { emitGoogleEvent, googleNavigationId } from '@/utils/googleMeasurement';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { productTransitionName } from '@/components/Motion/productTransition';
import { blurDataURL } from '@/utils/cloudinary';
import { percentOff } from '@/utils/pricing';

interface CardSwatch {
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
  variantId?: string;
  listId?: string;
  title: string;
  slug: string;
  /** The price to display, including any variant adjustment the caller applies. */
  price: number;
  /**
   * What it used to cost, with the same adjustment applied — see
   * utils/pricing.ts. Null or absent on everything not discounted, which is
   * most of the catalogue, and the card then draws exactly as it always did.
   */
  wasPrice?: number | null;
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
  id, variantId, listId='catalogue', title, price, wasPrice = null, href, image, secondaryImage, badge, badges,
  reviewCount, averageRating, swatches = [], transition = true, delayMs = 0,
}: ProductCardData) {
  const [swatchImage, setSwatchImage] = useState<string | null>(null);
  const article=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!variantId) return;
    // ViewTransitions handles navigation at document capture and stops
    // propagation. Observe at that same boundary without altering navigation.
    const select=(event:MouseEvent)=>{
      const anchor=event.target instanceof Element ? event.target.closest('a') : null;
      if(anchor && article.current?.contains(anchor)) emitGoogleEvent('select_item',{currency:'GBP',value:price,items:[{item_id:variantId,item_name:title,price,quantity:1}]},{list_id:listId});
    };
    document.addEventListener('click',select,true);
    return ()=>document.removeEventListener('click',select,true);
  },[variantId,title,price,listId]);
  useEffect(()=>{
    if(!article.current || !variantId) return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const observer=new IntersectionObserver(entries=>{
      if(entries[0]?.intersectionRatio>=0.5) {
        if(!timer) timer=setTimeout(()=>{emitGoogleEvent('view_item_list',{currency:'GBP',value:price,items:[{item_id:variantId,item_name:title,price,quantity:1}]},{list_id:listId},`list:${googleNavigationId()}:${listId}:${variantId}`);},1000);
      } else {clearTimeout(timer);timer=undefined;}
    },{threshold:0.5});
    observer.observe(article.current);
    return ()=>{clearTimeout(timer);observer.disconnect();};
  },[variantId,title,price,listId]);

  const shown = swatches.slice(0, MAX_SWATCHES);
  const extra = swatches.length - shown.length;
  const hasReviews = (reviewCount ?? 0) > 0;

  // The percentage is worked out here rather than passed in, so every caller
  // only has to plumb the one extra number through its query — and so a card
  // can never print a different figure from the product page it leads to.
  const cut = wasPrice ? percentOff(price, wasPrice) : 0;
  const onSale = cut >= 1;

  return (
    <article
      ref={article}
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

        {(onSale || badge || badges?.length) && (
          <div className="absolute left-2 top-2 z-raised flex flex-col items-start gap-1">
            {/* First in the stack, and ink with ember letterforms rather than
                either of the two styles below it — the saving has to read as a
                different kind of thing from a category or a size, and the
                top-RIGHT corner is taken on the saved-items grid by the
                remove button. */}
            {onSale && (
              <span className="rounded-sm bg-ink-900 px-2 py-1 font-data text-caption font-extrabold uppercase tracking-wider text-ember-300">
                {cut}% off
              </span>
            )}
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
          {/* Wraps rather than squeezes: two cards fit across a 375px phone,
              and "£899 £1,199" beside a rating is the one combination with no
              room left. The old price drops to its own line there. */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="font-data text-[17px] font-semibold tabular-nums text-ink-900">
              £{Math.round(price).toLocaleString('en-GB')}
            </span>
            {onSale && wasPrice && (
              // <s>, not a line-through class: "no longer accurate" is what is
              // being said, and a strikethrough drawn only in CSS says nothing
              // to a screen reader. The word carries it the rest of the way.
              <s className="font-data text-caption tabular-nums text-ink-500">
                <span className="sr-only">Was </span>
                £{Math.round(wasPrice).toLocaleString('en-GB')}
              </s>
            )}
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
                // The dot stays 16px; the button around it is 44px, pulled in
                // with negative margins so the row looks as it did. A thumb
                // aiming at a 16px target on a card missed it, or hit the card.
                className="group/dot -mx-3 -my-3.5 grid h-11 w-11 place-items-center"
              >
                <span
                  aria-hidden="true"
                  className="block h-4 w-4 rounded-pill border border-ink-900/15 transition-transform duration-swift ease-out-expo group-hover/dot:scale-125"
                  style={{ background: s.hex ?? 'var(--color-calico-300)' }}
                />
              </button>
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
