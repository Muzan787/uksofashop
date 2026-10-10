'use client';
// src/components/Product/Gallery.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from 'lucide-react';
import { productTransitionName } from '@/components/Motion/productTransition';
import { usePointerFine } from '@/components/Motion/usePointerFine';
import { blurDataURL, sized, videoSource } from '@/utils/cloudinary';
import { trackOperationalAction } from '@/utils/tracking';
import type { WhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA';
import VideoPlayer from '@/components/UI/VideoPlayer';
import ColourSwatches from './ColourSwatches';
import WhatsAppIcon from './WhatsAppIcon';
import { useDialog } from '@/components/UI/useDialog';
import type { GalleryImage, Swatch } from './types';
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
  /** "Real photos or a video?" on WhatsApp, carrying this sofa and its price. */
  photoRequest?: WhatsAppCTA;
}

/** More photographs than this and the dots become a "2 / 8" count. */
const MAX_DOTS = 6;

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
 *
 * ── Except the phone carousel, which is 5:4 ──────────────────────────────────
 *
 * A visitor from an ad lands here on a phone, usually inside Facebook's own
 * browser, and the price they were promised has to be on the first screen.
 * With a square frame and the dark band that held the dots under it, the
 * price sat at 745px - behind the floating buttons on a full-height phone and
 * below the fold in the in-app browser. (Oct 2026: 44% of Meta visitors who
 * landed on a product page left from it without touching anything.)
 *
 * 5:4 is the shape that costs the sofa nothing. A square photograph in a
 * frame WIDER than tall is cropped top and bottom, never at the sides, and
 * every photograph in this catalogue has wall above the sofa and floor below
 * it. The arms - the thing the 4:5 frames used to cut off - are untouched.
 * The full square is still one tap away in the lightbox. The desktop stage
 * stays square: there is room for it there.
 */
