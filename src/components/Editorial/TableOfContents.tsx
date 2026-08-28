'use client'
// src/components/Editorial/TableOfContents.tsx

import { useEffect, useState } from 'react'

export interface TocEntry {
  id: string
  label: string
}

/**
 * Where you are in a long page.
 *
 * Only worth having above about six sections — below that it is a list of
 * links to things already on the screen. It is hidden below `lg` because a
 * sticky index on a phone is a second thing competing for a screen that only
 * has room for one.
 *
 * The links are plain anchors and work with no JavaScript at all. The
 * highlight is the only part that needs the observer, and if it never runs the
 * list is still a usable index rather than a broken one.
 */
export default function TableOfContents({ entries, className }: {
  entries: TocEntry[]
  className?: string
}) {
  const [active, setActive] = useState(entries[0]?.id ?? '')

  useEffect(() => {
    const headings = entries
      .map(e => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null)

    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      records => {
        // The topmost heading currently inside the band is the one we are in.
        // Taking the first *intersecting* record rather than the most recent
        // one stops the highlight jumping backwards when scrolling up past
        // two headings inside one frame.
        const visible = records
          .filter(r => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]) setActive(visible[0].target.id)
      },
      // A band across the upper third: a heading counts as "here" once it has
      // reached the top of the viewport, and stops counting when the next one
      // arrives, rather than only while it is literally on screen.
      { rootMargin: '-96px 0px -66% 0px', threshold: 0 },
    )

    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [entries])

  return (
    <nav aria-label="On this page" className={className}>
      <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
        On this page
      </p>

      <ul className="m-0 mt-4 flex list-none flex-col gap-0 border-l border-calico-300 p-0">
        {entries.map(entry => {
          const here = active === entry.id
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={here ? 'true' : undefined}
                className={`-ml-px block border-l-2 py-2 pl-4 text-body-sm leading-snug no-underline transition-colors duration-swift ease-out-expo ${
                  here
                    ? 'border-ember-500 font-semibold text-ink-900'
                    : 'border-transparent text-ink-500 hover:text-ink-900'
                }`}
              >
                {entry.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
