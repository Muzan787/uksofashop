// src/components/Category/CategoryCopy.tsx

import Link from 'next/link'
import type { CategoryCopy as Copy } from '@/constants/categorySeo'

/**
 * The prose block under a category grid.
 *
 * It sits BELOW the products, not above them. Copy above the grid pushes the
 * thing the visitor came for off the first screen, which costs conversions to
 * buy ranking - a trade nobody actually wants. Below the fold it is read by the
 * people who scroll, and by every crawler, and it costs the buyer who already
 * knows what they want precisely nothing.
 *
 * Rendered as a real <section> with an <h2>, not a collapsed accordion. Text
 * hidden behind a "read more" toggle is discounted in ranking, and an answer
 * engine quoting a page will not open a disclosure widget to find it.
 */

/**
 * Renders `[label](/path)` as an anchor and leaves everything else as text.
 *
 * A deliberately tiny subset of markdown: internal paths only, no images, no
 * emphasis, no nesting. The capture is non-greedy on both halves so two links
 * in one sentence do not merge into one enormous match, and the path is
 * constrained to something starting with "/" so a stray bracket in ordinary
 * copy cannot turn into a broken link to an external host.
 */
const LINK = /\[([^\]]+?)\]\((\/[^)\s]*)\)/g

function withLinks(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  // exec on a /g regex is stateful; a fresh one per call keeps lastIndex from
  // leaking between paragraphs.
  const re = new RegExp(LINK.source, 'g')

  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index))
    out.push(
      <Link key={`${keyPrefix}-${match.index}`} href={match[2]}>
        {match[1]}
      </Link>,
    )
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

export default function CategoryCopy({ copy }: { copy: Copy }) {
  return (
    <section className="mt-16 border-t border-ink-900/10 pt-12 lg:mt-20 lg:pt-16">
      <div className="prose mx-auto">
        <span className="eyebrow m-0 mb-4 flex items-center gap-2.5 text-ember-700">
          <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
          Worth knowing
        </span>

        {/* The DB category name already titles the hero as the h1, so this is an
            h2 and the outline stays one-h1-per-page. */}
        <h2>{copy.heading}</h2>

        {copy.body.map((para, i) => (
          <p key={i}>{withLinks(para, `p${i}`)}</p>
        ))}
      </div>
    </section>
  )
}
