// src/components/Season/SeasonalLanding.tsx
//
// The Black Friday and Christmas pages (15 Nov 2026 redesign): product-led, in
// the shop's own look, instead of two long articles. Server component: every
// figure on it is read from Admin -> Settings, constants/promises.ts or the
// products themselves, so it can never say something checkout does not do.
//
// Order of the page, and why:
//   1. a hero with the real thing to do (shop the made-to-order range / check
//      Christmas delivery), the visitor's own offer if they hold one, and the
//      date;
//   2. real made-to-order sofas with their real prices (seasonProducts.ts);
//   3. the way in (browse, or ask), as two plain choices;
//   4. the rules, folded away and AFTER the products: how the offer works,
//      or how Christmas timing works.
//
// Honesty rules (see utils/seasonal.ts):
//   - Black Friday is a DATE here. A separate Black Friday sale has not been
//     announced, so the page describes the offer that IS real (the visitor's
//     own, with its own deadline). No was-price, no percentage, no stock
//     count, no timer of our own, no "£50 off" headline. The sofas shown carry
//     no reference price at all.
//   - Christmas: no cut-off date and no guarantee. The customer is invited to
//     ask for the date for their sofa and postcode.
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ChevronDown, MessageCircle, PackageCheck, Truck } from 'lucide-react'
import ProductCard from '@/components/Product/ProductCard'
import WhatsAppLink from '@/components/UI/WhatsAppLink'
import SeasonalSnow from '@/components/Season/SeasonalSnow'
import YourOfferChip from '@/components/Season/YourOfferChip'
import { DELIVERY_CHARGE_NOTE, PROMISES } from '@/constants/promises'
import { blurDataURL } from '@/utils/cloudinary'
import { OFFER_ALIAS_CODES, OFFER_PUBLIC_CODE } from '@/utils/offers/constants'
import type { SeasonProduct, SeasonShape } from '@/utils/seasonProducts'
import type { ShopSettings } from '@/utils/shopSettings'
import { BLACK_FRIDAY, CHRISTMAS_DAY, CYBER_MONDAY, MADE_TO_ORDER_HREF, daysUntil } from '@/utils/seasonal'

const gbp = (n: number) => `£${Number(n).toLocaleString('en-GB')}`
const longDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })

const SHAPE_LABEL: Record<SeasonShape, string> = {
  family: 'Family set', u_shape: 'U-shape', corner: 'Corner sofa', three_two: '3 + 2 set', other: '',
}

