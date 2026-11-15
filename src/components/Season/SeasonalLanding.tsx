// src/components/Season/SeasonalLanding.tsx
//
// /black-friday and /christmas (Run 7 rebuild, owner request): the SAME
// collection architecture as /collection/made-to-order-sofas.
//   1. CollectionHero - the real compact collection hero (breadcrumb, eyebrow,
//      title, one-sentence standfirst, the summary line, the ember rule), with
//      quiet snow behind it and the seasonal offer strip under the summary;
//   2. RangeGrid - "Sold as a set / The ranges.", the real CollectionCard
//      collages, built by splitCollectionMembers from the Made-To-Order
//      collection's live rows, exactly as the collection page builds them;
//   3. the rules, folded, below the shopping.
// If the ranges cannot be read, a clear way to the collection instead of an
// empty grid. Imported products cannot appear: the rows are the Made-To-Order
// main collection's only.
//
// Claims: the £50 is shown only to a visitor holding a live window (the offer
// strip), and it is described as what it is - £50 off the CURRENT listed price
// of each made-to-order product, inside the visitor's 7-day window. No was-price, no
// "save £50 compared with" anything, no timer of our own, no Christmas
// delivery guarantee.
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import CollectionHero from '@/components/Collection/CollectionHero'
import RangeGrid from '@/components/Collection/RangeGrid'
import SeasonalSnow from '@/components/Season/SeasonalSnow'
import SeasonOfferStrip from '@/components/Season/SeasonOfferStrip'
import { DELIVERY_CHARGE_NOTE, PROMISES } from '@/constants/promises'
import { MTO_OFFER_AMOUNT } from '@/utils/offers/amount'
import { windowLabel } from '@/utils/offers/deadline'
import { priceAnchors } from '@/utils/collections'
import { mainCollectionSummaryLine, splitCollectionMembers, type MainCollectionMember } from '@/utils/mainCollections'
import type { ShopSettings } from '@/utils/shopSettings'
import { BLACK_FRIDAY, CHRISTMAS_DAY, CYBER_MONDAY, MADE_TO_ORDER_HREF } from '@/utils/seasonal'

const longDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })

/** A folded section: native <details>, so it works without JavaScript and by keyboard. */
function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-md border border-calico-300 bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-display text-h4 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-5 w-5 shrink-0 text-ember-700 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-3 px-5 pb-5 text-body-sm leading-relaxed text-ink-700">{children}</div>
    </details>
  )
}

export default function SeasonalLanding({
  kind, settings, members,
}: { kind: 'black_friday' | 'christmas'; settings: ShopSettings; members: MainCollectionMember[] }) {
  const christmas = kind === 'christmas'
  const { sets } = splitCollectionMembers(members)
  const active = members.filter(m => m.is_active !== false)
  const prices = active.filter(m => priceAnchors(m.title)).map(m => Number(m.base_price)).filter(n => Number.isFinite(n) && n > 0)
  const from = prices.length ? Math.min(...prices) : null
  const summary = active.length
    ? mainCollectionSummaryLine({ status: 'live', productCount: active.length, setCount: sets.length, fromPrice: from })
    : undefined
  const code = christmas ? 'CHRISTMAS' : 'BLACKFRIDAY'

  return (
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50">
      <CollectionHero
        eyebrow={christmas ? `Christmas · ${longDate(CHRISTMAS_DAY)}` : `Black Friday · ${longDate(BLACK_FRIDAY)}`}
        title={christmas ? 'Made-to-order sofas for Christmas' : 'Black Friday: made-to-order sofas'}
        standfirst={christmas
          ? 'Family sets, corners and U-shapes built to your size. Ask us for the delivery date for your postcode.'
          : 'Every range, built to your size in the fabric you choose, delivered free to most of the UK.'}
        summary={summary}
        trail={[
          { href: '/', label: 'Home' },
          { href: '/collection', label: 'Collections' },
          { href: MADE_TO_ORDER_HREF, label: 'Made-To-Order Sofas' },
          { label: christmas ? 'Christmas' : 'Black Friday' },
        ]}
        decoration={<SeasonalSnow className="season-snow--quiet h-full" />}
      >
        <SeasonOfferStrip kind={kind} />
      </CollectionHero>

      <div className="relative mx-auto max-w-shell px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-10">
        {sets.length > 0 ? (
          <RangeGrid id="ranges" sets={sets} label="Made-to-order ranges" />
        ) : (
          <section id="ranges" className="rounded-md border border-calico-300 bg-white p-6 text-center">
            <p className="m-0 font-display text-h4 font-semibold text-ink-900">The ranges are loading slowly right now.</p>
            <p className="m-0 mt-2 text-body-sm text-ink-700">Every made-to-order sofa is on the collection page.</p>
            <Link href={MADE_TO_ORDER_HREF} className="mt-4 inline-flex items-center gap-2 font-semibold text-ink-900">
              Open Made-To-Order Sofas <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        )}

        <section aria-label="Good to know" className="mx-auto mt-14 max-w-3xl space-y-3 lg:mt-20">
          <Fold title={`How the £${MTO_OFFER_AMOUNT} made-to-order offer works`}>
            <ul className="m-0 list-disc space-y-1 pl-5">
              <li>Inside your {windowLabel(settings.offerWindowHours)} offer window, every made-to-order sofa, set, chair and footstool has £{MTO_OFFER_AMOUNT} taken off its current listed price: £{MTO_OFFER_AMOUNT} for each one in your basket.</li>
              <li>Your window starts on your first visit and does not restart. Each sofa&apos;s page shows the price you pay and when your window ends.</li>
              <li>Use code {code}. BLACKFRIDAY, CHRISTMAS and SOFAEXTRA are the same offer: one offer, never added together.</li>
              <li>The £{MTO_OFFER_AMOUNT} is a voucher on today&apos;s listed price. It is not a comparison with any earlier price.</li>
              <li>Sofas outside the made-to-order collection keep their own offer, shown on their page.</li>
            </ul>
          </Fold>
          {christmas && (
            <Fold title="Christmas delivery timing">
              <p className="m-0">{PROMISES.delivery.timingLong}</p>
              <p className="m-0">Made-to-order sofas are built after you order, so the date depends on the sofa, the fabric and your postcode. We will not tell you a sofa will arrive before Christmas until we have checked it for your postcode, and we have not confirmed delivery on 24, 25 or 26 December.</p>
            </Fold>
          )}
          <Fold title="Delivery and payment">
            <ul className="m-0 list-disc space-y-1 pl-5">
              <li>{PROMISES.delivery.long}</li>
              <li>{DELIVERY_CHARGE_NOTE}</li>
              <li>{PROMISES.payment.long}</li>
            </ul>
          </Fold>
          <p className="m-0 pt-3 text-body-sm text-ink-700">
            <Link href={MADE_TO_ORDER_HREF}>All made-to-order sofas</Link> · <Link href="/delivery-returns">Delivery and returns</Link> · {christmas
              ? <Link href="/black-friday">Black Friday</Link>
              : <Link href="/christmas">Christmas delivery</Link>}
            {!christmas && <> · Cyber Monday is {longDate(CYBER_MONDAY)}</>}
          </p>
        </section>
      </div>
    </div>
  )
}
