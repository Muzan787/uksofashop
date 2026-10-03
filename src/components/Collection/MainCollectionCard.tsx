// src/components/Collection/MainCollectionCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock, Sofa } from 'lucide-react';
import { blurDataURL } from '@/utils/cloudinary';
import {
  MOSAIC_IMAGES,
  mainCollectionSummaryLine,
  type MainCollectionSummary,
} from '@/utils/mainCollections';

/**
 * The top level of /collection.
 *
 * It began as the set card's three-panel collage, and three is the wrong
 * number here. A set card shows three because a set IS three or four sizes of
 * one sofa; a main collection is thirteen recliners or fifty-one made-to-order
 * frames, and the single thing its card has to carry is how much is behind it.
 * So it is a contact sheet — one lead photograph and eight more, each from a
 * different design.
 *
 * WHICH IS WHY THE TYPE IS NOT OVER THE PICTURES. The set card puts its name
 * and price in an ink wash across the bottom of the collage, and that costs it
 * nothing when there are three panels and the bottom one is mostly background.
 * Across a nine-panel mosaic the same wash buries the whole bottom row —
 * four photographs rendered, downloaded and then covered up. The band under
 * the mosaic is the same ink and the same type; it just stops taking a third
 * of the sheet with it. The set card keeps its overlay, because for three
 * panels the overlay is still right.
 */

interface PanelProps {
  src?: string;
  className: string;
  /** Hero and thumbnail are lit differently and asked for at different widths. */
  hero?: boolean;
  /** Staggered so the sheet moves as a group rather than as one flat plane. */
  delayMs?: number;
}

