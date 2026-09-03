// src/app/journal/articles.ts
//
// The Journal's index. Metadata only - each article's prose lives beside it in
// ./articles/<slug>.tsx and is wired up in ./articles/index.ts.
//
// WHY THIS IS A FILE AND NOT A TABLE. Everything else on this site that reads
// as content - the size guide, the care guide, the fabric guide - is a hand
// written page, because the prose and the components it uses are the same
// thing: a PullQuote in the middle of an argument is part of the writing. An
// articles table would mean either a rich text editor nobody asked for, or
// markdown that cannot use any of the components these pages are built from.
// Three articles a year does not justify a CMS.
//
// WHAT WAS HERE BEFORE. This page used to list "How to Style a Corner Sofa",
// "Leather vs. Fabric" and "What's Inside a Well-Made Sofa" with bylines, read
// times, and dates in October 2026. None of them existed and all three linked
// to a 404. Those three titles are NOT the three below, which was deliberate:
// two of them would have repeated /fabrics and /size-guide almost line for
// line, and the site does not need a second answer to a question it already
// answers well.
//
// NO READ TIMES, NO BYLINES. The old cards carried both and both were invented.
// A read time is only honest if something counts the words, and a byline is
// only honest if a person is behind it. Neither is worth faking for decoration.

import type { TocEntry } from '@/components/Editorial/TableOfContents'

export interface Article {
  slug: string
  /**
   * The <title> and the schema headline: descriptive, written for somebody who
   * has not read the piece. Kept separate from `heading` for the same reason
   * EditorialSchema keeps them separate everywhere else on the site.
   */
  title: string
  /** The h1 as rendered, and therefore the trailing breadcrumb. */
  heading: string
  eyebrow: string
  /** Meta description, and the standfirst on the index card. */
  description: string
  /** The hero lede. One or two sentences. */
  lede: string
  /** ISO YYYY-MM-DD. */
  published: string
  /** Bump when the content changes, not when the file is reformatted. */
  updated: string
  toc: TocEntry[]
}

export const ARTICLES: Article[] = [
  {
    slug: 'sofa-jargon-explained',
    title: 'Sofa Jargon Explained: 2c2, High-Back, Scatter-Back and the Rest',
    heading: 'What the labels mean',
    eyebrow: 'Buying guide',
    description:
      'What 2c2, 2c1, high-back, scatter-back and 3+2 actually mean, and whether a settee and a sofa are different things. The words UK sofa shops use, including ours, in plain English.',
    lede: 'Every trade has words it forgets are not ordinary words. Ours are on the labels of the sofas we sell, so here they are in English.',
    published: '2026-09-03',
    updated: '2026-09-03',
    toc: [
      { id: 'names', label: 'Settee, sofa, couch' },
      { id: 'seaters', label: 'Seaters and 3+2' },
      { id: 'corners', label: 'Corner codes: 2c2, 2c1' },
      { id: 'backs', label: 'High-back and scatter-back' },
      { id: 'recliners', label: 'Manual and electric' },
      { id: 'fabrics', label: 'The fabric names' },
      { id: 'madeto', label: 'Made to order vs stocked' },
    ],
  },
  {
    slug: 'made-to-order-explained',
    title: 'Made to Order, Explained: Your Size, Your Fabric, and the Catch',
    heading: 'Made to your size',
    eyebrow: 'How we work',
    description:
      'What you can actually change on a made-to-order sofa, how the 69-colour fabric library and the free samples work, and the one real trade-off: made-to-measure is exempt from the 14-day right to change your mind.',
    lede: 'Our fabric sofas are built after you order rather than picked off a shelf. That buys you the size and the colour. It costs you something too, and this is the honest version of both.',
    published: '2026-09-03',
    updated: '2026-09-03',
    toc: [
      { id: 'what', label: 'What it actually means' },
      { id: 'size', label: 'Changing the size' },
      { id: 'fabric', label: 'The 69 colours' },
      { id: 'samples', label: 'Order the samples' },
      { id: 'catch', label: 'The catch, plainly' },
      { id: 'faults', label: 'Faults are different' },
      { id: 'worth', label: 'When it is worth it' },
    ],
  },
  {
    slug: 'cash-on-delivery-explained',
    title: 'Cash on Delivery, Explained: How Paying on the Doorstep Works',
    heading: 'Paying on the doorstep',
    eyebrow: 'How we work',
    description:
      'No deposit, no card, no finance: you pay for the sofa when it reaches your house, in cash or by bank transfer. What to have ready on the day, what the optional extras cost, and what happens if something is wrong.',
    lede: 'You pay nothing until the sofa is at your door and you have looked at it. Here is exactly how that works on the day, including the parts that catch people out.',
    published: '2026-09-03',
    updated: '2026-09-03',
    toc: [
      { id: 'how', label: 'Nothing upfront' },
      { id: 'methods', label: 'Cash or bank transfer' },
      { id: 'inspect', label: 'Look before you pay' },
      { id: 'extras', label: 'The optional extras' },
      { id: 'later', label: 'Damage found later' },
      { id: 'mind', label: 'Changing your mind' },
      { id: 'why', label: 'Why we sell this way' },
    ],
  },
]

/** Newest first, which is the order the index renders them in. */
export const ARTICLES_BY_DATE = [...ARTICLES].sort((a, b) =>
  b.published.localeCompare(a.published),
)

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find(a => a.slug === slug)
}
