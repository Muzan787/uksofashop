// src/app/faq/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import FaqList from './FaqList'
import { allFaqs } from './faqData'
import { PHONE_DISPLAY, PHONE_HREF } from '@/constants/contact'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Delivery times, cash and bank transfer on delivery, assembly and old sofa removal, our 1-year frame guarantee, and how returns work. Answers for UK Mainland customers.',
  alternates: { canonical: '/faq' },
}

// FAQPage markup. Google restricted FAQ rich results to government and health
// sites in 2023, so this will not produce a dropdown in UK results for a
// retailer — it is here because it is accurate, costs nothing, and helps search
// engines understand what the page covers.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allFaqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
      />

      <EditorialHero
        eyebrow="Help centre"
        title="Questions, answered"
        lede="Delivery, payment, customising your sofa, and what happens if something isn’t right. If yours isn’t here, ask us."
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <div className="mx-auto max-w-shell px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mx-auto max-w-[68ch]">
          <FaqList />

          {/* ── Still stuck ───────────────────────────────────────────── */}
          <div className="mt-12 flex flex-wrap items-center gap-5 rounded-md border border-ink-700 bg-ink-900 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ink-700">
              <Phone aria-hidden="true" className="h-5 w-5 text-ember-300" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="m-0 text-body font-semibold text-calico-50">Still stuck?</p>
              {/* Calico 300, not Ink 500. Ink 500 on Ink 900 is 1.9:1, which
                  is what this line used to be set in. */}
              <p className="m-0 mt-1 text-body-sm leading-relaxed text-calico-300">
                Mon–Fri 9am–6pm, Sat 10am–4pm. We would rather talk it through than have a sofa
                turn up that doesn’t fit.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <a
                href={PHONE_HREF}
                className="hover-btn hover-btn-dark flex h-12 items-center rounded-sm border border-calico-50/25 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-calico-50 no-underline"
              >
                {PHONE_DISPLAY}
              </a>
              <Link
                href="/contact"
                className="hover-btn flex h-12 items-center rounded-sm bg-ember-500 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
              >
                Message us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
