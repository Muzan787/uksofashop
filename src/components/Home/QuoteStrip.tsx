'use client';
// src/components/Home/QuoteStrip.tsx

import Image from 'next/image';
import { Parallax, SplitText } from '@/components/Motion';
import { blurDataURL, darkened } from '@/utils/cloudinary';

/**
 * The breath between the shop and the story.
 *
 * Structurally this is a spacer — the page needs somewhere to stop between the
 * collections and the three-panel explanation of how buying here works, and a
 * gap of empty ground would just read as a missing section.
 *
 * The photograph drifts against the scroll. The frame is oversized 30% and
 * inset, because a parallax that moves an image inside its own bounding box
 * exposes the top and bottom edges at either end of the range — the single most
 * common way this effect goes wrong.
 *
 * Type is set in Fraunces italic, which is the one place on the homepage where
 * the display face is allowed to be purely decorative. It is a sentence about
 * how a room feels, not a claim about the product, and it is set as one.
 */
export default function QuoteStrip({ image }: { image: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-900" data-ground="dark">
      <Parallax speed={0.18} className="absolute inset-0">
        <div className="absolute -inset-y-[15%] inset-x-0">
          <Image
            src={darkened(image, -20, 8)}
            alt=""
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={blurDataURL(image)}
            className="object-cover"
            style={{ objectPosition: 'center 42%' }}
          />
        </div>
      </Parallax>

      {/* Ink from both edges toward a lighter middle, so the photograph is
          brightest exactly where the type is not. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-ink-900/85 via-ink-900/45 to-ink-900/90"
      />

      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
      </div>

      <div className="grain relative mx-auto flex max-w-read flex-col items-center justify-center px-4 py-14 text-center sm:px-6 lg:py-28">
        <SplitText
          as="p"
          by="line"
          text={'A home is defined by the spaces\nthat make you feel most yourself.'}
          amount={0.4}
          className="m-0 font-display text-h2 font-light italic leading-snug text-calico-50"
        />

        <span className="mt-6 flex items-center gap-3">
          <span aria-hidden="true" className="block h-px w-10 bg-ember-500" />
          <span className="eyebrow text-ember-300">UK Sofa Shop</span>
          <span aria-hidden="true" className="block h-px w-10 bg-ember-500" />
        </span>
      </div>
    </section>
  );
}
