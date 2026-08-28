// src/components/UI/SectionHeading.tsx

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal, SplitText } from '@/components/Motion';

interface Props {
  /** The small mono label above the heading. */
  eyebrow: string;
  /** The heading itself. Split by word and wiped up from behind a mask. */
  heading: string;
  /**
   * One word inside the heading that carries the panned ember gradient.
   * Matched case-insensitively with punctuation ignored, so "sofas." matches
   * "sofas". Leave it out and the whole heading is plain.
   */
  emphasise?: string;
  /** A sentence under the heading, where the section needs one. */
  standfirst?: string;
  /** The "see everything" link on the right. */
  href?: string;
  linkLabel?: string;
  /** Set on dark sections so the type and the rule flip. */
  dark?: boolean;
  /**
   * How loud the heading is.
   *
   * 'page' is the homepage size — these headings ARE the page, and there is no
   * h1 competing with them below the hero. 'section' is a step down, for a
   * heading that sits under a real h1 on the same screen: the product page's
   * "Similar sofas" and "What customers say" were rendering at text-h1 while
   * the product's own title was at text-h2, which puts a secondary row above
   * the thing the page is about.
   */
  level?: 'page' | 'section';
  className?: string;
}

/**
 * The one section heading.
 *
 * Five sections on the old homepage each drew their own: two used an h2 with a
 * hairline running to the edge, one used a centred block, one had the link on
 * the left and one had no eyebrow at all. They were the same idea rendered four
 * ways, which is what makes a page read as assembled rather than designed.
 *
 * The parts, in order:
 *
 *   · an ember rule and a mono eyebrow, so the eye has somewhere to land before
 *     it reaches the heading;
 *   · the heading, wiped up word by word from behind a mask as it arrives, with
 *     one optional word carrying the gradient;
 *   · a hairline that fades out as it runs toward the right margin, rather than
 *     stopping dead at the container edge;
 *   · the link, which drops below the heading on a phone instead of squeezing
 *     the heading into half the width.
 */
export default function SectionHeading({
  eyebrow,
  heading,
  emphasise,
  standfirst,
  href,
  linkLabel = 'View all',
  dark = false,
  level = 'page',
  className = '',
}: Props) {
  const headingTone = dark ? 'text-calico-50' : 'text-ink-900';
  const eyebrowTone = dark ? 'text-ember-300' : 'text-ember-700';
  const standfirstTone = dark ? 'text-calico-300' : 'text-ink-500';
  const linkTone = dark ? 'text-calico-300' : 'text-ink-500';
  const headingSize = level === 'section' ? 'text-h2' : 'text-h1';

  /*
   * The margins are deliberately tighter below lg.
   *
   * Assembled at desktop values, this block came to 156px on a 375px phone —
   * eyebrow, heading, a link that drops onto its own line, and a rule, with
   * 56px of margin between the heading and the first product. Five sections of
   * that is 780px of a phone's scroll spent on section furniture. Desktop keeps
   * the generous version, where the same block is a fraction of the viewport.
   */
  return (
    <div className={`mb-6 lg:mb-12 ${className}`}>
      <Reveal distance={14} amount={0.2}>
        <p className={`eyebrow m-0 flex items-center gap-3 ${eyebrowTone}`}>
          <span aria-hidden="true" className="block h-px w-8 bg-ember-500" />
          {eyebrow}
        </p>
      </Reveal>

      <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <SplitText
          as="h2"
          by="word"
          text={heading}
          emphasise={emphasise}
          emphasisClassName={`${dark ? 'text-shimmer' : 'text-shimmer-ink'} font-light italic`}
          amount={0.3}
          className={`m-0 max-w-[16ch] font-display ${headingSize} font-semibold ${headingTone}`}
        />

        {href && (
          <Reveal delay={0.15} distance={12} amount={0.2} className="shrink-0">
            <Link
              href={href}
              className={`hover-link inline-flex items-center gap-2 pb-1 text-body-sm no-underline ${linkTone}`}
            >
              {linkLabel}
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-ember-500" />
            </Link>
          </Reveal>
        )}
      </div>

      {standfirst && (
        <Reveal delay={0.2} distance={12} amount={0.2}>
          <p className={`m-0 mt-3 max-w-[52ch] text-body lg:mt-4 ${standfirstTone}`}>{standfirst}</p>
        </Reveal>
      )}

      {/* The rule. Fades out toward the right rather than butting into the
          container edge, which is the difference between a rule that frames the
          heading and one that looks like the page has been cropped. */}
      <span
        aria-hidden="true"
        className="mt-5 block h-px w-full lg:mt-6"
        style={{ backgroundImage: 'var(--grad-rule)', opacity: dark ? 0.55 : 0.4 }}
      />
    </div>
  );
}
