// src/components/Collection/CollectionHero.tsx

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SplitText } from '@/components/Motion';

export interface Crumb {
  /** Omitted on the last item, which is the current page. */
  href?: string;
  label: string;
}

interface Props {
  eyebrow: string;
  title: string;
  /** One sentence under the title. */
  standfirst?: string;
  /**
   * The specification line — a count, a price range, whatever the page can
   * actually count. Rendered in mono under an ember-led rule, so it reads as a
   * measurement rather than as more prose.
   */
  summary?: string;
  trail: Crumb[];
}

/**
 * The header both collection pages share.
 *
 * They were two copies of the same block, and both had drifted off the
 * palette: `text-white` and `text-white/50` for the type, `stone-600` through
 * `stone-900` in the background gradient, and `bg-white` on the empty state
 * below. None of those are in the ramp — see the note at the head of
 * src/styles/tokens.css about why nothing may reach outside it.
 *
 * This is the same construction as the category hero: ink ground, the two
 * warm aurora washes, grain, a fading ember rule along the bottom edge, and
 * the summary set as a specification. The breadcrumb is one scrolling line
 * rather than a wrapping trail, because a long collection name at the end of
 * it took two rows on a phone.
 */
export default function CollectionHero({ eyebrow, title, standfirst, summary, trail }: Props) {
  return (
    <section
      data-ground="dark"
      className="grad-ink grain relative isolate overflow-hidden bg-ink-900"
    >
      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__deep" />
      </div>

      <div className="relative mx-auto max-w-shell px-4 pb-9 pt-6 sm:px-6 lg:pb-14 lg:pt-10">
        <nav
          aria-label="Breadcrumb"
          className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <ol className="m-0 flex list-none flex-nowrap items-center gap-2 whitespace-nowrap p-0">
            {trail.map(({ href, label }, i) => (
              <li key={label} className={`flex items-center gap-2 ${i === trail.length - 1 ? 'pr-4' : ''}`}>
                {i > 0 && (
                  <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-calico-50/40" />
                )}
                {href ? (
                  <Link
                    href={href}
                    className="hover-link font-data text-caption tracking-[0.06em] text-calico-50/70 no-underline"
                  >
                    {label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    className="font-data text-caption font-semibold tracking-[0.06em] text-ember-300"
                  >
                    {label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <p className="eyebrow m-0 mt-6 flex items-center gap-2.5 text-ember-300">
          <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
          {eyebrow}
        </p>

        <SplitText
          as="h1"
          by="word"
          text={title}
          amount={0.3}
          className="m-0 mt-3 max-w-[18ch] font-display text-display-l font-semibold text-calico-50"
        />

        {standfirst && (
          <p className="m-0 mt-4 max-w-[52ch] text-body text-calico-300">{standfirst}</p>
        )}

        {summary && (
          <>
            <span aria-hidden="true" className="mt-5 flex w-full max-w-[22rem]">
              <span className="block h-px w-8 bg-ember-500" />
              <span className="block h-px flex-1 bg-calico-50/20" />
            </span>
            <p className="m-0 mt-3 font-data text-data tabular-nums text-calico-300">{summary}</p>
          </>
        )}
      </div>

      {/* The bottom edge. A fading ember hairline rather than the flat 2px bar
          both pages carried, so it dissolves into the corners the way every
          other rule on the site does. */}
      <span
        aria-hidden="true"
        className="relative block h-0.5"
        style={{ backgroundImage: 'var(--grad-rule)' }}
      />
    </section>
  );
}
