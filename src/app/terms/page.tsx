// src/app/terms/page.tsx
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import Link from 'next/link'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout, { LastUpdated } from '@/components/Editorial/EditorialLayout'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import { CANCELLATION } from '@/constants/promises'
import { RE_DELIVERY_FEE } from '@/constants/delivery'
import {
  ADDRESS_LINE, PHONE_DISPLAY, PHONE_HREF, SUPPORT_EMAIL, traderIdentityLine,
} from '@/constants/contact'

export const metadata: Metadata = pageMetadata({
  title: 'Terms & Conditions',
  description:
    'Our terms of sale: pricing, payment on delivery, delivery to UK Mainland, and your 14-day right to cancel.',
  path: '/terms',
})

/**
 * Set by hand, on purpose.
 *
 * This was `new Date()`, which rendered today's date on every request — so the
 * page claimed the terms had been revised this morning, every morning, whether
 * a word had changed or not. On a document whose whole function is to say what
 * was agreed and when, that is a false statement rather than a cosmetic bug.
 * Change it when the terms change; not otherwise.
 */
const LAST_UPDATED = '2026-10-05'

const TOC = [
  { id: 'introduction', label: 'Who we are' },
  { id: 'orders', label: 'Placing an order' },
  { id: 'pricing', label: 'Pricing and payment' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'cancelling', label: 'Returns and cancellations' },
  { id: 'guarantees', label: 'Guarantees' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'law', label: 'Governing law' },
]

export default function TermsPage() {
  const traderIdentity = traderIdentityLine()

  return (
    <div className="min-h-screen bg-calico-50">
      {/* WebPage, not Article: a terms document is not a piece of writing with
          an author and a publication date. The BreadcrumbList is the point -
          EditorialHero has been drawing a trail here all along with no markup
          behind it, which is the gap EditorialSchema exists to close and which
          this page, /privacy, /cookies, /careers and /collection all missed. */}
      <EditorialSchema
        type="WebPage"
        headline="Terms & Conditions"
        current="Terms & conditions"
        path="/terms"
        updated={LAST_UPDATED}
        description="Our terms of sale: pricing, payment on delivery, delivery to UK Mainland, and your 14-day right to cancel."
      />
      <EditorialHero
        eyebrow="Legal"
        title="Terms & conditions"
        lede="What you are agreeing to when you order from us, in the plainest language we can put it in."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        meta={<LastUpdated date={LAST_UPDATED} />}
      />

      <EditorialLayout toc={TOC}>
        <h2 id="introduction">1. Who we are</h2>
        <p>
          These terms govern your use of uksofashop.co.uk and the purchase of goods from UK Sofa
          Shop. By placing an order you confirm that you have read, understood and agree to them.
        </p>
        {traderIdentity && <p>{traderIdentity}</p>}
        <p>
          You can reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, on{' '}
          <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>, or by post at {ADDRESS_LINE}.
        </p>

        <h2 id="orders">2. Placing an order</h2>
        <p>
          When you submit an order you are making an offer to purchase. We send an acknowledgement
          email on receipt — that acknowledgement is <strong>not</strong> an acceptance. The
          contract between us is formed when we confirm your order: for a sofa built to your own
          fabric, size or layout that is the phone call we make before anything is made, and for
          everything else it is when we confirm the delivery date with you.
        </p>

        <h2 id="pricing">3. Pricing and payment</h2>
        <p>
          The price shown is the price you pay — there is nothing added at the end. Payment is due
          in full on delivery, either in cash to the driver or by bank transfer completed at the
          door. We do not accept card payments of any kind, and no payment is taken at the time of
          ordering.
        </p>
        <p>
          Optional services — upstairs delivery, assembly, removal of your old sofa — are added at
          checkout and paid on the same day, in the same way.
        </p>

        <h2 id="delivery">4. Delivery</h2>
        <p>
          Delivery is free to UK Mainland addresses with no minimum order value, to the ground
          floor or a ground-floor room of your choice. Delivery dates are estimates. Delays
          occasionally occur for reasons outside our control, and we will tell you about any
          significant one as soon as we know.
        </p>
        <p>
          Once a delivery slot has been confirmed with you, a missed delivery means the journey has
          to be made again and a £{RE_DELIVERY_FEE} re-delivery charge applies. Full detail is on our{' '}
          <Link href="/delivery-returns">delivery and returns page</Link>.
        </p>

        <h2 id="cancelling">5. Returns and cancellations</h2>
        <p>
          Under the Consumer Contracts Regulations you may cancel at any point from placing your
          order until 14 days after it is delivered, for any reason or none. To cancel, tell us in
          a clear statement — email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, call{' '}
          <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>, or write to us at {ADDRESS_LINE}. You can use
          the <Link href="/delivery-returns#cancellation-form">cancellation form</Link> on our
          delivery and returns page, but you do not have to.
        </p>
        <p>
          You then have a further 14 days to send the goods back. For a change-of-mind return you
          arrange and pay for the return carriage. We refund within 14 days of getting the sofa
          back, or of you showing us it has been sent, whichever is sooner. Faulty or damaged items
          are collected free of charge.
        </p>
        <p>{CANCELLATION.test}</p>
        <p>
          Where the exemption applies it affects only your right to change your mind. It does not
          affect your rights if the item turns out to be faulty, which are the same either way.
        </p>

        <h2 id="guarantees">6. Guarantees</h2>
        <p>
          All sofas carry a 1-year structural guarantee covering the frame and the springs. It
          excludes wear and tear, accidental damage and fabric fading. The guarantee sits alongside
          your statutory rights under the Consumer Rights Act 2015 rather than replacing them.
        </p>

        <h2 id="liability">7. Limitation of liability</h2>
        <p>
          We are not liable for indirect or consequential losses arising from the use of our
          products or services, and our liability is limited to the purchase price of the affected
          goods. Nothing in these terms limits our liability for death or personal injury caused by
          negligence, for fraud, or for anything else that cannot lawfully be limited.
        </p>

        <h2 id="law">8. Governing law</h2>
        <p>
          These terms are governed by the laws of England and Wales, and any dispute is subject to
          the exclusive jurisdiction of the courts of England and Wales.
        </p>

        <hr />

        <p className="fine">
          Questions about any of this? <Link href="/contact">Contact us</Link> — we would rather
          explain a clause than have you agree to something you are unsure about.
        </p>
      </EditorialLayout>
    </div>
  )
}
