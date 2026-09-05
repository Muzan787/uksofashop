// src/app/swatches/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, ChevronRight, MessageCircle, Package, PhoneCall, Truck } from 'lucide-react'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import { SamplesProvider, SampleBar } from '@/components/Product/FabricSamples'
import { getFabricLibrary } from '@/utils/fabrics'
import { MAX_SAMPLES } from '@/constants/swatches'
import { whatsAppHref } from '@/constants/contact'
import { ogImage } from '@/utils/socialImage'
import SwatchBrowser from './SwatchBrowser'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE LINK YOU SEND SOMEBODY WHO ASKED FOR SWATCHES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Most fabric conversations do not start on the website. They start with a
 * message — "do you have any greys?" — and until now the only answer was to
 * photograph swatches one at a time into a chat, or to send /fabrics and hope
 * somebody scrolls past four and a half thousand words of guide to reach the
 * squares. Neither ends with an address to post to.
 *
 * This is that link. Short enough to type into a chat, it opens on the whole
 * range, and the same three-free-samples flow the guide carries is the first
 * thing on the page rather than the reward for reading it.
 *
 * IT IS THE SAME REQUEST, NOT A SECOND ONE. Everything below the hero is the
 * machinery /fabrics already uses — the same basket, the same three-at-a-time
 * limit, the same form and the same `request_swatches` call. A sample ordered
 * here lands in /admin/swatches indistinguishable from one ordered anywhere
 * else, which is the whole point: there is no second inbox to remember to
 * check.
 *
 * HOW IT STAYS OUT OF /FABRICS' WAY. The two pages carry the same sixty-nine
 * photographs, so the thing that has to keep them apart is intent, and it is
 * load-bearing rather than cosmetic:
 *
 *   /fabrics answers "what is chenille, and will it survive a dog". It is the
 *   guide, it is four and a half thousand words, and it is what should arrive
 *   for somebody still deciding between a velvet and a flat weave.
 *
 *   /swatches answers "send me some". It is the free-samples page, its H1 and
 *   title say so, and it should arrive for somebody who has stopped reading
 *   and wants cloth in the post.
 *
 * That separation only holds while the copy on each page keeps pointing at its
 * own question. If this page ever grows paragraphs explaining what chenille is
 * — and it will be tempting — it stops being a different page and starts being
 * a worse copy of the guide, which is the failure mode to watch for. The two
 * link to each other in both directions so the relationship is legible rather
 * than inferred.
 *
 * The Open Graph block is not decoration either. This URL's whole life is
 * being pasted into WhatsApp, and WhatsApp renders the card, not the page.
 */

const DESCRIPTION =
  `Pick up to ${MAX_SAMPLES} fabric samples and we will post them free, anywhere on the UK mainland. ` +
  'All 69 made-to-order colours across chenille, plush velvet, crushed velvet, naple, marble and ' +
  'PVC leather. Nothing to pay, nothing to send back.'

/**
 * "Sofa" earns its place now that the page is indexed: the query being chased
 * is "free sofa fabric samples", and "Order Free Fabric Samples" on its own
 * competes with every curtain and cushion retailer in the country. 30
 * characters, so the brand suffix still lands inside ~57.
 */
const TITLE = 'Order Free Sofa Fabric Samples'

/**
 * The H1, the trailing breadcrumb and the trailing crumb in the BreadcrumbList
 * are the same three words on purpose. Google reads a trail that disagrees
 * with the page it sits on as a mismatch, and the metadata TITLE is the wrong
 * source for it — it describes the page to somebody who has not opened it,
 * which is not what a crumb is for.
 */
const CRUMB = 'Free fabric samples'

