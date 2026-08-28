// src/app/journal/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, PenTool } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout from '@/components/Editorial/EditorialLayout'
import EmptyState from '@/components/UI/EmptyState'

export const metadata: Metadata = {
  alternates: { canonical: '/journal' },
  title: 'The Journal',
  description:
    'Notes on choosing, measuring and living with a sofa. Nothing published yet — in the meantime, our guides answer most of it.',
  // Nothing to index until something is written. Removing this line is part of
  // publishing the first article.
  robots: { index: false, follow: true },
}

/**
 * Nothing published yet, and it says so.
 *
 * This page previously listed three articles — "How to Style a Corner Sofa",
 * "Leather vs. Fabric" and "What's Inside a Well-Made Sofa" — with bylines,
 * dates in October 2026, and read times. None of them existed. There is no
 * /journal/[id] route, so all three cards linked to a 404, and the dates were
 * in the future because they were placeholders nobody came back to.
 *
 * Three invented articles that 404 is worse than an honest empty page: it
 * costs a visitor a click to find out, and it is the kind of thing that makes
 * somebody wonder what else on the site is not real. When there are articles,
 * this becomes a grid again.
 */
export default function JournalPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialHero
        eyebrow="Inspiration & notes"
        title="The Journal"
        lede="Notes on choosing, measuring and living with a sofa. We are writing the first ones now."
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <EditorialLayout>
        <EmptyState
          icon={BookOpen}
          heading="Nothing published yet"
          line="We would rather write three pieces worth reading than thirty that are not."
          action={{ label: 'Read the guides instead', href: '/size-guide' }}
          secondary={{ label: 'Or browse the sofas', href: '/shop/all' }}
          className="not-prose"
        />

        <h2>What we would rather do first</h2>
        <p>
          Most of what a journal would cover, we have already written where it is actually
          useful — on the page where the question comes up rather than in an archive somebody has
          to go looking for.
        </p>
        <ul>
          <li>
            <Link href="/size-guide">Will it fit?</Link> — measuring doorways, hallways and the
            turn at the bottom of the stairs, with a calculator that answers it directly.
          </li>
          <li>
            <Link href="/care-guide">Looking after it</Link> — what to do in the first thirty
            seconds of a spill, and the five products that will ruin leather.
          </li>
          <li>
            <Link href="/delivery-returns">Delivery and returns</Link> — how long it takes to
            reach you, what everything costs, and what happens if it turns up damaged.
          </li>
          <li>
            <Link href="/faq">The questions we actually get asked</Link> — searchable, and honest
            about the awkward ones.
          </li>
        </ul>

        <h2>Writing for us</h2>
        <p>
          If you are an interior designer, a home writer or a journalist and you would like to
          contribute something — or you want to feature our sofas in a piece of your own — we
          would like to hear from you. We are a small operation and we read everything.
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
