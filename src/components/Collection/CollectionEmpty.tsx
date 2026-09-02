// src/components/Collection/CollectionEmpty.tsx

import Link from 'next/link';
import { ArrowRight, PackageSearch } from 'lucide-react';

interface Props {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
}

/**
 * Nothing to show, said properly.
 *
 * Both collection pages carried their own copy of this, and both were off the
 * palette: `bg-white` for the panel, `stone-300` for the icon and `stone-500`
 * for the body — none of which are in the ramp.
 *
 * The button was the worse problem. It read `bg-ember-500 text-ink-900` with
 * `hover:bg-ember-700 hover:text-calico-50`, which inverts the palette's one
 * load-bearing rule on hover: Ember 700 is the colour amber TEXT takes on a
 * light ground, not a fill to put pale letterforms on. It is the standard
 * ember pill now, and the hover wash is the shared one every other button uses.
 */
export default function CollectionEmpty({ title, body, ctaLabel, ctaHref = '/shop/all' }: Props) {
  return (
    <div className="flex flex-col items-center rounded-md border border-calico-300 bg-calico-100 px-6 py-14 text-center shadow-e1">
      <span
        aria-hidden="true"
        className="mb-5 grid h-14 w-14 place-items-center rounded-pill border border-ember-500/25 bg-ember-50"
      >
        <PackageSearch className="h-6 w-6 text-ember-700" strokeWidth={1.5} />
      </span>

      <h2 className="m-0 font-display text-h3 font-semibold text-ink-900">{title}</h2>

      <p className="m-0 mt-2.5 max-w-[38ch] text-body-sm leading-relaxed text-ink-500">{body}</p>

      <Link
        href={ctaHref}
        className="hover-btn btn-ember shadow-ember mt-7 inline-flex h-12 items-center gap-2.5 rounded-pill bg-ember-500 px-6 text-body-sm font-semibold text-ink-900 no-underline"
      >
        {ctaLabel}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}
