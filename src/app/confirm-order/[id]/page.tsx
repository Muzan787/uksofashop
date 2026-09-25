// src/app/confirm-order/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  StickyNote,
  Truck,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import ConfirmOrderForm from './ConfirmOrderForm'
import Timeline from '@/components/UI/Timeline'
import { STATUS } from '@/utils/orderStatus'
import { describeFinish, finishText } from '@/utils/orderFinish'
import { asBuildSnapshot, describeBuild } from '@/types/build'
import { formatPreferredDeliveryDate } from '@/utils/delivery'
import { PHONE_DISPLAY, PHONE_HREF, whatsAppHref } from '@/constants/contact'
import type { ConfirmationOrder, ConfirmationOrderItem } from '@/types/orders'

export const metadata: Metadata = {
  title: 'Confirm your order',
  description: 'Check the details of your order and confirm it.',
  robots: { index: false, follow: false },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const money = (n: number) => `£${Number(n ?? 0).toFixed(2)}`

/**
 * The link the customer gets on WhatsApp and in their order email.
 *
 * IT USED TO CONFIRM THE ORDER BY BEING OPENED. Muaz's brief (2026-09-25):
 * show them everything on the order first, and confirm only when they press a
 * button at the end of it. Two reasons that is the right shape:
 *
 *   1. A confirmation should mean the customer read the order. The address,
 *      the fabric, the day, the amount to have ready — if the confirmation is
 *      given before any of that is on screen then it confirms nothing that was
 *      checked, and a wrong fabric or a wrong postcode is found on the van.
 *   2. A GET must not change anything. Mail providers, corporate security
 *      appliances and WhatsApp's own link preview all fetch every URL in a
 *      message, so on the old flow an order could be confirmed before the
 *      customer had opened the chat. Same argument that makes the newsletter
 *      double opt-in a POST; see actions/newsletter-confirm.ts.
 *
 * So the page reads with order_for_confirmation, which only reads, and the
 * button posts to confirmCustomerOrder, which calls the unchanged confirm_order.
 *
 * The admin route is untouched: "Confirm order" on the order card still moves
 * pending_cod -> confirmed through updateOrderStatus, whether or not the
 * customer ever opens this page. Whichever happens first, both paths stamp
 * confirmed_at once and never move it, so the business-event time stays the
 * first confirmation and this page is safe to open again afterwards.
 *
 * No advertising conversion fires here, deliberately. See the note on
 * trackAdsOrderPlaced in utils/tracking.ts: a browser event at this point has
 * no reliable ad click context — it is whichever device happened to open an
 * email — so Google's confirmed signal is staged server-side instead, for an
 * offline-conversion import an admin sends explicitly.
 */
export default async function ConfirmOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ confirmed?: string }>
}) {
  const { id } = await params
  const { confirmed: confirmedParam } = await searchParams

  // Checked here rather than left to the database: a malformed id makes the
  // RPC raise, and a raise would be a 500 where this is plainly a 404.
  if (!UUID.test(id)) return notFound()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('order_for_confirmation', { p_order_id: id })

  if (error) {
    console.error('order_for_confirmation failed', error)
    throw new Error('Could not load that order')
  }
  if (!data) return notFound()

  const order = data as unknown as ConfirmationOrder
  const status = order.status ?? 'pending_cod'
  const reference = order.id.substring(0, 8).toUpperCase()
  const firstName = (order.customer_name || '').trim().split(/\s+/)[0] || 'there'

  const awaiting = status === 'pending_cod'
  const cancelled = status === 'cancelled'
  const justConfirmed = confirmedParam === '1' && !awaiting && !cancelled

  const cfg = STATUS[status] ?? STATUS.pending_cod

  const itemsSubtotal = Number(order.items_subtotal ?? order.total_amount ?? 0)
  const discount = Number(order.discount_amount ?? 0)
  const upstairs = Number(order.fee_upstairs ?? 0)
  const assembly = Number(order.fee_assembly ?? 0)
  const removal = Number(order.fee_sofa_removal ?? 0)
  const deliveryTotal = Number(order.delivery_total ?? 0)
  // A website order itemises its delivery extras and they sum to the total. A
  // WhatsApp order, and any order whose charge an admin has since overwritten,
  // carries one agreed figure with the itemisation cleared — so whatever the
  // extras do not account for is shown as a single delivery line rather than
  // quietly left out of a breakdown that is meant to add up to the total.
  const unitemisedDelivery = Math.max(0, deliveryTotal - (upstairs + assembly + removal))

  const trackHref = `/track-order?ref=${encodeURIComponent(reference)}`
  const queryHref = whatsAppHref(
    awaiting
      ? `Hi, about my order #${reference} — `
      : `Hi, I have a query about my order #${reference}.`,
  )

  // No masthead of its own. The page sits inside MainLayoutWrapper like every
  // other storefront route, so the site header is already above it — and a
  // second wordmark under the first is the thing /track-order gets wrong, not
  // a thing to copy.
  return (
    <div className="min-h-screen bg-calico-50">
      <div className="mx-auto max-w-[640px] px-4 pb-24 pt-10 sm:pt-14">
        {/* ── What this page is ─────────────────────────────────────────── */}
        <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-ember-700">
          {awaiting ? 'One last step' : cancelled ? 'Cancelled order' : 'Confirmed'}
        </p>

        <h1 className="m-0 mt-3 font-display text-h1 font-semibold leading-[1.05] text-ink-900">
          {awaiting
            ? 'Please check your order'
            : cancelled
              ? 'This order was cancelled'
              : justConfirmed
                ? `Thank you, ${firstName}`
                : 'Your order is confirmed'}
        </h1>

        <p className="m-0 mt-4 max-w-[46ch] text-body leading-relaxed text-ink-500">
          {awaiting ? (
            <>
              Everything we have for order{' '}
              <span className="font-data font-semibold tabular-nums text-ink-900">#{reference}</span>{' '}
              is below. Have a read, and if it is all right, confirm it at the bottom. Nothing is
              charged by confirming — we then ring you to arrange a delivery day.
            </>
          ) : cancelled ? (
            <>
              Order{' '}
              <span className="font-data font-semibold tabular-nums text-ink-900">#{reference}</span>{' '}
              is no longer live, so there is nothing to confirm. If that was not intended, message
              us and we will put it back.
            </>
          ) : justConfirmed ? (
            <>
              That is order{' '}
              <span className="font-data font-semibold tabular-nums text-ink-900">#{reference}</span>{' '}
              confirmed. One of our team will ring you to arrange a delivery day, usually the same
              working day.
            </>
          ) : (
            <>
              Order{' '}
              <span className="font-data font-semibold tabular-nums text-ink-900">#{reference}</span>{' '}
              is already confirmed, so there is nothing more to do here. Below is what we have.
            </>
          )}
        </p>

        {/* Where it has got to. Not drawn while the order is still waiting to
            be confirmed: the timeline starts AT confirmed, and showing it with
            nothing lit would suggest the order is already moving. */}
        {!awaiting && !cancelled && (
          <div className="mt-8 rounded-md border border-calico-300 bg-calico-100 px-4 py-5">
            <Timeline current={cfg.stage} pulse={cfg.stage > 0 && cfg.stage < 3} />
            <p className="m-0 mt-5 text-center text-body-sm leading-relaxed text-ink-500">
              {cfg.note}
            </p>
          </div>
        )}

        {/* ── Where it is going ─────────────────────────────────────────── */}
        <Section title="Where it is going" icon={Truck}>
          <Row icon={MapPin} label="Delivery address">
            {/* Stored as one line with the postcode on the end. Printed whole,
                because a customer checking their own address reads it as they
                wrote it. */}
            <span className="whitespace-pre-line">{order.shipping_address}</span>
          </Row>
          <Row icon={Phone} label="Name and number">
            {order.customer_name}
            <span className="block font-data tabular-nums">{order.customer_phone}</span>
            {order.customer_email && (
              <span className="block break-words text-ink-500">{order.customer_email}</span>
            )}
          </Row>
          <Row icon={CalendarDays} label="Delivery day">
            {order.preferred_delivery_date ? (
              <>
                {formatPreferredDeliveryDate(order.preferred_delivery_date)}
                <span className="mt-0.5 block text-caption font-normal text-ink-500">
                  What you asked for at checkout. We agree the time slot when we ring.
                </span>
              </>
            ) : (
              <>
                As soon as possible
                <span className="mt-0.5 block text-caption font-normal text-ink-500">
                  We will offer you the earliest day we have.
                </span>
              </>
            )}
          </Row>
          {order.special_instructions?.trim() && (
            <Row icon={StickyNote} label="Your notes">
              <span className="whitespace-pre-line">{order.special_instructions.trim()}</span>
            </Row>
          )}
        </Section>

        {/* ── What is on it ─────────────────────────────────────────────── */}
        <Section title="What you ordered">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {order.order_items.map((item: ConfirmationOrderItem, i: number) => {
              // "Fabric" only when one was actually chosen. describeFinish
              // returns a code for a made-to-order line and nothing but the
              // variant's colourway for a stocked one, and calling a
              // photographed colourway a fabric is how somebody ends up
              // expecting grey chenille. See utils/orderFinish.ts.
              const chose = describeFinish({ ...item, color: item.color }).code !== null
              const finish = finishText({ ...item, color: item.color })
              const build = describeBuild(asBuildSnapshot(item.customisation))

              return (
                <li key={i} className="rounded-sm bg-calico-100 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 min-w-0 text-body font-semibold leading-snug text-ink-900">
                      <span className="mr-2 font-data tabular-nums text-ember-700">
                        {item.quantity}×
                      </span>
                      {item.title ?? 'Sofa'}
                    </p>
                    <p className="m-0 shrink-0 font-data text-body font-semibold tabular-nums text-ink-900">
                      {money(Number(item.price_at_time_of_purchase) * Number(item.quantity))}
                    </p>
                  </div>

                  {finish && (
                    <p className="m-0 mt-1.5 text-body-sm text-ink-500">
                      <span className="text-ink-700">{chose ? 'Fabric' : 'Colour'}</span> · {finish}
                    </p>
                  )}

                  {build.length > 0 && (
                    <dl className="m-0 mt-2.5 flex flex-col gap-1 border-t border-calico-300 pt-2.5">
                      {build.map(line => (
                        <div key={line.label} className="flex flex-wrap gap-x-2 text-caption">
                          <dt className="m-0 text-ink-500">{line.label}</dt>
                          <dd className="m-0 font-medium text-ink-900">{line.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>

          {order.has_made_to_order && (
            <p className="m-0 mt-3 rounded-sm border-l-2 border-ember-500 bg-ember-500/8 px-3.5 py-2.5 text-caption leading-relaxed text-ink-700">
              Made to order in the fabric you chose, so it is built for you rather than picked off a
              shelf. We will tell you the build time on the call.
            </p>
          )}
        </Section>

        {/* ── The money ─────────────────────────────────────────────────── */}
        <section className="mt-5 rounded-md bg-ink-900 px-5 py-5">
          <h2 className="m-0 flex items-center gap-2 font-data text-eyebrow uppercase tracking-[0.16em] text-calico-300">
            <CircleDollarSign aria-hidden="true" className="h-3.5 w-3.5 text-ember-300" />
            {status === 'delivered'
              ? 'What you paid'
              : cancelled
                ? 'What it came to'
                : 'To have ready on the day'}
          </h2>

          <div className="mt-4 flex flex-col gap-2">
            <Money label="Your sofa" value={itemsSubtotal} />
            {discount > 0 && (
              <div className="flex items-baseline justify-between gap-4 text-body-sm text-calico-300">
                <span>Offer{order.promotion_code ? ` · ${order.promotion_code}` : ''}</span>
                <span className="font-data tabular-nums text-sage-300">−{money(discount)}</span>
              </div>
            )}
            {upstairs > 0 && (
              <Money
                label={`Upstairs delivery${
                  order.delivery_has_lift
                    ? ' (lift)'
                    : order.delivery_floor
                      ? ` (floor ${order.delivery_floor})`
                      : ''
                }`}
                value={upstairs}
              />
            )}
            {assembly > 0 && <Money label="Assembly in the room" value={assembly} />}
            {removal > 0 && (
              <Money
                label={`Old sofa taken away${
                  order.sofa_removal_seats
                    ? ` (${order.sofa_removal_seats} seat${order.sofa_removal_seats === 1 ? '' : 's'})`
                    : ''
                }`}
                value={removal}
              />
            )}
            {unitemisedDelivery > 0 && <Money label="Delivery" value={unitemisedDelivery} />}
            {deliveryTotal === 0 && <Money label="Delivery" value={0} free />}

            <span aria-hidden="true" className="my-1.5 h-px bg-calico-50/12" />

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-body font-semibold text-calico-50">
                {status === 'delivered'
                  ? 'Paid on delivery'
                  : cancelled
                    ? 'Order total'
                    : 'Due on delivery'}
              </span>
              {/* Ember 300 rather than Ember 700: the dark ember is 2.4:1 on ink. */}
              <span className="font-data text-h2 font-bold leading-none tabular-nums text-ember-300">
                {money(order.total_amount)}
              </span>
            </div>
          </div>

          {!cancelled && (
            <p className="m-0 mt-4 text-caption leading-relaxed text-calico-300">
              Cash or bank transfer, paid to the delivery team at the door once the sofa is inside
              and you have looked at it. We do not take cards.
            </p>
          )}
        </section>

        {/* ── The decision ──────────────────────────────────────────────── */}
        {awaiting && (
          <section className="mt-8 rounded-md border-2 border-ember-500 bg-calico-100 px-5 py-6">
            <h2 className="m-0 flex items-center gap-2 font-display text-h3 font-semibold text-ink-900">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-ember-700" />
              Is that all correct?
            </h2>
            <p className="m-0 mt-2.5 text-body-sm leading-relaxed text-ink-500">
              Confirming tells us the address, the fabric and the amount above are right, and puts
              your order into our queue. It takes no payment.
            </p>

            <ConfirmOrderForm orderId={order.id} reference={reference} />

            <p className="m-0 mt-5 border-t border-calico-300 pt-4 text-body-sm leading-relaxed text-ink-500">
              Something to change — the fabric, the address, the day?{' '}
              <a
                href={queryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-link font-semibold text-ember-700 no-underline"
              >
                Message us on WhatsApp
              </a>{' '}
              or call{' '}
              <a href={PHONE_HREF} className="hover-link font-semibold text-ember-700 no-underline">
                {PHONE_DISPLAY}
              </a>{' '}
              and we will sort it before anything is made. Do not confirm until it is right.
            </p>
          </section>
        )}

        {cancelled && (
          <section className="mt-8 flex items-start gap-3 rounded-md border border-rust-700 bg-rust-50 px-5 py-5">
            <XCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rust-700" />
            <p className="m-0 text-body-sm leading-relaxed text-rust-700">
              There is nothing to confirm on a cancelled order. If you still want this sofa,{' '}
              <a
                href={queryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-rust-700 underline"
              >
                message us
              </a>{' '}
              or call {PHONE_DISPLAY} and we will start it again.
            </p>
          </section>
        )}

        {/* ── After it is confirmed ─────────────────────────────────────── */}
        {!awaiting && !cancelled && (
          <section className="mt-8">
            <div className="flex items-start gap-3 rounded-md border border-sage-700/25 bg-sage-50 px-5 py-4">
              <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sage-700" />
              <p className="m-0 text-body-sm leading-relaxed text-sage-700">
                {justConfirmed
                  ? 'Confirmed. Keep this page or your email — the reference above is all we need if you call.'
                  : 'This order is confirmed and in our queue. Nothing further is needed from you until we ring.'}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <a
                href={queryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-btn btn-whatsapp flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-sm px-6 font-data text-eyebrow font-bold uppercase tracking-[0.12em] text-ink-900 no-underline"
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                Any queries? WhatsApp us
              </a>
              <Link
                href={trackHref}
                className="hover-btn flex min-h-[52px] w-full items-center justify-center gap-2 rounded-sm border border-calico-300 bg-calico-100 px-6 font-data text-eyebrow font-bold uppercase tracking-[0.12em] text-ink-900 no-underline"
              >
                Track this order
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <p className="m-0 mt-4 text-center text-caption leading-relaxed text-ink-500">
              Tracking asks for the reference and your delivery postcode. Or call us on{' '}
              <a href={PHONE_HREF} className="hover-link font-semibold text-ember-700 no-underline">
                {PHONE_DISPLAY}
              </a>
              .
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

// ─── The parts ───────────────────────────────────────────────────────────────

type IconType = React.ComponentType<{ className?: string }>

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: IconType
  children: React.ReactNode
}) {
  return (
    <section className="mt-5 rounded-md border border-calico-300 bg-calico-50 px-5 py-5">
      <h2 className="m-0 mb-4 flex items-center gap-2 font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
        {Icon && <Icon className="h-3.5 w-3.5 text-ember-700" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: IconType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 border-b border-calico-300 py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-calico-100">
        <Icon className="h-4 w-4 text-ink-500" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-caption uppercase tracking-[0.08em] text-ink-500">{label}</p>
        <p className="m-0 mt-1 text-body-sm font-medium leading-relaxed text-ink-900">{children}</p>
      </div>
    </div>
  )
}

function Money({ label, value, free = false }: { label: string; value: number; free?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-body-sm text-calico-300">
      <span>{label}</span>
      <span className="font-data tabular-nums">
        {free ? <span className="text-sage-300">Free</span> : money(value)}
      </span>
    </div>
  )
}
