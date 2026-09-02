'use client';
// src/components/Product/Gallery.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { productTransitionName } from '@/components/Motion/productTransition';
import { usePointerFine } from '@/components/Motion/usePointerFine';
import { blurDataURL, sized } from '@/utils/cloudinary';
import ColourSwatches from './ColourSwatches';
import FabricChoice from './FabricChoice';
import { useDialog } from '@/components/UI/useDialog';
import type { Fabric, FabricCollection, GalleryImage, Swatch } from './types';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';


interface Props {
  productId: string;
  title: string;
  images: GalleryImage[];
  swatches: Swatch[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  /** Appears in the alt text so each photo describes what it actually shows. */
  material: string;
  /** Made-to-order products only. Empty elsewhere, and the block is not drawn. */
  fabrics?: FabricCollection[];
  selectedFabric?: Fabric | null;
  onSelectFabric?: (fabric: Fabric | null) => void;
  fabricDialogOpen?: boolean;
  onFabricDialogChange?: (open: boolean) => void;
}

/**
 * Half a second, and the one duration on this page that is not a system token.
 *
 * The five steps in tokens.css bracket it — 380ms cuts, 640ms drags — and a
 * fabric change is the one moment on the site where the customer is comparing
 * two states rather than watching one arrive, so the crossfade is specified
 * rather than picked off the ramp. It lives here, not in tokens.css, because
 * nothing else on the site should reach for it.
 */
const CROSSFADE = 0.5;

/** Easing, as a literal, because framer wants numbers where CSS wants a var. */
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** How far the magnifier zooms in on the desktop stage. */
const MAGNIFY = 2;

/**
 * One sizes string for BOTH layouts.
 *
 * The phone carousel and the desktop stage are both in the DOM, and a browser
 * still fetches images inside a display:none subtree. Giving them different
 * sizes attributes made them resolve to different srcset candidates, so the
 * lead photograph was downloaded twice on desktop. Same string, one file.
 */
const STAGE_SIZES = '(max-width: 768px) 100vw, 560px';

/** What the magnifier asks Cloudinary for. Roughly the stage at 2x. */
const MAGNIFY_WIDTH = 1120;

/**
 * The photographs.
 *
 * Two layouts, both always in the DOM and chosen by CSS rather than by
 * JavaScript, so neither is ever the thing a visitor is waiting on:
 *
 *   phone    a full-bleed square carousel, one photograph per screen, snapped.
 *            No half-visible next slide nudging in from the edge — that peek
 *            made the first photograph read as mis-cropped. Dots below, and
 *            the first dot is drawn in the variant's own colour because the
 *            first photograph IS the selected variant. Two fingers on the
 *            carousel opens the lightbox.
 *
 *   desktop  a vertical thumbnail rail and a large stage. The stage takes the
 *            zoom cursor, magnifies 2× under the pointer, and opens a real
 *            dialog on click.
 *
 * `view-transition-name` is set on the phone's first slide and on the desktop
 * stage. Only one of the two is ever rendered — the other is display:none, and
 * an unrendered element is not captured — so the name stays unique and the
 * card image from the listing still flies into whichever one is on screen.
 *
 * ── Why the frames are square ────────────────────────────────────────────────
 *
 * Because the photographs are. Every image in this catalogue is 1:1 — the
 * product shots at 2048x2048, the older ranges at 1024x1024 — and every frame
 * that displayed them asked for 4:5.
 *
 * object-fit: cover resolves that by scaling to fill the height and cropping
 * the width, so a square photograph in a 4:5 box loses 12.5% off EACH SIDE. On a
 * sofa, which is the widest thing in its own frame, that is the arms. The
 * gallery, the thumbnail rail, the desktop stage and every product card were
 * all trimming the ends off the product.
 *
 * Matching the frame to the source fixes the crop and, on a phone, takes 94px
 * off the height of the first screen as a side effect — which is what made it
 * look oversized. It was not too big. It was the wrong shape, and being the
 * wrong shape made it taller than it had any reason to be.
 */
export default function Gallery({
  productId, title, images, swatches, selectedColor, onSelectColor, material,
  fabrics = [], selectedFabric = null, onSelectFabric,
  fabricDialogOpen = false, onFabricDialogChange,
}: Props) {
  const fine = usePointerFine();
  const reduced = Boolean(useReducedMotionSafe());

  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  // A colour being hovered but not chosen. The stage shows it; nothing else
  // on the page moves, so leaving the swatch puts everything back.
  const [preview, setPreview] = useState<string | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  const describe = useCallback(
    (i: number) =>
      `${title}${selectedColor ? ` in ${selectedColor}` : ''}${material ? ` ${material}` : ''}` +
      (count > 1 ? ` — photo ${i + 1} of ${count}` : ''),
    [title, selectedColor, material, count],
  );

  // A colour change rewrites the list with the new variant's photograph at the
  // top, so the view goes back to it. Adjusted during render rather than in an
  // effect, which would paint the old index first.
  const leadSrc = images[0]?.src ?? '';
  const [lastLead, setLastLead] = useState(leadSrc);
  if (leadSrc !== lastLead) {
    setLastLead(leadSrc);
    setIndex(0);
  }

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [leadSrc]);

