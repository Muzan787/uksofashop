// src/components/Editorial/EditorialLayout.tsx

import TableOfContents, { type TocEntry } from './TableOfContents'

/**
 * The body of a content page: one 68ch column, with an index beside it on the
 * long ones.
 *
 * The column is centred when there is no index and left-aligned in a two-column
 * grid when there is, rather than being centred with the index floated off to
 * one side — a measure that shifts sideways between pages of the same site
 * reads as two different templates.
 */
export default function EditorialLayout({ toc, children, aside }: {
  /** Six or more entries earns the sticky index. Fewer, omit it. */
  toc?: TocEntry[]
  children: React.ReactNode
  /** Full-width blocks below the column — a table, a map, a calculator. */
  aside?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-shell px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      {toc && toc.length > 0 ? (
        <div className="grid gap-12 lg:grid-cols-[1fr_220px] lg:gap-16">
          <div className="min-w-0">
            <div className="prose">{children}</div>
            {aside}
          </div>

          {/* Second in the DOM, first visually is wrong for a screen reader —
              so it stays after the article and is placed in the right-hand
              column by the grid. */}
          <TableOfContents
            entries={toc}
            className="hidden lg:sticky lg:top-24 lg:block lg:h-fit"
          />
        </div>
      ) : (
        <>
          <div className="prose mx-auto">{children}</div>
          {aside}
        </>
      )}
    </div>
  )
}

/**
 * A line lifted out of the column.
 *
 * Fraunces italic, hung off an ember rule. It is a `<blockquote>` when it is
 * quoting somebody and a plain aside when it is the page raising its own
 * voice, which is what `attribution` decides.
 */
export function PullQuote({ children, attribution }: {
  children: React.ReactNode
  attribution?: string
}) {
  return (
    <figure className="my-10 border-l-2 border-ember-500 pl-6">
      <blockquote className="m-0 font-display text-h3 italic leading-snug text-ink-900 sm:text-h2">
        {children}
      </blockquote>
      {attribution && (
        <figcaption className="mt-4 font-data text-caption uppercase tracking-[0.12em] text-ink-500">
          {attribution}
        </figcaption>
      )}
    </figure>
  )
}

/** A boxed note inside the column — a tip, a caveat, a thing worth knowing. */
export function Note({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-8 rounded-md border border-calico-300 bg-calico-100 p-5">
      {title && (
        <p className="m-0 font-data text-eyebrow uppercase tracking-[0.14em] text-ember-700">
          {title}
        </p>
      )}
      <div className={`text-body-sm leading-relaxed text-ink-700 ${title ? 'mt-2' : ''} [&>*+*]:mt-3 [&>p]:m-0`}>
        {children}
      </div>
    </div>
  )
}

/** The stamp at the head of a policy. Mono, because it is a fact, not prose. */
export function LastUpdated({ date }: { date: string }) {
  return (
    <p className="m-0 font-data text-caption uppercase tracking-[0.14em] text-calico-300">
      Last updated{' '}
      <time dateTime={date} className="text-ember-300">
        {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </time>
    </p>
  )
}