function Panel({ src, className, hero = false, delayMs = 0 }: PanelProps) {
  return (
    <div className={`relative overflow-hidden bg-calico-200 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={hero ? '(max-width: 640px) 50vw, 20vw' : '(max-width: 640px) 25vw, 10vw'}
          placeholder="blur"
          blurDataURL={blurDataURL(src)}
          className={`object-cover transition-transform duration-settle ease-out-expo ${
            hero ? 'group-hover:scale-105' : 'group-hover:scale-110'
          }`}
          style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Sofa aria-hidden="true" className="h-6 w-6 text-calico-300" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

/**
 * What a photograph looks like before there is one.
 *
 * Not a grey box and not a placeholder file: washes of the house palette
 * pushed through a heavy blur, so each cell reads as a picture out of focus
 * rather than as a missing asset. Drawn in CSS, so it costs no request and
 * cannot 404, and it still scales on hover the way a real panel does — which
 * is the point, because this card has to feel alive while going nowhere.
 */
/**
 * One palette per collection, not one shared by all three.
 *
 * Three cards running the same three gradients in the same order came out
 * identical, which made the bottom row read as one thing repeated rather than
 * as three rooms we have not opened yet. Each palette is a different corner of
 * the ramp — amber, indigo, sage — so the cards are visibly distinct at a
 * glance while all three are plainly the same treatment.
 *
 * Three palettes for three coming-soon collections; a fourth would cycle, and
 * at that point it wants a fourth palette rather than a repeat.
 */
/**
 * Each palette leads with its LIGHT tone.
 *
 * Built first from the -700s, and under a 22px blur at 70% over calico they
 * all collapsed towards the same grey: indigo-700 and sage-700 are both dark
 * and desaturated, so two of the three cards still read as the same card. The
 * -300s are the ramp's "text on dark grounds" tones — light and saturated
 * enough to survive the blur — so each palette leads with one and keeps its
 * deep tone as the accent underneath.
 */
const PALETTES: string[][] = [
  // Amber — warm, the brand's own.
  [
    'radial-gradient(66% 76% at 32% 30%, var(--color-ember-300) 0%, transparent 72%), radial-gradient(70% 80% at 78% 72%, var(--color-ember-500) 0%, transparent 72%)',
    'radial-gradient(80% 88% at 64% 34%, var(--color-ember-300) 0%, transparent 72%)',
    'radial-gradient(84% 92% at 36% 72%, var(--color-ember-500) 0%, transparent 74%)',
  ],
  // Indigo — cool, the panel tint.
  [
    'radial-gradient(66% 76% at 28% 34%, var(--color-indigo-300) 0%, transparent 72%), radial-gradient(72% 82% at 74% 68%, var(--color-indigo-700) 0%, transparent 74%)',
    'radial-gradient(80% 88% at 68% 30%, var(--color-indigo-300) 0%, transparent 72%)',
    'radial-gradient(84% 92% at 32% 74%, var(--color-indigo-700) 0%, transparent 74%)',
  ],
  // Sage — green, the positive tone.
  [
    'radial-gradient(66% 76% at 34% 28%, var(--color-sage-300) 0%, transparent 72%), radial-gradient(74% 84% at 72% 74%, var(--color-sage-700) 0%, transparent 74%)',
    'radial-gradient(80% 88% at 62% 36%, var(--color-sage-300) 0%, transparent 72%)',
    'radial-gradient(84% 92% at 38% 70%, var(--color-sage-700) 0%, transparent 74%)',
  ],
];

/**
 * Keyed on the collection's position, not on a hash of its slug.
 *
 * A hash was the first attempt and it does not do the one thing being asked
 * for: "dining-sets" and "wardrobes" both landed on the indigo palette, so two
 * of the three cards came out identical again. Position is the shop's own
 * ordering, it is stable across renders and deploys, and consecutive rows get
 * consecutive palettes by construction — which is exactly the guarantee a hash
 * cannot give.
 */
function paletteFor(position: number): string[] {
  const i = ((position % PALETTES.length) + PALETTES.length) % PALETTES.length;
  return PALETTES[i];
}

function WashPanel({ className, index, palette }: { className: string; index: number; palette: string[] }) {
  return (
    <div className={`relative overflow-hidden bg-calico-200 ${className}`}>
      {/* Inset by a quarter so the blur has somewhere to bleed to and the cell
          edge stays crisp. */}
      <span
        aria-hidden="true"
        className="absolute -inset-1/4 opacity-85 blur-[22px] transition-transform duration-settle ease-out-expo group-hover:scale-110"
        style={{ backgroundImage: palette[index % palette.length], transitionDelay: `${(index % 5) * 25}ms` }}
      />
      {/* The smudge of a thing that is not there yet. Deliberately a bare
          shape rather than an icon: a blurred sofa behind a card that says
          Wardrobes is a wrong signal, however faint. */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-1/3 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-calico-50/35 blur-[8px]"
      />
    </div>
  );
}

/**
 * Four across, three down, with the lead photograph taking the top-left two by
 * two. Nine pictures, twelve cells, no holes — see MOSAIC_IMAGES.
 *
 * A collection with fewer than nine photographs to its name falls back to the
 * original three-panel collage rather than leaving gaps or repeating a sofa to
 * fill them. Neither of the two live collections goes near that, but a sixth
 * one on its first day will.
 */
function Mosaic({ images, comingSoon, position }: { images: string[]; comingSoon: boolean; position: number }) {
  if (comingSoon) {
    const palette = paletteFor(position);
    return (
      <div className="grid aspect-[4/3] w-full grid-cols-4 grid-rows-3 gap-0.5 bg-calico-50">
        <WashPanel className="col-span-2 row-span-2" index={0} palette={palette} />
        {Array.from({ length: MOSAIC_IMAGES - 1 }, (_, i) => (
          <WashPanel key={i} className="col-span-1 row-span-1" index={i + 1} palette={palette} />
        ))}
      </div>
    );
  }

  if (images.length < MOSAIC_IMAGES) {
    return (
      <div className="grid aspect-[4/3] w-full grid-cols-3 grid-rows-2 gap-0.5 bg-calico-50">
        <Panel src={images[0]} className="col-span-2 row-span-2" hero />
        <Panel src={images[1] ?? images[0]} className="col-span-1 row-span-1" />
        <Panel src={images[2] ?? images[0]} className="col-span-1 row-span-1" delayMs={75} />
      </div>
    );
  }

  return (
    <div className="grid aspect-[4/3] w-full grid-cols-4 grid-rows-3 gap-0.5 bg-calico-50">
      <Panel src={images[0]} className="col-span-2 row-span-2" hero />
      {images.slice(1, MOSAIC_IMAGES).map((src, i) => (
        <Panel key={`${src}-${i}`} src={src} className="col-span-1 row-span-1" delayMs={(i % 5) * 25} />
      ))}
    </div>
  );
}

/** The ink band under the sheet. Same type the overlay carried, nothing on top. */
function Caption({ collection, comingSoon }: { collection: MainCollectionSummary; comingSoon: boolean }) {
  /**
   * Always a line, and always two lines of room for it.
   *
   * Without this the cards came out at two different heights — a live card
   * carries a standfirst and a coming-soon one has none — so the grid row set
   * itself by the tallest and the short cards sat in it with a gap under them.
   * min-h with line-clamp-2 reserves exactly two lines whatever the sentence
   * is, so five cards are five identical shapes.
   */
  const blurb = comingSoon
    ? 'Not in the shop yet. It opens here when it is.'
    : collection.standfirst ?? 'Every range and design inside.';

  return (
    <div className="flex flex-1 items-start justify-between gap-4 bg-ink-900 px-5 py-4">
      <div className="min-w-0">
        <h3 className="m-0 font-display text-[22px] font-semibold leading-tight text-calico-50">
          {collection.name}
        </h3>
        <p className="m-0 mt-1 font-data text-data tabular-nums text-ember-300">
          {mainCollectionSummaryLine(collection)}
        </p>
        <p className="m-0 mt-1.5 line-clamp-2 min-h-[2.25rem] text-caption leading-snug text-calico-300">
          {blurb}
        </p>
      </div>

      <span
        className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-pill border border-calico-50/25 bg-calico-50/10 text-calico-50 transition-[background-color,color,rotate,scale,border-color] duration-base ease-out-expo ${
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
  );
}

function Face({ collection, comingSoon }: { collection: MainCollectionSummary; comingSoon: boolean }) {
  return (
    <>
      <div className="relative">
        <Mosaic images={collection.images} comingSoon={comingSoon} position={collection.position} />
        {comingSoon && (
          <span className="absolute left-3 top-3 rounded-pill border border-calico-50/25 bg-ink-900/70 px-3 py-1 font-data text-caption font-semibold uppercase tracking-wider text-calico-50 backdrop-blur-sm">
            Coming soon
          </span>
        )}
      </div>
      <Caption collection={collection} comingSoon={comingSoon} />
    </>
  );
}

/**
 * h-full and a column, so three cards sharing a desktop row come out the same
 * height whatever their caption says — the ink band absorbs the difference
 * rather than leaving a card floating with a gap beneath it. The grid item
 * (the Reveal wrapper) carries h-full too; see the collections page.
 */
const FRAME = 'group relative flex h-full w-full flex-col overflow-hidden rounded-md bg-ink-900 no-underline shadow-e1';

export default function MainCollectionCard({ collection }: { collection: MainCollectionSummary }) {
  if (collection.status === 'coming_soon') {
    return (
      /**
       * A plain div, and deliberately not a disabled link.
       *
       * There is no page to send anyone to, and an <a> without an href is not
       * a link to a screen reader either — so rather than fake one and then
       * mark it broken, the card is simply content: a heading and the words
       * "Coming soon", twice, which is what a screen reader reads out and what
       * everyone else sees. No role, no aria-disabled — aria-disabled says
       * "this control is temporarily unavailable" and there is no control.
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