export const metadata: Metadata = {
  alternates: { canonical: '/swatches' },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: '/swatches',
    title: `${TITLE} | UK Sofa Shop`,
    description: DESCRIPTION,
    // The site-wide card rather than a swatch photograph. One square of velvet
    // cropped to 1200x630 reads as a colour block of unknown purpose in a chat
    // window; the room shot at least says "sofas".
    images: [ogImage('/og-image.jpg', 'UK Sofa Shop')],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | UK Sofa Shop`,
    description: DESCRIPTION,
    images: ['/og-image.jpg'],
  },
}

/** Three lines under the heading. Facts, not selling. */
const PROMISES = [
  { icon: Package, label: `${MAX_SAMPLES} samples`, detail: 'Whichever three you like' },
  { icon: Truck, label: 'Posted free', detail: 'Anywhere on the UK mainland' },
  { icon: PhoneCall, label: 'A quick call', detail: 'Before anything goes in the post' },
]

export default async function SwatchesPage() {
  const collections = await getFabricLibrary()
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)

  return (
    <div className="min-h-screen bg-calico-50">
      {/* WebPage rather than Article. This is a page you do something on, not
          a piece somebody wrote — an Article node here would want an author
          and a publication date for what is, in the end, a form and a grid. */}
      <EditorialSchema
        type="WebPage"
        headline={TITLE}
        current={CRUMB}
        path="/swatches"
        updated="2026-09-05"
        description={DESCRIPTION}
      />

      <SamplesProvider collections={collections}>
        {/* ── Hero ───────────────────────────────────────────────────────────
            Deliberately not EditorialHero. That one is 44vh of dark ground
            before a word of content, which is right at the top of a guide
            somebody chose to read and wrong on a page somebody was sent — here
            the first swatch should be reachable in one thumb flick. */}
        <header className="bg-ink-900 pb-10 pt-24 sm:pb-12 sm:pt-28">
          <div className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8">
            {/* The trail EditorialHero would have drawn, by hand because the
                hero is. It exists so the BreadcrumbList below has something on
                screen behind it — markup for a trail nobody can see is the one
                kind of structured data Google treats as an attempt at a trick. */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 font-data text-caption uppercase tracking-[0.1em]">
                <li className="flex items-center gap-1">
                  <Link href="/" className="hover-link text-calico-300 no-underline">
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-1" aria-current="page">
                  <ChevronRight aria-hidden="true" className="h-3 w-3 text-calico-300/50" />
                  <span className="text-ember-300">{CRUMB}</span>
                </li>
              </ol>
            </nav>

            <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-300">
              Made to order
            </p>
            <h1 className="m-0 mt-3 max-w-[18ch] font-display text-h1 font-semibold text-calico-50">
              {CRUMB}
            </h1>
            <p className="m-0 mt-4 max-w-read text-lead text-calico-300">
              All {total} colours we build sofas in, and every one of them the same price. Tap up
              to {MAX_SAMPLES} and we&apos;ll put them in the post — there&apos;s nothing to pay,
              nothing to send back and no account to make.
            </p>

            <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3">
              {PROMISES.map(({ icon: Icon, label, detail }) => (
                <li key={label} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-ember-500/20"
                  >
                    <Icon className="h-4 w-4 text-ember-300" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-calico-50">{label}</span>
                    <span className="block text-caption text-calico-300">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <SwatchBrowser />

        {/* ── After the grid ─────────────────────────────────────────────────
            Three ways out, for the three people who reach the bottom without
            having tapped anything: one who wants to ask a human, one who wants
            to know what chenille actually is, and one who has decided and
            wants a sofa. */}
        <section className="border-t border-calico-300 bg-calico-100">
          <div className="mx-auto w-full max-w-shell px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="m-0 font-display text-h2 font-semibold text-ink-900">
              What happens next
            </h2>
            <ol className="m-0 mt-6 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-3">
              {[
                ['Pick three', 'Tap any swatch above, then fill in where to post them.'],
                ['We ring you', 'Two minutes, to check three shades of the same grey isn’t what you meant.'],
                ['They arrive', 'Hold them against your own wall, in your own light, before you decide.'],
              ].map(([step, detail], i) => (
                <li key={step}>
                  <span className="font-data text-caption uppercase tracking-widest text-ember-700">
                    Step {i + 1}
                  </span>
                  <p className="m-0 mt-2 font-display text-h3 font-semibold text-ink-900">{step}</p>
                  <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-700">{detail}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={whatsAppHref('Hi — I was looking at your fabric samples page and had a question')}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-btn btn-whatsapp shadow-whatsapp flex h-12 items-center gap-2.5 rounded-pill bg-whatsapp px-5 text-body-sm font-semibold text-ink-900 no-underline"
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                Ask us on WhatsApp
              </a>
              <Link
                href="/fabrics"
                className="hover-btn flex h-12 items-center gap-2.5 rounded-pill border border-calico-300 bg-calico-50 px-5 text-body-sm font-semibold text-ink-900 no-underline"
              >
                <BookOpen aria-hidden="true" className="h-4 w-4 text-ink-500" />
                What each fabric is actually like
              </Link>
            </div>

            <p className="m-0 mt-8 max-w-read text-caption leading-relaxed text-ink-500">
              A screen cannot settle a colour — phone displays boost saturation, monitors are
              rarely calibrated, and a north-facing room in November is nothing like a photography
              studio. That is what the samples are for. Made-to-order sofas are built to your
              specification and fall outside the 14-day change-of-mind right, so if there is any
              doubt at all, wait for them. Every frame in the{' '}
              <Link href="/shop/all" className="hover-link text-ink-700">
                shop
              </Link>{' '}
              offers the whole library at the same price.
            </p>
          </div>
        </section>

        <SampleBar />
      </SamplesProvider>
    </div>
  )
}