function Countdown({ target, label }: { target: string; label: string }) {
  const days = daysUntil(target, new Date())
  if (days < 0) return null
  return (
    <p className="m-0 inline-flex items-center gap-2 rounded-pill border border-calico-50/20 bg-calico-50/5 px-4 py-2 text-body-sm font-semibold text-calico-50">
      <CalendarDays className="h-4 w-4 text-ember-300" aria-hidden="true" />
      {days === 0 ? `${label} is today` : `${days} ${days === 1 ? 'day' : 'days'} to ${label}`}
    </p>
  )
}

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
  kind, settings, products,
}: { kind: 'black_friday' | 'christmas'; settings: ShopSettings; products: SeasonProduct[] }) {
  const { tierAmounts, offerWindowHours, offerMinPrice } = settings
  const christmas = kind === 'christmas'
  const tiers = [tierAmounts.STANDARD, tierAmounts.ROMA, tierAmounts.ELECTRIC].filter(n => n > 0)
  const tierList = tiers.length ? tiers.map(gbp).join(', ') : ''
  const lead = products[0]

  return (
    <>
      {/* ── 1. Hero ───────────────────────────────────────────────────── */}
      <header data-ground="dark" className="grain relative isolate overflow-hidden bg-ink-900 pb-12 pt-28 sm:pb-16 lg:pt-32">
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_20%,rgba(212,135,26,0.16),transparent_70%)]" />
        <SeasonalSnow className="season-snow--quiet h-full" />
        <div className="relative mx-auto grid w-full max-w-shell items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-8">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="m-0 flex list-none items-center gap-2 p-0 font-data text-caption uppercase tracking-[0.1em] text-calico-300">
                <li><Link href="/" className="hover-link text-calico-300 no-underline">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-calico-50">{christmas ? 'Christmas' : 'Black Friday'}</li>
              </ol>
            </nav>
            <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-300">
              {christmas ? `Christmas · ${longDate(CHRISTMAS_DAY)}` : `${longDate(BLACK_FRIDAY)} · Cyber Monday ${longDate(CYBER_MONDAY).replace(/^\w+ /, '')}`}
            </p>
            <h1 className="m-0 mt-3 max-w-[16ch] font-display text-display-l font-semibold text-calico-50">
              {christmas ? 'Your favourite seat, ready for the moments that matter.' : 'Made-to-order sofas worth coming home to.'}
            </h1>
            <p className="m-0 mt-4 max-w-[48ch] text-lead text-calico-300">
              {christmas
                ? 'Built after you order, in the fabric and size you choose. Tell us the sofa and your postcode and we will say honestly whether it can arrive in time.'
                : 'Explore our sofas and check the price for the style you like. Free delivery to most of the UK, pay on delivery.'}
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href={MADE_TO_ORDER_HREF}
                className="hover-btn sheen btn-ember group inline-flex h-14 items-center justify-center gap-3 rounded-pill bg-ember-500 px-8 text-body font-semibold text-ink-900 no-underline"
              >
                Shop made-to-order sofas
                <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              {christmas ? (
                <WhatsAppLink
                  message="Hello, I would like to check Christmas delivery. The sofa is: [sofa name]. My postcode is: [postcode]."
                  pageContext="seasonal_christmas"
                  className="glass-dark-panel hover-btn hover-btn-dark inline-flex h-14 items-center justify-center gap-2 rounded-pill px-7 text-body font-medium text-calico-50 no-underline"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> Check Christmas delivery<span className="hidden sm:inline">&nbsp;for my sofa</span>
                </WhatsAppLink>
              ) : (
                <Link href="/christmas" className="glass-dark-panel hover-btn hover-btn-dark inline-flex h-14 items-center justify-center gap-2 rounded-pill px-7 text-body font-medium text-calico-50 no-underline">
                  <Truck className="h-5 w-5" aria-hidden="true" /> Christmas delivery
                </Link>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <YourOfferChip />
              {christmas
                ? <Countdown target={CHRISTMAS_DAY} label="Christmas Day" />
                : <Countdown target={BLACK_FRIDAY} label="Black Friday" />}
            </div>
          </div>

          {lead && (
            <Link
              href={lead.href}
              className="group relative hidden aspect-[4/5] w-full max-w-md justify-self-end overflow-hidden rounded-lg bg-calico-100 ring-1 ring-calico-50/15 lg:block"
              aria-label={`${lead.title}, ${gbp(lead.price)}`}
            >
              <Image
                src={lead.image}
                alt={`${lead.title} sofa`}
                fill
                priority
                sizes="(max-width: 1024px) 0px, 420px"
                placeholder="blur"
                blurDataURL={blurDataURL(lead.image)}
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-ink-900/90 px-4 py-3 text-calico-50">
                <span className="font-display text-h4 font-semibold">{lead.title}</span>
                <span className="shrink-0 font-data text-body tabular-nums">{gbp(lead.price)}</span>
              </span>
            </Link>
          )}
        </div>
      </header>

      {/* ── 2. The sofas ──────────────────────────────────────────────── */}
      {products.length > 0 && (
        <section aria-labelledby="season-range" className="grad-calico grain-light relative bg-calico-50 py-14 sm:py-20">
          <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0 max-w-2xl">
                <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-700">Made to order in the UK</p>
                <h2 id="season-range" className="m-0 mt-2 font-display text-h2 font-semibold text-ink-900">
                  {christmas ? 'Family seating, U-shapes and corners.' : 'Start with the shape that fits your room.'}
                </h2>
              </div>
              <Link href={MADE_TO_ORDER_HREF} className="hover-link inline-flex items-center gap-2 text-body-sm font-semibold text-ink-900 no-underline">
                See all made-to-order sofas <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  slug={p.slug}
                  price={p.price}
                  href={p.href}
                  image={p.image}
                  badges={[SHAPE_LABEL[p.shape]].filter(Boolean)}
                  delayMs={i * 40}
                />
              ))}
            </div>
            <p className="m-0 mt-5 text-caption text-ink-500">
              Prices are the sofa&apos;s price in its first colour. Your own offer, if you have one, is taken off at checkout and shown beside the price on each sofa.
            </p>
          </div>
        </section>
      )}

      {/* ── 3. The way in ─────────────────────────────────────────────── */}
      <section aria-label="Next steps" className="bg-calico-100 py-12 sm:py-16">
        <div className="mx-auto grid max-w-shell gap-4 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <Link href={MADE_TO_ORDER_HREF} className="flex min-h-28 items-center gap-4 rounded-md border border-calico-300 bg-white p-5 text-ink-900 no-underline hover:bg-calico-50">
            <PackageCheck className="h-7 w-7 shrink-0 text-ember-700" aria-hidden="true" />
            <span>
              <span className="block font-display text-h4 font-semibold">Browse the made-to-order range</span>
              <span className="block text-body-sm text-ink-700">Choose your fabric, size and shape. Every sofa is built after you order.</span>
            </span>
          </Link>
          {christmas ? (
            <WhatsAppLink
              message="Hello, I would like to check Christmas delivery. The sofa is: [sofa name]. My postcode is: [postcode]."
              pageContext="seasonal_christmas"
              className="flex min-h-28 items-center gap-4 rounded-md border border-calico-300 bg-white p-5 text-ink-900 no-underline hover:bg-calico-50"
            >
              <MessageCircle className="h-7 w-7 shrink-0 text-[#128C7E]" aria-hidden="true" />
              <span>
                <span className="block font-display text-h4 font-semibold">Ask about Christmas arrival</span>
                <span className="block text-body-sm text-ink-700">Send the sofa and your postcode. We reply with an honest answer.</span>
              </span>
            </WhatsAppLink>
          ) : (
            <Link href="/christmas" className="flex min-h-28 items-center gap-4 rounded-md border border-calico-300 bg-white p-5 text-ink-900 no-underline hover:bg-calico-50">
              <Truck className="h-7 w-7 shrink-0 text-ember-700" aria-hidden="true" />
              <span>
                <span className="block font-display text-h4 font-semibold">Planning for Christmas?</span>
                <span className="block text-body-sm text-ink-700">How timing works for a made-to-order sofa, and how to check yours.</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* ── 4. The rules, folded ──────────────────────────────────────── */}
      <section aria-label="Good to know" className="bg-calico-50 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6">
          {christmas ? (
            <>
              <Fold title="How Christmas delivery timing works">
                <p className="m-0">{PROMISES.delivery.timingLong}</p>
                <p className="m-0">
                  Made-to-order sofas are built after you order, so the date depends on the sofa, the fabric and your postcode. That is why we
                  do not publish one Christmas cut-off for everything.
                </p>
                <p className="m-0 font-semibold text-ink-900">
                  We will not tell you a sofa will arrive before Christmas until we have checked it for your postcode, and we have not
                  confirmed delivery on 24, 25 or 26 December itself.
                </p>
              </Fold>
              <Fold title="Delivery and payment">
                <ul className="m-0 list-disc space-y-1 pl-5">
                  <li>{PROMISES.delivery.long}</li>
                  <li>{DELIVERY_CHARGE_NOTE}</li>
                  <li>{PROMISES.payment.long}</li>
                  <li>{PROMISES.delivery.deliveryDays}</li>
                </ul>
              </Fold>
            </>
          ) : (
            <>
              <Fold title="How your online offer works">
                <p className="m-0">
                  Every visitor has a personal online offer on eligible sofas{tierList ? ` (${tierList} off, depending on the sofa)` : ''}. On a sofa&apos;s page it reads
                  like &ldquo;£20 off this sofa with {OFFER_PUBLIC_CODE}&rdquo;, beside the price you pay and the time it ends.
                </p>
                <ul className="m-0 list-disc space-y-1 pl-5">
                  <li>Your offer lasts <strong>{offerWindowHours} hours</strong> from your first visit.</li>
                  <li>That window is fixed: it does not restart when it ends, and visiting again does not extend it.</li>
                  <li>It applies to sofas priced {gbp(offerMinPrice)} or more, and some sofas are not included. If a sofa has no offer, its page shows none.</li>
                  <li>The saving is taken off automatically at checkout, so the price you see on the sofa is the price you pay.</li>
                  <li>
                    {OFFER_ALIAS_CODES.join(' and ')} are accepted as the same code. There is one offer and one discount per order, however the code is typed.
                  </li>
                </ul>
              </Fold>
              <Fold title="What has not been announced">
                <p className="m-0">
                  A separate Black Friday sale has not been announced. If one is added it will appear on this page with its start and end
                  date and the exact saving. Sofas whose price has not changed will not show a crossed-out price.
                </p>
              </Fold>
              <Fold title="Delivery and payment">
                <ul className="m-0 list-disc space-y-1 pl-5">
                  <li>{PROMISES.delivery.long}</li>
                  <li>{DELIVERY_CHARGE_NOTE}</li>
                  <li>{PROMISES.payment.long}</li>
                </ul>
              </Fold>
            </>
          )}
          <p className="m-0 pt-3 text-body-sm text-ink-700">
            <Link href="/delivery-returns">Delivery and returns</Link> · <Link href={christmas ? '/black-friday' : '/christmas'}>{christmas ? 'How our offers work' : 'Christmas delivery'}</Link>
          </p>
        </div>
      </section>
    </>
  )
}
