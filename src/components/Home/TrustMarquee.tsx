// src/components/Home/TrustMarquee.tsx

import { Marquee } from '@/components/Motion';
import { ANNOUNCEMENTS } from '@/constants/promises';

/**
 * The ember band, directly under the hero.
 *
 * It does one structural job before it does anything decorative: the hero is a
 * full-height dark stage and the section under it is a light calico ground, and
 * cutting straight from one to the other is a hard horizontal line across the
 * page. This is the transition — a bright band that belongs to neither, which
 * makes the change of ground read as a deliberate step rather than a seam.
 *
 * It is also the first thing on the page that moves on its own. The hero drifts
 * so slowly you have to look for it; this passes at a readable speed, which is
 * what tells a visitor the page is alive.
 *
 * Everything the ticker gets right is inherited from the Marquee primitive: the
 * moving track is aria-hidden and duplicated for a seamless loop, one plain
 * copy carries the content for assistive technology, it pauses on hover and on
 * keyboard focus, and under reduced motion it stops and becomes a row you can
 * scroll by hand. The marquee this replaces on the old homepage did none of
 * those things and ran at 9px.
 *
 * Ink 900 on the ember gradient, never white. See the colour rule in
 * src/styles/tokens.css — white on ember is 2.9:1 and fails.
 */
export default function TrustMarquee() {
  return (
    <section
      aria-label="What we promise"
      className="grad-ember grain-light relative overflow-hidden bg-ember-500"
    >
      {/* A hairline of deeper ember along the top edge, so the band has a lip
          where it meets the hero rather than simply starting. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-ember-900/25" />

      <Marquee duration={44} gap="2.5rem" className="py-3.5">
        {ANNOUNCEMENTS.map((line) => (
          <span key={line} className="flex shrink-0 items-center gap-10">
            <span className="eyebrow whitespace-nowrap text-ink-900">{line}</span>
            {/* The separator. A diamond rather than a bullet — a bullet at
                this size disappears, and a slash reads as a fraction. */}
            <span aria-hidden="true" className="block h-1.5 w-1.5 rotate-45 bg-ink-900/40" />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
