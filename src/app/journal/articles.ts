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
// A handful of articles a year does not justify a CMS.
//
// WHAT WAS HERE BEFORE. This page used to list "How to Style a Corner Sofa",
// "Leather vs. Fabric" and "What's Inside a Well-Made Sofa" with bylines, read
// times, and dates in October 2026. None of them existed and all three linked
// to a 404.
//
// Two of those titles are still not here and are not coming: /fabrics and the
// care guide already answer them better than an article would, and a second,
// weaker answer competes with the page that has the good one.
//
// The third, on what is inside a sofa, HAS since been written - from scratch,
// and with a scope note at the top of it that is worth reading before editing
// it. Almost nothing about how our own sofas are built is recorded anywhere in
// this repository, so that piece is written about sofas in general and asserts
// only the construction facts the site already publishes and stands behind.
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
  {
    slug: 'whats-inside-a-sofa',
    title: "What's Inside a Sofa: Frames, Springs, Foam and What Actually Lasts",
    heading: "What's inside it",
    eyebrow: 'Buying guide',
    description:
      'Frames, suspension and foam decide whether a sofa lasts. What hardwood, plywood, serpentine springs and foam density actually mean, and how to judge a sofa in a showroom in two minutes.',
    lede:
      'You can judge about a fifth of a sofa by looking at it. The frame, the springs and the foam are the parts that decide how long it lasts, and all three are hidden by the time you meet it.',
    published: '2026-09-04',
    updated: '2026-09-04',
    toc: [
      { id: 'frame', label: 'The frame' },
      { id: 'suspension', label: 'What holds you up' },
      { id: 'foam', label: 'Seat foam and density' },
      { id: 'backs', label: 'Backs, and what sags' },
      { id: 'fabric', label: 'The cover' },
      { id: 'tells', label: 'Judging one in two minutes' },
      { id: 'ask', label: 'What to ask' },
      { id: 'worth', label: 'A last word on price' },
    ],
  },
  {
    slug: 'measuring-for-a-corner-sofa',
    title: 'Measuring for a Corner Sofa: The Two Walls, the Depth and the Hand',
    heading: 'Measuring for a corner',
    eyebrow: 'Before you order',
    description:
      'A corner sofa is two lengths, not one, and its depth eats into both walls. How to measure the two runs, choose between 2c1 and 1c2, and tape out the footprint before you order.',
    lede:
      'The shape most often measured wrong, and not because anyone was careless — a corner is two sofas at a right angle, so most instincts about measuring one give the wrong answer twice.',
    published: '2026-09-04',
    updated: '2026-09-04',
    toc: [
      { id: 'different', label: 'Why it is different' },
      { id: 'hand', label: '2c2, 2c1 and 1c2' },
      { id: 'walls', label: 'Measuring the two runs' },
      { id: 'depth', label: 'The forgotten number' },
      { id: 'clearance', label: 'What must be left over' },
      { id: 'ushape', label: 'If it is a U-shape' },
      { id: 'tape', label: 'Tape it out' },
      { id: 'door', label: 'Then check it gets in' },
    ],
  },
  {
    slug: 'delivery-day-preparation',
    title: 'Sofa Delivery Day: How to Prepare, and What It Costs to Get Wrong',
    heading: 'Getting ready for the van',
    eyebrow: 'Before it arrives',
    description:
      'Book the extras at checkout because they cannot be added at the door, protect a confirmed slot because missing one is £50, clear the route, and move the old sofa out first. A delivery day checklist.',
    lede:
      'Most deliveries that go badly were decided days earlier, by something nobody thought to do. None of it is dramatic and all of it is avoidable.',
    published: '2026-09-04',
    updated: '2026-09-04',
    toc: [
      { id: 'checkout', label: 'Book the extras early' },
      { id: 'slot', label: 'Confirm and protect the day' },
      { id: 'route', label: 'Clear the route' },
      { id: 'spot', label: 'Know where it goes' },
      { id: 'old', label: 'The old sofa' },
      { id: 'access', label: 'Parking and access' },
      { id: 'house', label: 'Floors, pets, children' },
      { id: 'day', label: 'On the day' },
      { id: 'after', label: 'After the van leaves' },
    ],
  },
  {
    slug: 'fabric-or-leather',
    title: 'Fabric or Leather: Which One Suits Your House',
    heading: 'Fabric or leather',
    eyebrow: 'Buying guide',
    description:
      'Decided by household rather than by material: children, dogs, cats, allergies, cold rooms. Plus what tech leather actually is, and the two practical differences that have nothing to do with the surface.',
    lede:
      'The first real decision of a sofa purchase, usually made on a photograph — the one input that tells you nothing. Both look good in a picture; they behave completely differently in a house.',
    published: '2026-09-04',
    updated: '2026-09-04',
    toc: [
      { id: 'what', label: 'What we actually sell' },
      { id: 'children', label: 'With young children' },
      { id: 'pets', label: 'With a dog or a cat' },
      { id: 'allergies', label: 'With allergies' },
      { id: 'comfort', label: 'How they feel' },
      { id: 'look', label: 'How they age' },
      { id: 'size', label: 'Sizing and returns' },
      { id: 'verdict', label: 'The short version' },
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
