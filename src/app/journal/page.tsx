// src/app/journal/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, PenTool } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout from '@/components/Editorial/EditorialLayout'
import { ARTICLES_BY_DATE } from './articles'

/**
 * Said once, used twice: as the meta description, and as the description on the
 * page's own schema node.
 */
const DESCRIPTION =
  'Notes on choosing, measuring and paying for a sofa. What the labels on a sofa actually mean, how made-to-order works, and how paying on the doorstep works.'

export const metadata: Metadata = {
  alternates: { canonical: '/journal' },
  title: 'The Journal',
  description: DESCRIPTION,
  // The noindex that used to live here is gone, and so is the line in
  // sitemap.ts that contradicted it. There are three articles now; the page
  // has something to index.
}

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * The index.
 *
 * What this replaces, twice over. It first listed "How to Style a Corner Sofa",
 * "Leather vs. Fabric" and "What's Inside a Well-Made Sofa" — three invented
 * articles with bylines and read times, dated in the future, every one linking
 * to a 404 because no /journal/[slug] route existed. That was replaced by an
 * honest empty state saying nothing was published yet.
 *
 * This is the third version and the first true one: three articles that exist,
 * on subjects the guides do NOT already cover. Two of the original three titles
 * were quietly dropped rather than written, because /fabrics and /size-guide
 * already answer them better than an article would.
 *
 * Still no read times and no bylines. Both were invented last time and neither
 * is worth faking — see the note in ./articles.ts.
 */
export default function JournalPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="CollectionPage"
        headline="The Journal"
        path="/journal"
        updated="2026-09-03"
        description={DESCRIPTION}
      />

      <EditorialHero
        eyebrow="Inspiration & notes"
        title="The Journal"
        lede="Notes on choosing, measuring and paying for a sofa — the things that come up often enough to be worth writing down properly."
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <EditorialLayout>
        {/* not-prose: the cards bring their own spacing, and .prose would add a
            second lot of it between every one. */}
        <ul className="not-prose m-0 grid list-none gap-5 p-0">
          {ARTICLES_BY_DATE.map(article => (
            <li key={article.slug}>
              <Link
                href={`/journal/${article.slug}`}
                className="group flex flex-col rounded-md border border-calico-300 bg-calico-100 p-6 no-underline transition-colors hover:border-ember-500 sm:p-7"
              >
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-caption uppercase tracking-[0.12em] text-ink-500">
                  <span className="text-ember-700">{article.eyebrow}</span>
                  <span aria-hidden="true" className="block h-px w-4 bg-calico-300" />
                  <time dateTime={article.published}>
                    {DATE.format(new Date(article.published))}
                  </time>
                </span>

                <span className="mt-3 font-display text-h2 font-semibold leading-tight text-ink-900">
                  {article.heading}
                </span>

                <span className="mt-3 max-w-[62ch] text-body leading-relaxed text-ink-700">
                  {article.description}
                </span>

                <span className="mt-5 flex items-center gap-2 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ember-700">
                  Read it
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-swift ease-out-expo group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <h2>The guides, which cover more</h2>
        <p>
          The Journal is for things that do not belong on a product page. Most of what you actually
          need in order to choose a sofa is already written where the question comes up, rather
          than in an archive you have to go looking for.
        </p>
        <ul>
          <li>
            <Link href="/fabrics">Choosing your fabric</Link> — what chenille, plush velvet,
            crushed velvet, naple, marble and PVC leather each actually do in a room, and all 69
            colours to look at.
          </li>
          <li>
            <Link href="/size-guide">Will it fit?</Link> — measuring doorways, hallways and the
            turn at the bottom of the stairs, with a calculator that answers it directly.
          </li>
          <li>
            <Link href="/care-guide">Looking after it</Link> — what to do in the first thirty
            seconds of a spill, and the five products that will ruin leather.
          </li>
          <li>
            <Link href="/delivery-returns">Delivery and returns</Link> — how long it takes to reach
            you, what everything costs, and what happens if it turns up damaged.
          </li>
          <li>
            <Link href="/faq">The questions we actually get asked</Link> — searchable, and honest
            about the awkward ones.
          </li>
        </ul>

        <h2>Writing for us</h2>
        <p>
          If you are an interior designer, a home writer or a journalist and you would like to
          contribute something — or you want to feature our sofas in a piece of your own — we would
          like to hear from you. We are a small operation and we read everything.
        </p>

        <div className="my-8 flex flex-wrap items-center gap-5 rounded-md border border-calico-300 bg-calico-100 p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ember-500/12">
            <PenTool aria-hidden="true" className="h-5 w-5 text-ember-700" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-body font-semibold text-ink-900">Pitches and press</p>
            <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">
              Tell us what you have in mind. A paragraph is plenty.
            </p>
          </div>
          <Link
            href="/contact"
            className="hover-btn flex h-12 shrink-0 items-center rounded-sm bg-ink-900 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-calico-50 no-underline"
          >
            Get in touch
          </Link>
        </div>
      </EditorialLayout>
    </div>
  )
}