export default function Gallery({
  productId, title, images, swatches, selectedColor, onSelectColor, material, photoRequest,
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
    (i: number) => {
      // A photograph that names its own colourway (made-to-order frames, where
      // the gallery is every colour we have shot) describes itself; otherwise
      // the whole set is the selected variant.
      const label = images[i]?.label;
      const shown = label
        ? ` in ${label}`
        : `${selectedColor ? ` in ${selectedColor}` : ''}${material ? ` ${material}` : ''}`;
      const what = images[i]?.video ? 'video' : 'photo';
      return `${title}${shown}${count > 1 ? ` — ${what} ${i + 1} of ${count}` : ''}`;
    },
    [title, images, selectedColor, material, count],
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

  // ── Telemetry ────────────────────────────────────────────────────────────
  // Once each per visit to the page: whether they looked past the first
  // photograph, and whether they opened one full size. Enough to tell a
  // product whose photos are doing their job from one where nobody swipes.
  const swiped = useRef(false);
  const zoomed = useRef(false);

  const openLightbox = useCallback(() => {
    setLightbox(true);
    if (zoomed.current) return;
    zoomed.current = true;
    trackOperationalAction('pdp_zoom_opened', { productId, metadata: { value: String(count) } });
  }, [productId, count]);

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(prev => (prev === i ? prev : i));
    if (i > 0 && !swiped.current) {
      swiped.current = true;
      trackOperationalAction('pdp_photo_swiped', { productId, metadata: { value: String(count) } });
    }
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
      openLightbox();
    };
    el.addEventListener('touchstart', onTouch, { passive: false });
    return () => el.removeEventListener('touchstart', onTouch);
  }, [openLightbox]);

  // ── The swipe hint ───────────────────────────────────────────────────────
  //
  // A carousel that shows one photograph per screen, with no next slide
  // peeking in from the edge, gives no sign that there is anything to swipe
  // to - the dots are the only clue, and they are small and below. So once
  // the first photograph has had a moment on screen, the whole strip eases
  // 44px to the left, showing the edge of the second picture, holds, and
  // eases back. Once per visit to the page.
  //
  // A transform on the track rather than a scroll: scroll-snap-mandatory
  // would catch a partial scroll and finish it one way or the other on its
  // own timing, and the point is a nudge, not a slide change.
  //
  // On the motion rule - a sofa is heavy - both legs are the long ease-out
  // curve, no spring, no overshoot. Skipped entirely when there is only one
  // photograph, when the visitor prefers reduced motion, when the phone
  // carousel is not the layout on screen, and if they have already touched
  // or scrolled the strip before it gets going - they have found it.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || count < 2) return;
    if (typeof el.animate !== 'function') return;

    let animation: Animation | null = null;
    const stop = () => { animation?.cancel(); animation = null; };

    const timer = window.setTimeout(() => {
      // Read here rather than from the hook: useReducedMotionSafe starts
      // false on the server and the first client render, and this closure
      // was made on that first render.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (el.clientWidth === 0 || el.scrollLeft > 0) return;
      animation = el.animate(
        [
          { transform: 'translateX(0)', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
          { transform: 'translateX(-44px)', offset: 0.4, easing: 'linear' },
          { transform: 'translateX(-44px)', offset: 0.52, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 1500 },
      );
      animation.onfinish = () => { animation = null; };
    }, 1100);

    el.addEventListener('pointerdown', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('scroll', stop, { passive: true });
    return () => {
      window.clearTimeout(timer);
      stop();
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('scroll', stop);
    };
    // Once per page: `count` is known from the server-rendered props, and a
    // colour change part-way through a visit should not replay the hint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = images[index] ?? images[0];

  // Hovering a swatch dissolves the stage to that fabric. Crossfade is keyed
  // on src, so the preview and the real selection use the same 500ms.
  const previewed = preview ? swatches.find(sw => sw.color === preview) : undefined;
  const stageSrc = previewed?.image || current?.src || '';
  const stageVideo = previewed ? undefined : current?.video;
  const stageAlt = previewed
    ? `${title} in ${previewed.color}${material ? ` ${material}` : ''}`
    : describe(index);

  return (
    <div>
      {/* ═══ Phone ═══════════════════════════════════════════════════════
          Full bleed: the hero grid pads by 16px and this cancels it, so the
          photograph runs edge to edge rather than sitting in a card.

          Nothing below it. This used to stand on a dark plinth that held the
          dots and a "Zoom" label - 58px between the photograph and the name
          and price, on the one screen where the price has to be visible. The
          controls are on the photograph now, over a shade at its foot, and
          the price comes up by that much. See the 5:4 note in the doc above. */}
      <div
        data-ground="dark"
        // -mx-4 AND -mx-6, because the grid around this pads 16px on a phone
        // and 24px from sm. Cancelling only the 16 left the photograph inset by
        // 8px on each side between 640 and 767px — not full bleed, and not a
        // margin either, just a sliver of page ground down both edges.
        className="relative isolate -mx-4 overflow-hidden bg-ink-900 sm:-mx-6 md:hidden"
      >
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          aria-label={`${title} photographs`}
          className="relative flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className="relative aspect-[5/4] w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-ink-900"
              // See the note in the component doc: the desktop stage carries
              // the same name and exactly one of the two is ever rendered.
              style={productTransitionName(productId, i === 0)}
            >
              {img.video ? (
                <VideoPlayer
                  src={img.video}
                  title={describe(i)}
                  aspect="square"
                  sizes={STAGE_SIZES}
                  rounded={false}
                  // Filling the 5:4 slide; a definite height wins over the
                  // player's own square ratio.
                  className="h-full"
                />
              ) : (
                <Crossfade
                  src={img.src}
                  alt={describe(i)}
                  sizes={STAGE_SIZES}
                  priority={i === 0}
                  reduced={reduced}
                />
              )}
              {i === 0 && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 z-raised h-1 bg-[var(--pdp-accent)] transition-colors duration-settle ease-out-expo"
                />
              )}
            </div>
          ))}
        </div>

        {/* The controls, on the photograph.
            A shade at its foot so calico dots and the white button read over
            a pale floor. The row itself lets taps through to the carousel;
            only the controls take them, so a swipe that starts on the shade
            still swipes.

            Left: the photograph button. Most of this catalogue has one
            picture, often a studio render, and "what does it really look
            like?" is the question a careful buyer asks first. It opens
            WhatsApp with that question already written - which is also how
            the shops selling the same frames on Facebook work.

            Right: the dots (or a count, past MAX_DOTS) and the zoom. The zoom
            used to be a labelled button on the plinth; the pinch still works,
            and this is how you find out it does. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-raised h-20 bg-gradient-to-t from-ink-900/60 to-transparent"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-raised flex items-end justify-between gap-2 px-3 pb-2">
          {photoRequest ? (
            <a
              href={photoRequest.href}
              onClick={photoRequest.onClick}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-btn pointer-events-auto mb-0.5 inline-flex min-h-11 items-center gap-2 rounded-pill bg-calico-50/95 px-3.5 text-caption font-semibold text-ink-900 no-underline shadow-e2"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0 text-whatsapp-dark" />
              <span className="whitespace-nowrap">Real photos &amp; video</span>
            </a>
          ) : <span />}

          <div className="pointer-events-auto flex items-center gap-1">
            {/* The first dot is the selected variant, drawn in its own colour. */}
            {count > 1 && count <= MAX_DOTS && images.map((img, i) => {
              const active = i === index;
              const isVariant = i === 0;
              return (
                <button
                  key={`${img.src}-dot-${i}`}
                  type="button"
                  aria-label={
                    isVariant
                      ? `Show photo 1 of ${count}${selectedColor ? `, the ${selectedColor} variant` : ''}`
                      : `Show ${img.video ? 'video' : 'photo'} ${i + 1} of ${count}`
                  }
                  aria-current={active ? 'true' : undefined}
                  onClick={() => goTo(i)}
                  className="flex h-11 items-center px-1"
                >
                  <span
                    className={`block h-2 rounded-pill transition-all duration-base ease-out-expo ${
                      active ? 'w-6' : 'w-2'
                    } ${
                      isVariant
                        ? 'bg-[var(--pdp-accent)] ring-1 ring-inset ring-calico-50/40'
                        : active ? 'bg-calico-50' : 'bg-calico-50/50'
                    }`}
                  />
                </button>
              );
            })}
            {count > MAX_DOTS && (
              <span className="px-2 font-data text-caption tabular-nums text-calico-50" aria-live="polite">
                {index + 1} / {count}
              </span>
            )}
            <button
              type="button"
              onClick={openLightbox}
              aria-label="Open the full-size photograph"
              className="hover-icon hover-icon-dark grid h-11 w-11 place-items-center rounded-pill text-calico-50"
            >
              <ZoomIn aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
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
                    : `Show ${img.video ? 'video' : 'photo'} ${i + 1} of ${count}`
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
                {img.video && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center bg-ink-900/30"
                  >
                    <Play className="h-5 w-5 fill-current text-calico-50" />
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        )}

        {stageVideo ? (
          // The clip takes the stage's slot and its square frame, but not its
          // magnifier or its zoom cursor - there is nothing to magnify, and a
          // click on it should play it. It also does not carry the
          // view-transition name: the card's photograph flies into the FIRST
          // slide, which is always a photograph.
          <div className="min-w-0 flex-1">
            <VideoPlayer
              src={stageVideo}
              title={stageAlt}
              aspect="square"
              sizes={STAGE_SIZES}
            />
          </div>
        ) : (
          <Stage
            productId={productId}
            src={stageSrc}
            alt={stageAlt}
            magnify={fine}
            reduced={reduced}
            onOpen={openLightbox}
          />
        )}
      </div>
      </div>

      {/* The desktop's copy of the photograph button. Under the stage rather
          than on it: the stage is a zoom target from edge to edge. */}
      {photoRequest && (
        <a
          href={photoRequest.href}
          onClick={photoRequest.onClick}
          target="_blank"
          rel="noopener noreferrer"
          className="hover-link mt-3 hidden min-h-11 items-center gap-2 text-body-sm font-semibold text-ink-900 no-underline md:inline-flex"
        >
          <WhatsAppIcon className="h-4 w-4 text-whatsapp-dark" />
          Want real photos or a video of this sofa? Ask on WhatsApp
        </a>
      )}

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
  const video = images[index]?.video;

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
          {video ? (
            <video
              key={video}
              src={videoSource(video)}
              controls
              autoPlay
              playsInline
              aria-label={describe(index)}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : src && (
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