  const goTo = useCallback((i: number) => {
    const next = Math.max(0, Math.min(i, count - 1));
    setIndex(next);
    const el = trackRef.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }, [count]);

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(prev => (prev === i ? prev : i));
  };

  // ── Pinch opens the lightbox ─────────────────────────────────────────────
  // Attached by hand rather than through onTouchStart, because the default has
  // to be preventable and React's synthetic touch listeners are passive. The
  // page's own pinch-to-zoom is untouched everywhere else.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      setLightbox(true);
    };
    el.addEventListener('touchstart', onTouch, { passive: false });
    return () => el.removeEventListener('touchstart', onTouch);
  }, []);

  const current = images[index] ?? images[0];

  // Hovering a swatch dissolves the stage to that fabric. Crossfade is keyed
  // on src, so the preview and the real selection use the same 500ms.
  const previewed = preview ? swatches.find(sw => sw.color === preview) : undefined;
  const stageSrc = previewed?.image || current?.src || '';
  const stageAlt = previewed
    ? `${title} in ${previewed.color}${material ? ` ${material}` : ''}`
    : describe(index);

  return (
    <div>
      {/* ═══ Phone ═══════════════════════════════════════════════════════
          Full bleed: the hero grid pads by 16px and this cancels it, so the
          photograph runs edge to edge rather than sitting in a card.

          The photograph sits on a lit stage rather than on the page ground —
          the same ink gradient, drifting aurora and grain as the homepage
          hero. The band carries no padding at the TOP, so the picture keeps
          every pixel of its width and the dark ground appears only beneath it,
          as a plinth holding the dots. A stage that inset the photograph would
          have looked more like the hero and shown less of the sofa, which on a
          product page is the wrong trade.

          The glow under the bottom edge is what stops it reading as two
          stacked rectangles: the light appears to come from behind the
          photograph rather than the panel being a separate strip below it. */}
      <div
        data-ground="dark"
        // -mx-4 AND -mx-6, because the grid around this pads 16px on a phone
        // and 24px from sm. Cancelling only the 16 left the photograph inset by
        // 8px on each side between 640 and 767px — not full bleed, and not a
        // margin either, just a sliver of page ground down both edges.
        className="grad-ink grain relative isolate -mx-4 overflow-hidden bg-ink-900 sm:-mx-6 md:hidden"
      >
        <div aria-hidden="true" className="aurora">
          <span className="aurora__warm" />
          <span className="aurora__deep" />
        </div>

        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          aria-label={`${title} photographs`}
          className="relative flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className="relative aspect-square w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-ink-900"
              // See the note in the component doc: the desktop stage carries
              // the same name and exactly one of the two is ever rendered.
              style={productTransitionName(productId, i === 0)}
            >
              <Crossfade
                src={img.src}
                alt={describe(i)}
                sizes={STAGE_SIZES}
                priority={i === 0}
                reduced={reduced}
              />
              {i === 0 && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 z-raised h-1 bg-[var(--pdp-accent)] transition-colors duration-settle ease-out-expo"
                />
              )}
            </div>
          ))}
        </div>

        {/* The light spilling from behind the photograph's bottom edge, over
            the plinth the dots sit on. */}
        <span
          aria-hidden="true"
          className="spotlight left-1/2 top-full h-16 w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-70"
        />

        {/* The plinth.
            It is always here, even for a product with one photograph and one
            fabric — which is most of this catalogue. A band that only appeared
            when there were dots to hold would have been invisible on the
            majority of product pages, and the stage behind the picture would
            have been decoration nobody ever saw.

            Giving it the zoom control is what earns it the space. Opening the
            full-size photograph on a phone was a two-finger pinch on the
            carousel and nothing else — no button, no label, no hint. A gesture
            with no affordance is a feature only the person who built it knows
            about. The pinch still works; this is how you find out it does. */}
        <div className="relative flex items-center justify-between gap-3 px-4 pb-3 pt-2.5">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="hover-link flex min-h-9 items-center gap-2 font-data text-caption uppercase tracking-widest text-calico-300"
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4 text-ember-300" />
            Zoom
          </button>

          {/* Dots. The first is the selected variant, drawn in its own colour.
              The rest are calico rather than ink now — they live on the dark
              plinth, and ink on ink is not a dot, it is a hole. */}
          {count > 1 && (
            <div className="flex items-center gap-1">
            {images.map((img, i) => {
              const active = i === index;
              const isVariant = i === 0;
              return (
                <button
                  key={`${img.src}-dot-${i}`}
                  type="button"
                  aria-label={
                    isVariant
                      ? `Show photo 1 of ${count}${selectedColor ? `, the ${selectedColor} variant` : ''}`
                      : `Show photo ${i + 1} of ${count}`
                  }
                  aria-current={active ? 'true' : undefined}
                  onClick={() => goTo(i)}
                  className="flex h-9 items-center px-1"
                >
                  <span
                    className={`block h-2 rounded-pill transition-all duration-base ease-out-expo ${
                      active ? 'w-6' : 'w-2'
                    } ${
                      isVariant
                        ? 'bg-[var(--pdp-accent)] ring-1 ring-inset ring-calico-50/30'
                        : active ? 'bg-calico-50' : 'bg-calico-50/35'
                    }`}
                  />
                </button>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Desktop ═════════════════════════════════════════════════════
          The same stage, as a panel rather than a band. The rail and the
          magnifier sit on it, so the photograph is lit at both widths and the
          page does not change character when it gets wider. */}
      <div
        data-ground="dark"
        className="grad-ink grain relative isolate hidden overflow-hidden rounded-lg bg-ink-900 p-4 md:block"
      >
        <div aria-hidden="true" className="aurora">
          <span className="aurora__warm" />
          <span className="aurora__deep" />
        </div>

      <div className="relative hidden gap-3 md:flex">
        {count > 1 && (
          <div
            role="group"
            aria-label={`${title} photographs`}
            className="flex w-[76px] shrink-0 flex-col gap-2 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img, i) => (
              // `layout` is what makes the rail SLIDE when a colour changes:
              // the incoming variant is a new key at the top and every shared
              // photograph below it animates down a slot rather than jumping.
              <motion.button
                key={img.src}
                layout={!reduced}
                transition={{ duration: CROSSFADE, ease: EASE_OUT_EXPO }}
                type="button"
                aria-current={i === index ? 'true' : undefined}
                aria-label={
                  i === 0
                    ? `Show photo 1 of ${count}${selectedColor ? `, the ${selectedColor} variant` : ''}`
                    : `Show photo ${i + 1} of ${count}`
                }
                onClick={() => setIndex(i)}
                className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-sm border-2 bg-ink-900 transition-colors duration-swift ease-out-expo ${
                  i === index ? 'border-[var(--pdp-accent)]' : 'border-transparent hover:border-calico-50/35'
                }`}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  sizes="76px"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={blurDataURL(img.src)}
                  className="object-cover"
                />
              </motion.button>
            ))}
          </div>
        )}

        <Stage
          productId={productId}
          src={stageSrc}
          alt={stageAlt}
          magnify={fine}
          reduced={reduced}
          onOpen={() => setLightbox(true)}
        />
      </div>
      </div>

      {/* ═══ Swatches ════════════════════════════════════════════════════
          Outside the stage, on the page ground. The swatch ring and the
          "Colour — X" line are drawn in ink, and moving them onto the dark
          panel would have meant a second tone for every one of them. */}
      <ColourSwatches
        swatches={swatches}
        selected={selectedColor}
        onSelect={onSelectColor}
        onPreview={setPreview}
      />

      {/* The fabric the sofa gets BUILT in, which on a made-to-order frame is a
          different question from which colourway we happen to have photographed
          - see the note in FabricChoice. */}
      {onSelectFabric && onFabricDialogChange && (
        <FabricChoice
          collections={fabrics}
          selected={selectedFabric}
          onSelect={onSelectFabric}
          open={fabricDialogOpen}
          onOpenChange={onFabricDialogChange}
        />
      )}

      {lightbox && (
        <Lightbox
          images={images}
          index={index}
          describe={describe}
          onIndex={setIndex}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}

// ─── The stage ───────────────────────────────────────────────────────────────
function Stage({ productId, src, alt, magnify, reduced, onOpen }: {
  productId: string;
  src: string;
  alt: string;
  magnify: boolean;
  reduced: boolean;
  onOpen: () => void;
}) {
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!magnify) return;
    const r = e.currentTarget.getBoundingClientRect();
    setLens({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <button
      type="button"
      data-cursor="zoom"
      aria-label="Open the full-size photograph"
      onClick={onOpen}
      onMouseMove={onMove}
      onMouseLeave={() => setLens(null)}
      className="relative aspect-square min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-md bg-ink-900"
      style={productTransitionName(productId, true)}
    >
      <Crossfade src={src} alt={alt} sizes={STAGE_SIZES} priority reduced={reduced} />

      {/* The magnifier: a 2× background pinned to the pointer. It is a CSS
          background, so next/image's loader never sees it — hence sized(),
          which asks Cloudinary for a stage-sized derivative rather than the
          multi-megabyte master the raw URL would return. */}
      {lens && src && (
        <span
          aria-hidden="true"
          className="absolute inset-0 z-raised bg-calico-200 bg-no-repeat"
          style={{
            backgroundImage: `url("${sized(src, MAGNIFY_WIDTH)}")`,
            backgroundSize: `${MAGNIFY * 100}%`,
            backgroundPosition: `${lens.x}% ${lens.y}%`,
          }}
        />
      )}

      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-raised h-1 bg-[var(--pdp-accent)] transition-colors duration-settle ease-out-expo"
      />

      <span
        aria-hidden="true"
        className="absolute bottom-3 right-3 z-raised flex items-center gap-1 rounded-sm bg-ink-900/50 px-2 py-1 text-caption text-calico-50 backdrop-blur"
      >
        <ZoomIn className="h-3 w-3" /> Zoom
      </span>
    </button>
  );
}

// ─── Crossfade ───────────────────────────────────────────────────────────────
/**
 * One image well where a change of `src` dissolves rather than cuts.
 *
 * Both frames stay mounted for the length of the fade, so the outgoing fabric
 * is still on screen while the incoming one arrives — which is the point: a
 * customer comparing two colours sees them meet instead of seeing a gap.
 */
function Crossfade({ src, alt, sizes, priority, reduced }: {
  src: string; alt: string; sizes: string; priority?: boolean; reduced: boolean;
}) {
  if (!src) return null;

  if (reduced) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        blurDataURL={blurDataURL(src)}
        className="object-cover"
      />
    );
  }

  return (
    <AnimatePresence initial={false}>
      <motion.span
        key={src}
        className="absolute inset-0 block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: CROSSFADE, ease: EASE_OUT_EXPO }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          placeholder="blur"
          blurDataURL={blurDataURL(src)}
          className="object-cover"
        />
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
/**
 * A real dialog, which is what this was missing.
 *
 * The old lightbox was a click-anywhere div: no role, no aria-modal, no focus
 * management and nothing behind the arrow keys. The lock, the trap, Escape and
 * the focus handover all live in useDialog now, shared with the dimensions and
 * custom-size panels; what is left here is the part that is actually about
 * photographs, which is the arrow keys.
 */
function Lightbox({ images, index, describe, onIndex, onClose }: {
  images: GalleryImage[];
  index: number;
  describe: (i: number) => string;
  onIndex: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}) {
  const count = images.length;
  const panel = useDialog<HTMLDivElement>(onClose);

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      // Functional, so two presses inside one frame advance twice rather than
      // both resolving against the index this listener closed over.
      if (e.key === 'ArrowRight') onIndex(i => (i + 1) % count);
      else if (e.key === 'ArrowLeft') onIndex(i => (i - 1 + count) % count);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [count, onIndex]);

  const src = images[index]?.src;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={describe(index)}
      onClick={onClose}
      className="fixed inset-0 z-modal flex animate-[fadeIn_var(--dur-swift)_var(--ease-out-expo)] items-center justify-center bg-ink-900/95"
    >
      <div
        ref={panel}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[1100px] flex-col items-center justify-center outline-none"
      >
        <button
          type="button"
          aria-label="Close the photograph"
          onClick={onClose}
          className="hover-icon hover-icon-dark absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-pill border border-calico-50/15 bg-calico-50/10 text-calico-50"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="relative h-[80vh] w-[92vw] max-w-[1000px]">
          {src && (
            <Image
              src={src}
              alt={describe(index)}
              fill
              sizes="92vw"
              priority
              placeholder="blur"
              blurDataURL={blurDataURL(src)}
              className="object-contain"
            />
          )}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photograph"
              onClick={() => onIndex(i => (i - 1 + count) % count)}
              className="hover-icon hover-icon-dark absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-pill border border-calico-50/15 bg-calico-50/10 text-calico-50"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photograph"
              onClick={() => onIndex(i => (i + 1) % count)}
              className="hover-icon hover-icon-dark absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-pill border border-calico-50/15 bg-calico-50/10 text-calico-50"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>

            <p aria-live="polite" className="m-0 mt-4 font-data text-caption tabular-nums text-calico-300">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
