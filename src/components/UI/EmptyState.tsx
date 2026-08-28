// src/components/UI/EmptyState.tsx

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface Props {
  /** Drawn in a Calico 100 well. Kept to one. */
  icon: LucideIcon;
  heading: string;
  /** One line. Two is a paragraph, and nobody reads a paragraph here. */
  line: string;
  action?: { label: string; href: string };
  /** A second, quieter way out. Optional, and genuinely optional. */
  secondary?: { label: string; href: string };
  /** For a state with its own drawing — the cart and the listing have one. */
  illustration?: React.ReactNode;
  /** Between the line and the action. Chips, a note — not a second paragraph. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Nothing here yet.
 *
 * Five surfaces needed one of these and five of them wrote their own, so an
 * empty cart, an empty wishlist and a search with no results each looked like
 * a different kind of problem. The shape is fixed: one icon, one heading, one
 * line, one thing to do next.
 *
 * The action is the part that was usually missing or wrong — several of these
 * offered "Browse" pointing at /shop/all, which for somebody who had just
 * filtered a category throws away everything they had told us.
 */
export default function EmptyState({
  icon: Icon, heading, line, action, secondary, illustration, children, className,
}: Props) {
  return (
    <div className={`rounded-md border border-calico-300 bg-calico-50 px-6 py-12 text-center ${className ?? ''}`}>
      {illustration ?? (
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-calico-100">
          <Icon aria-hidden="true" className="h-7 w-7 text-ink-400" />
        </span>
      )}

      <h2 className="m-0 mt-5 font-display text-h3 font-semibold text-ink-900">{heading}</h2>
      <p className="m-0 mx-auto mt-2 max-w-[38ch] text-body-sm leading-relaxed text-ink-500">{line}</p>

      {children}

      {action && (
        <Link
          href={action.href}
          className="hover-btn mt-6 inline-flex h-12 items-center gap-2 rounded-sm bg-ember-500 px-6 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
        >
          {action.label}
        </Link>
      )}

      {secondary && (
        <div className="mt-3">
          <Link href={secondary.href} className="hover-link text-caption text-ink-500 no-underline">
            {secondary.label}
          </Link>
        </div>
      )}
    </div>
  );
}
