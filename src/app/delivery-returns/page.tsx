// src/app/delivery-returns/page.tsx
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import Link from 'next/link'
import { Clock, RotateCcw, Truck, Wallet } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { Note, PullQuote } from '@/components/Editorial/EditorialLayout'
import CoverageMap from '@/components/Editorial/CoverageMap'
import { ASSEMBLY_FEE, RE_DELIVERY_FEE, SOFA_REMOVAL_PER_SEAT, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'
import { CANCELLATION, PROMISES } from '@/constants/promises'
import { ADDRESS_LINE, PHONE_DISPLAY, PHONE_HREF, SUPPORT_EMAIL } from '@/constants/contact'

/**
 * Said once, used twice: as the meta description, and as the description on
 * the page's own schema node. Two hand-written sentences describing the same
 * page is the sort of drift nobody notices and nothing benefits from.
 */
// timingShort rather than timingLong: with the long form this ran to 236
// characters and was truncated before the returns clause, which is the half
// of the page people search for. The Wales and Scotland exception is on the
// page itself, where somebody checking their own postcode will be looking.
const DESCRIPTION =
  `${PROMISES.delivery.short}. ${PROMISES.delivery.timingShort}. Pay on the doorstep, plus the damage procedure and your 14-day right to change your mind.`

export const metadata: Metadata = pageMetadata({
  title: 'Sofa Delivery & Returns',
  description: DESCRIPTION,
  path: '/delivery-returns',
})

const TOC = [
  { id: 'delivery', label: 'Getting it to you' },
  { id: 'costs', label: 'What things cost' },
  { id: 'access', label: 'Access and upstairs' },
  { id: 'damaged', label: 'If it arrives damaged' },
  { id: 'returns', label: 'Changing your mind' },
  { id: 'cancellation-form', label: 'Cancellation form' },
  { id: 'bespoke', label: 'Built to your specification' },
]

const CHARGES = [
  {
    label: 'Delivery to UK Mainland, ground floor',
    price: 'Free',
    note: 'No minimum order value',
    free: true,
  },
  {
    label: 'Upstairs delivery',
    price: `From £${UPSTAIRS_FIRST_FLOOR}`,
    note: 'Per flight. Added at checkout',
  },
  {
    label: 'Assembly in the room',
    price: `£${ASSEMBLY_FEE}`,
    note: 'Added at checkout',
  },
  {
    label: 'Taking your old sofa away',
    price: `£${SOFA_REMOVAL_PER_SEAT} per seat`,
    note: 'Count every seat we collect. May differ for very large items — we will tell you as soon as your order reaches us',
  },
  {
    label: 'Re-delivery after a missed slot',
    price: `£${RE_DELIVERY_FEE}`,
    note: 'Only once a slot has been confirmed with you',
  },
]

const FACTS = [
  { icon: Truck, label: 'Free UK Mainland delivery' },
  { icon: Clock, label: PROMISES.delivery.timingShort },
  { icon: Wallet, label: 'Pay on delivery' },
  { icon: RotateCcw, label: '14 days to change your mind' },
]

export default function DeliveryReturnsPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="WebPage"
        headline="Delivery & Returns"
        current="Delivery & returns"
        path="/delivery-returns"
        updated="2026-10-05"
        description={DESCRIPTION}
      />
      <EditorialHero
        eyebrow="Policies"
        title="Delivery & returns"
        lede="How your sofa gets to you, what it costs, and what happens if something isn’t right when it arrives."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        meta={
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {FACTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 font-data text-caption uppercase tracking-[0.1em] text-calico-300">
                <Icon aria-hidden="true" className="h-3.5 w-3.5 text-ember-300" />
                {label}
              </li>
            ))}
          </ul>
        }
      />

      <EditorialLayout toc={TOC}>
        <h2 id="delivery">Getting it to you</h2>
        <p>
          Delivery is free to every UK Mainland address, with no minimum order value. Our drivers
          bring your sofa to the ground floor, or to a ground-floor room of your choice. Most UK
          Mainland orders arrive in two to four working days. Some Wales and Scotland postcodes
          take five to seven working days.
        </p>
        <p>
          Northern Ireland, the Isle of Man and the Scottish Islands sit outside that service. They
          are not refused; we simply do not quote for them automatically, so please get in touch
          before ordering and we will arrange delivery for you.
        </p>

        <CoverageMap />

        <h2 id="costs">What things cost</h2>
        <p>
          Everything below is paid on delivery along with the sofa itself. Nothing is taken when
          you place the order — not a deposit, not a card pre-authorisation, nothing.
        </p>

        {/* Focusable, so the table can be scrolled sideways on a narrow
            screen without a mouse. */}
        <div tabIndex={0} role="region" aria-label="Delivery and service charges" className="my-8 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <caption className="sr-only">Delivery and service charges, all paid on delivery</caption>
            <thead>
              <tr className="border-b border-calico-300">
                <th scope="col" className="pb-3 font-data text-eyebrow font-bold uppercase tracking-[0.14em] text-ink-500">
                  Service
                </th>
                <th scope="col" className="pb-3 text-right font-data text-eyebrow font-bold uppercase tracking-[0.14em] text-ink-500">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {CHARGES.map(({ label, price, note, free }) => (
                <tr key={label} className="border-b border-calico-100 last:border-b-0">
                  <th scope="row" className="py-4 pr-4 align-top font-normal">
                    <span className="block text-body-sm font-semibold text-ink-900">{label}</span>
                    {note && (
                      <span className="mt-1 block text-caption leading-relaxed text-ink-500">
                        {note}
                      </span>
                    )}
                  </th>
                  <td className="py-4 text-right align-top">
                    <span
                      className={`whitespace-nowrap font-data text-body font-bold tabular-nums ${
                        free ? 'text-sage-700' : 'text-ink-900'
                      }`}
                    >
                      {price}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="access">Access and upstairs</h2>
        <p>
          Have a think about access before your delivery day. The van needs to reach the property
          so the team can unload safely — narrow lanes, low archways, permit-only parking and
          blocked driveways are the usual culprits. Tell us in advance if any of those apply and
          we will plan around them.
        </p>
        <p>
          We can take your sofa above the ground floor for a fee, added at checkout. If you are
          not sure how many floors are involved, or whether it will turn on your stairwell, please
          check with us <strong>before you buy</strong> rather than on the day. Our{' '}
          <Link href="/size-guide">size guide</Link> has a doorway calculator that will narrow the
          range down for you in about ten seconds.
        </p>

        <PullQuote>
          We would far rather spend ten minutes on the phone about a doorway than send a van
          two hundred miles to a sofa that will not go in.
        </PullQuote>

        <Note title="If you miss your delivery">
          <p>
            Once a slot has been confirmed with you, a missed delivery means the whole trip has to
            be made again, so a £{RE_DELIVERY_FEE} re-delivery charge applies. If the day stops working for you,
            tell us as early as you can and we will simply rearrange it — there is no charge for
            moving a date before it is confirmed.
          </p>
        </Note>

        <h2 id="damaged">If it arrives damaged</h2>
        <p>
          Because you pay on delivery, you get to look at your sofa before any money changes
          hands. Please do. Have a proper look while the driver is still with you, and only pay
          once you are happy with the condition it has arrived in.
        </p>
        <p>
          If you spot transit damage afterwards, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with photographs as soon as you
          reasonably can. The sooner we see it the easier it is to settle — photographs taken on
          the day tell us things photographs taken in a fortnight cannot. That is a request, not a
          deadline: your rights under the Consumer Rights Act 2015 run for far longer than any
          window we could set, and nothing here shortens them.
        </p>
        <ul>
          <li>
            <strong>Minor, and the sofa is usable.</strong> We log an incident report with your
            photographs and recommend you carry on using it. That record stays on your order in
            case anything develops later.
          </li>
          <li>
            <strong>Considerable.</strong> We offer you a replacement.
          </li>
          <li>
            <strong>Beyond repair.</strong> We collect it and issue a full refund. There is no
            collection charge for faulty goods.
          </li>
        </ul>

        <h2 id="returns">Changing your mind</h2>
        <p>
          You can cancel at any point from placing your order until 14 days after it is delivered.
          That is your right under the Consumer Contracts Regulations, it applies whatever the
          reason, and you do not need to explain yourself to us.
        </p>
        <p>
          <strong>To cancel, just tell us.</strong> Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, call{' '}
          <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>, or write to us at {ADDRESS_LINE}. Any clear
          statement will do — the form below exists because the Regulations say we have to offer
          you one, not because you have to use it.
        </p>
        <p>
          Once you have cancelled you have a further 14 days to send the sofa back. For a
          change-of-mind return you arrange and pay for the return carriage. Sofas are large and
          awkward, so it is worth getting a quote before you commit — this is the part people are
          usually surprised by. It is also the one real difference from a faulty item, which we
          collect ourselves, free.
        </p>
        <p>
          <strong>Your refund.</strong> We refund within 14 days of the sofa reaching us, or of you
          showing us it has been sent, whichever happens first. Please send it back in the
          condition it reached you in: we can reduce the refund to reflect any loss in value caused
          by handling beyond what you would have been able to do in a shop, and if we do that we
          will tell you the amount and why.
        </p>

        <h2 id="cancellation-form">Model cancellation form</h2>
        <p className="fine">
          Complete and return this form only if you wish to withdraw from the contract. You do not
          have to use it.
        </p>
        <div className="my-6 rounded-md border border-calico-300 bg-calico-100 p-5 sm:p-7">
          <p className="m-0 text-body-sm leading-relaxed text-ink-700">
            To UK Sofa Shop, {ADDRESS_LINE} — <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>:
          </p>
          <p className="mt-4 text-body-sm leading-relaxed text-ink-700">
            I/We hereby give notice that I/We cancel my/our contract of sale of the following
            goods:
          </p>
          {/* Written as lines rather than a <ul>: the editorial prose styles
              put a bullet on every list item, and a bulleted form reads as a
              set of options rather than a set of blanks to fill in. */}
          <div className="mt-4 space-y-3 text-body-sm leading-relaxed text-ink-500">
            {[
              'Ordered on / received on',
              'Order reference',
              'Name of consumer(s)',
              'Address of consumer(s)',
              'Signature of consumer(s) (only if this form is notified on paper)',
              'Date',
            ].map(label => (
              <div key={label}>
                {label}:{' '}
                <span aria-hidden="true" className="inline-block w-full border-b border-calico-300 align-baseline" />
              </div>
            ))}
          </div>
        </div>

        <h2 id="bespoke">Sofas built to your specification</h2>
        <p>{CANCELLATION.test}</p>
        <p>
          The reason for the exemption is that a sofa made to your own choices cannot be sold to
          anybody else. We tell you this at the checkout, on the order itself, before you commit.
        </p>
        <p className="fine">
          Faulty items built to your specification are covered exactly as everything else is. The
          exemption is about changing your mind, not about our responsibility for the thing we
          built.
        </p>

        <hr />

        <p>
          Not sure about something? Ask before you order — especially about access, upstairs
          delivery, or whether a particular sofa will fit.{' '}
          <Link href="/contact">Send us a message</Link> or email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </EditorialLayout>
    </div>
  )
}
