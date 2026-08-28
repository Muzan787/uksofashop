// src/components/Product/CollectionCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Sofa } from 'lucide-react';
import { blurDataURL } from '@/utils/cloudinary';

interface CollectionCardProps {
  name: string;
  slug: string;
  minPrice: number;
  maxPrice: number;
  images: string[];
  /** Active pieces in the set. */
  pieceCount?: number;
}

const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

/**
 * One panel of the collage.
 *
 * Falls back to a sofa silhouette rather than /placeholder.svg. Pointing an
 * <Image> at a file to say "there is no image" costs a request to render an
 * empty box; drawing it inline costs nothing and reads as deliberate.
 */
function Panel({
  src, alt, className, scale,
}: { src?: string; alt: string; className: string; scale: string }) {
  return (
    <div className={`relative overflow-hidden bg-calico-200 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 90vw, 33vw"
          placeholder="blur"
          blurDataURL={blurDataURL(src)}
          className={`object-cover transition-transform duration-settle ease-out-expo ${scale}`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Sofa aria-hidden="true" className="h-8 w-8 text-calico-300" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

/**
 * The collection collage.
 *
 * The idea was right and the execution was not: a square frame with a 1px gap
 * made three photographs read as one broken image. It is 5:4 now — landscape,
 * like the sofas — and the gap is 2px of the page ground, so the panels read
 * as three separate pictures of a set.
 *
 * The three panels scale at slightly different rates on hover, with the last
 * one lagging 75ms, so the collage moves as a group rather than as one flat
 * plane. This is why the card does not use the shared `.hover-card` treatment.
 */
export default function CollectionCard({
  name, slug, minPrice, maxPrice, images, pieceCount,
}: CollectionCardProps) {
  const priceDisplay = minPrice === maxPrice
    ? money(minPrice)
    : `${money(minPrice)} – ${money(maxPrice)}`;

  return (
    <Link
      href={`/collection/${slug}`}
      data-cursor="view"
      className="group relative block aspect-[5/4] w-full overflow-hidden rounded-md bg-calico-50 no-underline shadow-e1"
    >
      {/* 2/3 + 1/3, split by 2px of the page ground. */}
      <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-0.5 bg-calico-50">
        <Panel
          src={images[0]}
          alt=""
          className="col-span-2 row-span-2"
          scale="group-hover:scale-105"
        />
        <Panel
          src={images[1] ?? images[0]}
          alt=""
          className="col-span-1 row-span-1"
          scale="group-hover:scale-[1.08]"
        />
        <Panel
          src={images[2] ?? images[0]}
          alt=""
          className="col-span-1 row-span-1 [&_img]:delay-[75ms]"
          scale="group-hover:scale-[1.08]"
        />
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/25 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-[24px] font-semibold leading-tight text-calico-50">
            {name}
          </h3>
          <p className="m-0 mt-1.5 font-data text-data tabular-nums text-ember-300">
            {priceDisplay}
          </p>
          {typeof pieceCount === 'number' && pieceCount > 0 && (
            <p className="m-0 mt-0.5 font-data text-caption tabular-nums text-calico-300">
              {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'} in the set
            </p>
          )}
        </div>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill border border-calico-50/25 bg-calico-50/10 text-calico-50 transition-[background-color,color,rotate,border-color] duration-base ease-out-expo group-hover:rotate-45 group-hover:border-ember-500 group-hover:bg-ember-500 group-hover:text-ink-900">
          <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}
