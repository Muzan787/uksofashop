// src/components/Season/SeasonalLanding.tsx
//
// The Black Friday and Christmas pages. Server component: every figure on it
// is read from Admin -> Settings or from constants/promises.ts, so it can
// never say something checkout does not do.
//
// Honesty rules (see utils/seasonal.ts):
//   - Black Friday is a DATE here. A separate Black Friday sale has not been
//     announced, so the page explains the offer that IS real (the visitor's
//     own, with its own deadline) and what will happen if a sale is added.
//   - No was-price, no percentage, no stock count, no countdown of our own.
//   - Christmas: no cut-off date and no guarantee. The customer is invited to
//     ask for the date for their sofa and postcode.
import Link from 'next/link'
import { CalendarDays, MessageCircle, PackageCheck, Truck } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout, { Note } from '@/components/Editorial/EditorialLayout'
import WhatsAppLink from '@/components/UI/WhatsAppLink'
import SeasonalSnow from '@/components/Season/SeasonalSnow'
import { DELIVERY_CHARGE_NOTE, PROMISES } from '@/constants/promises'
import type { ShopSettings } from '@/utils/shopSettings'
import { BLACK_FRIDAY, CHRISTMAS_DAY, CYBER_MONDAY, daysUntil } from '@/utils/seasonal'

const gbp = (n: number) => `£${Number(n).toLocaleString('en-GB')}`
const longDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })

function Countdown({ target, label }: { target: string; label: string }) {
  const days = daysUntil(target, new Date())
  if (days < 0) return null
  return (
    <p className="m-0 inline-flex items-center gap-2 rounded-pill border border-calico-300 bg-calico-100 px-4 py-2 text-sm font-semibold text-ink-900">
      <CalendarDays className="h-4 w-4 text-ember-700" aria-hidden="true" />
      {days === 0 ? `${label} is today` : `${days} ${days === 1 ? 'day' : 'days'} to ${label}`}
    </p>
  )
}

export default function SeasonalLanding({ kind, settings }: { kind: 'black_friday' | 'christmas'; settings: ShopSettings }) {
  const { tierAmounts, offerWindowHours, offerMinPrice } = settings
  const tiers = [tierAmounts.STANDARD, tierAmounts.ROMA, tierAmounts.ELECTRIC].filter(n => n > 0)
  const tierList = tiers.length ? tiers.map(gbp).join(', ') : ''

  if (kind === 'christmas') {
    return (
      <>
        <EditorialHero
          eyebrow={`Christmas · ${longDate(CHRISTMAS_DAY)}`}
          title="Christmas delivery: ask for your date"
          lede="We would rather tell you the truth than promise a date we cannot keep. Here is how timing works and how to check yours."
          breadcrumb={[{ label: 'Home', href: '/' }]}
          decoration={<SeasonalSnow className="h-full" />}
          meta={<Countdown target={CHRISTMAS_DAY} label="Christmas Day" />}
        />
        <div>
          <EditorialLayout>
            <h2>How delivery timing works</h2>
            <p>{PROMISES.delivery.timingLong}</p>
            <p>
              Made-to-order sofas are built after you order, in the fabric and size you choose, so they have a longer lead time than a
              sofa that is ready to go. That is why the date depends on the sofa, the fabric and your postcode, and why we do not
              publish one Christmas cut-off for everything.
            </p>
            <Note title="What we will not do">
              We will not tell you a sofa will arrive before Christmas until we have checked it for your postcode. We have not
              confirmed delivery on 24, 25 or 26 December itself, so please ask if you need those days.
            </Note>
            <h2>Check your date</h2>
            <p>
              Message us the sofa you like, the fabric if you have chosen one, and your postcode. We will reply with an honest
              answer: whether it can arrive in time, and when.
            </p>
            <p className="not-prose">
              <WhatsAppLink
                message="Hello, I would like to check Christmas delivery. The sofa is: [sofa name]. My postcode is: [postcode]."
                pageContext="seasonal_christmas"
                className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#128C7E] px-5 py-3 text-base font-bold text-white no-underline hover:bg-[#0e7469]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" /> Check my Christmas delivery date
              </WhatsAppLink>
            </p>
            <h2>Delivery and payment, as always</h2>
            <ul>
              <li>{PROMISES.delivery.long}</li>
              <li>{DELIVERY_CHARGE_NOTE}</li>
              <li>{PROMISES.payment.long}</li>
              <li>{PROMISES.delivery.deliveryDays}</li>
            </ul>
            <p><Link href="/collection">Browse the sofas</Link> · <Link href="/delivery-returns">Delivery and returns</Link> · <Link href="/black-friday">How our offers work</Link></p>
          </EditorialLayout>
        </div>
      </>
    )
  }

  return (
    <>
      <EditorialHero
        eyebrow={`${longDate(BLACK_FRIDAY)} · Cyber Monday ${longDate(CYBER_MONDAY).replace(/^\w+ /, '')}`}
        title="Black Friday at UK Sofa Shop"
        lede="What is genuinely on, what is not, and how we show prices. No invented was-prices and no timer we can reset."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        decoration={<SeasonalSnow className="h-full" />}
        meta={<Countdown target={BLACK_FRIDAY} label="Black Friday" />}
      />
      <div>
        <EditorialLayout>
          <h2>What is on today</h2>
          <p>
            Every visitor has a personal online offer on eligible sofas{tierList ? `: ${tierList} off, depending on the sofa` : ''}. On a sofa&apos;s page it reads
            like “£30 off this sofa with SOFAEXTRA”, beside the price you pay and the time it ends.
          </p>
          <ul>
            <li>Your offer lasts <strong>{offerWindowHours} hours</strong> from your first visit.</li>
            <li>That window is fixed: it does not restart when it ends, and visiting again does not extend it.</li>
            <li>It applies to sofas priced {gbp(offerMinPrice)} or more, and some sofas are not included. If a sofa has no offer, its page shows none.</li>
            <li>The saving is taken off automatically at checkout, so the price you see on the sofa is the price you pay.</li>
          </ul>
          <Note title="What has not been announced">
            A separate Black Friday sale has not been announced. If one is added it will appear on this page with its start and end
            date and the exact saving. Sofas whose price has not changed will not show a crossed-out price.
          </Note>
          <h2>Delivery and payment</h2>
          <ul>
            <li>{PROMISES.delivery.long}</li>
            <li>{DELIVERY_CHARGE_NOTE}</li>
            <li>{PROMISES.payment.long}</li>
          </ul>
          <div className="not-prose grid gap-3 sm:grid-cols-2">
            <Link href="/collection" className="flex min-h-14 items-center gap-3 rounded-sm border border-calico-300 bg-white p-4 font-semibold text-ink-900 no-underline hover:bg-calico-100">
              <PackageCheck className="h-5 w-5 text-ember-700" aria-hidden="true" /> Browse the sofas
            </Link>
            <Link href="/christmas" className="flex min-h-14 items-center gap-3 rounded-sm border border-calico-300 bg-white p-4 font-semibold text-ink-900 no-underline hover:bg-calico-100">
              <Truck className="h-5 w-5 text-ember-700" aria-hidden="true" /> Christmas delivery
            </Link>
          </div>
        </EditorialLayout>
      </div>
    </>
  )
}
