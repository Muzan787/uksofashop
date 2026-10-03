// src/components/Collection/MainCollectionCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock, Sofa } from 'lucide-react';
import { blurDataURL } from '@/utils/cloudinary';
import { mainCollectionSummaryLine, type MainCollectionSummary } from '@/utils/mainCollections';

/**
 * The top level of /collection.
 *
 * Built on the set card's collage rather than beside it — same 5:4 frame, same
 * three panels split by 2px of the page ground, same ink wash and the same
 * corner button — because a main collection and a set are the same gesture at
 * two scales, and drawing them two different ways would have made /collection
 * and /collection/made-to-order-sofas look like pages from different sites.
 *
 * What differs is the specification line and, for a collection with nothing in
 * it yet, everything behind the glass. See ComingSoonPanels.
 */

function Panel({
  src, className, scale,
}: { src?: string; className: string; scale: string }) {
  return (
    <div className={`relative overflow-hidden bg-calico-200 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt=""
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
 * What a photograph looks like before there is one.
 *
 * Not a grey box and not a placeholder file: three washes of the house palette
 * pushed through a heavy blur, so the panel reads as a picture out of focus
 * rather than as a missing asset. It is drawn in CSS, so it costs no request
 * and cannot 404, and it still scales on hover like a real panel does — which
 * is the whole point, because this card has to feel alive while going nowhere.
 */
function ComingSoonPanels() {
  const washes = [
    'radial-gradient(60% 70% at 30% 30%, var(--color-ember-500) 0%, transparent 70%), radial-gradient(70% 80% at 75% 70%, var(--color-indigo-700) 0%, transparent 72%)',
    'radial-gradient(75% 85% at 65% 35%, var(--color-ember-300) 0%, transparent 70%)',
    'radial-gradient(80% 90% at 35% 70%, var(--color-indigo-300) 0%, transparent 74%)',
  ];

  return (
    <>
      {washes.map((wash, i) => (
        <div
          key={i}
          className={`relative overflow-hidden bg-calico-200 ${
            i === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
          }`}
        >
          {/* Inset by a quarter so the blur has somewhere to bleed to and the
              panel edge stays crisp. */}
          <span
            aria-hidden="true"
            className={`absolute -inset-1/4 opacity-70 blur-[26px] transition-transform duration-settle ease-out-expo ${
              i === 0 ? 'group-hover:scale-110' : 'group-hover:scale-[1.14]'
            } ${i === 2 ? 'delay-[75ms]' : ''}`}
            style={{ backgroundImage: wash }}
          />
          {/* The smudge of a thing that is not there yet. Deliberately a bare
              shape rather than an icon: a blurred sofa behind a card that says
              Wardrobes is a wrong signal, however faint. */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-10 w-16 -translate-x-1/2 -translate-y-1/2 rounded-md bg-calico-50/35 blur-[10px]"
          />
        </div>
      ))}
    </>
  );
}

/** Everything inside the frame, shared by both states. */
function Face({ collection, comingSoon }: { collection: MainCollectionSummary; comingSoon: boolean }) {
  const { name, images, standfirst } = collection;

  return (
    <>
      <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-0.5 bg-calico-50">
        {comingSoon ? (
          <ComingSoonPanels />
        ) : (
          <>
            <Panel src={images[0]} className="col-span-2 row-span-2" scale="group-hover:scale-105" />
            <Panel src={images[1] ?? images[0]} className="col-span-1 row-span-1" scale="group-hover:scale-[1.08]" />
            <Panel
              src={images[2] ?? images[0]}
              className="col-span-1 row-span-1 [&_img]:delay-[75ms]"
              scale="group-hover:scale-[1.08]"
            />
          </>
        )}
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/25 to-transparent"
      />

      {comingSoon && (
        <span className="absolute left-4 top-4 rounded-pill border border-calico-50/25 bg-ink-900/60 px-3 py-1 font-data text-caption font-semibold uppercase tracking-wider text-calico-50 backdrop-blur-sm">
          Coming soon
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-[24px] font-semibold leading-tight text-calico-50">
            {name}
          </h3>
          <p className="m-0 mt-1.5 font-data text-data tabular-nums text-ember-300">
            {mainCollectionSummaryLine(collection)}
          </p>
          {standfirst && !comingSoon && (
            <p className="m-0 mt-1.5 line-clamp-2 max-w-[42ch] text-caption leading-snug text-calico-300">
              {standfirst}
            </p>
          )}
        </div>

        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill border border-calico-50/25 bg-calico-50/10 text-calico-50 transition-[background-color,color,rotate,scale,border-color] duration-base ease-out-expo ${
            comingSoon
              // No rotating arrow on a card that goes nowhere — an arrow is a
              // promise of navigation. The clock answers on hover instead.
              ? 'group-hover:scale-110 group-hover:border-ember-500 group-hover:bg-ember-500 group-hover:text-ink-900'
              : 'group-hover:rotate-45 group-hover:border-ember-500 group-hover:bg-ember-500 group-hover:text-ink-900'
          }`}
        >
          {comingSoon ? (
            <Clock aria-hidden="true" className="h-5 w-5" />
          ) : (
            <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
          )}
        </span>
      </div>
    </>
  );
}

const FRAME = 'group relative block aspect-[5/4] w-full overflow-hidden rounded-md bg-calico-50 no-underline shadow-e1';

export default function MainCollectionCard({ collection }: { collection: MainCollectionSummary }) {
  if (collection.status === 'coming_soon') {
    return (
      /**
       * A plain div, and deliberately not a disabled link.
       *
       * There is no page to send anyone to, and an <a> without an href is not
       * a link to a screen reader either — so rather than fake one and then
       * mark it broken, the card is simply content: a heading and the words
       * "Coming soon", twice, which is what a screen reader reads out and
       * what everyone else sees. No role, no aria-disabled — aria-disabled
       * says "this control is temporarily unavailable" and there is no
       * control here.
       *
       * It keeps every hover the live card has and answers a tap with the same
       * press, because the point is that it reads as part of the same grid
       * rather than as a hole in it. The cursor stays default, which is the one
       * honest signal that nothing will happen.
       */
      <div
        className={`${FRAME} cursor-default select-none transition-transform duration-swift ease-out-expo active:scale-[0.99]`}
      >
        <Face collection={collection} comingSoon />
      </div>
    );
  }

  return (
    <Link href={`/collection/${collection.slug}`} data-cursor="view" className={FRAME}>
      <Face collection={collection} comingSoon={false} />
    </Link>
  );
}
