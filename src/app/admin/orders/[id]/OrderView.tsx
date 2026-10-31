// src/app/admin/orders/[id]/OrderView.tsx
//
// One order, on its own page (admin upgrade E1-E13): what the page shows,
// given what page.tsx loaded. Everything the old order card in the list
// showed is here, unchanged, plus the next step with its WhatsApp message,
// the order's history and notes, OrderFlow's answers, the review block and
// the corrections fold.
//
// Every button is a plain form that comes back to the page with a banner, so
// it works on any phone browser; the database checks every change itself.
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, Mail, MapPin, Phone, Radio, Truck, User } from 'lucide-react'
import Link from 'next/link'
import {
  addOrderNoteFromPage, changeOrderStatusFromPage, sendReviewEmailFromPage,
  sendToOrderFlowFromPage, setOrderSourceFromPage, setOrderTestFlagFromPage,
} from '@/app/actions/orders'
import type { OrderWithLines } from '../orderData'
import type { PickerFabric, PickerVariant } from '../NewWhatsAppOrder'
import { OrderTags, StatusBadge, WhatsAppMark, money, shortCode } from '../OrderBits'
import CopyOrderButton from '../CopyOrderButton'
import DirectPrintButton from '../DirectPrintButton'
import DeleteOrderButton from '../DeleteOrderButton'
import EditOrderForm from '../EditOrderForm'
import MetaConversionButton from '../MetaConversionButton'
import ConfirmSubmit from '@/components/Admin/ConfirmSubmit'
import CopyTextButton from '@/components/Admin/CopyTextButton'
import { dualTime, dualTimeText } from '@/utils/adminTime'
import { ADMIN_STATUS_LABEL, adminStatusLabel } from '@/utils/adminStatus'
import { movesFrom } from '@/utils/orderMoves'
import { firstName, orderWhatsAppMessage, postcodeOf } from '@/utils/orderWhatsApp'
import { formatUkMobile, whatsAppLink } from '@/utils/phone'
import { formatPreferredDeliveryDate } from '@/utils/delivery'
import { itemTitle } from '@/utils/orderItemTitle'
import { asBuildSnapshot, describeBuild } from '@/types/build'
import { describeOptions, isOptionsSnapshot } from '@/utils/productOptions'
import { trustpilotInviteLink } from '@/constants/trustpilot'
import { SITE_URL } from '@/constants/site'

export type ReviewLink = { productTitle: string; imageUrl: string | null; reviewLink: string }

/** The one button that moves an order on (E2). */
const NEXT_STEP: Record<string, { to: string; label: string }> = {
  pending_cod: { to: 'confirmed', label: 'Mark confirmed' },
  confirmed: { to: 'processing', label: 'Start processing' },
  processing: { to: 'shipped', label: 'Mark on its way' },
  shipped: { to: 'delivered', label: 'Mark delivered' },
}

const STAGE_RANK: Record<string, number> = { pending_cod: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4 }

const SOURCE_LABELS: Record<string, string> = {
  meta: 'Facebook or Instagram',
  google: 'Google',
  direct: 'Came straight to us',
  referral: 'Recommended by someone',
  other: 'Something else',
}

const SEND_SOURCE: Record<string, string> = {
  change: 'Order change',
  resend: '15-minute re-send',
  by_hand: 'Sent by hand',
  before_recording: 'Before recording began',
}

const EVENT_LABEL: Record<string, string> = {
  placed: 'Order placed',
  details_changed: 'Details changed',
  test_flag_changed: 'Test flag',
  source_changed: 'Where it came from',
  note: 'Note',
}

/** The banner after a form comes back. */
function banner(sp: Record<string, string | undefined>, order: { customer_name: string }): { tone: 'ok' | 'error'; text: string } | null {
  const name = firstName(order.customer_name)
  switch (sp.done) {
    case 'created': return { tone: 'ok', text: 'Order saved.' }
    case 'status': return {
      tone: 'ok',
      text: `Marked ${adminStatusLabel(sp.status)}. ${sp.emailed === '1' ? `${name} has been emailed too.` : 'No email on this order, so let them know on WhatsApp.'}`,
    }
    case 'unchanged': return { tone: 'ok', text: `It was already ${adminStatusLabel(sp.status)}.` }
    case 'note': return { tone: 'ok', text: 'Note added.' }
    case 'test-on': return { tone: 'ok', text: 'Marked as a test order. It no longer counts in reports or ads.' }
    case 'test-off': return { tone: 'ok', text: 'Marked as a real order.' }
    case 'source': return { tone: 'ok', text: 'Saved where it came from.' }
    case 'orderflow': return { tone: 'ok', text: "Sent to OrderFlow. Its answer shows below within five minutes." }
    case 'review': return { tone: 'ok', text: 'Review email sent.' }
    case 'review-invite': return { tone: 'ok', text: 'Review email sent, and Trustpilot will invite them on its own schedule.' }
  }
  const errors: Record<string, string> = {
    'cancel-reason': "Give a reason to cancel. It is kept on the order and goes in its WhatsApp message.",
    bad_status_change: "That status change isn't allowed. A cancelled order can only be reopened as Confirmed, and a confirmed order can't go back to waiting.",
    reason_required: 'Reopening a cancelled order needs a reason.',
    stage_time_locked: "A stage time can't be changed once it has been recorded.",
    not_found: 'That order no longer exists.',
    not_authorised: 'You are not authorised to change orders.',
    note: 'Write a note first (up to 2,000 characters).',
    'orderflow-off': "OrderFlow isn't connected: its address and key aren't in Supabase Vault.",
    'review-no-email': 'There is no email on this order. Copy a review link below and send it on WhatsApp instead.',
    'review-no-products': "This order has no catalogue sofa to review, so there's no review link to send.",
    'review-not-delivered': 'The review email goes once the order is delivered.',
    'review-failed': "The review email didn't send. Try again in a moment.",
    'review-no-invite': "The review email went, but no Trustpilot invitation was attached because TRUSTPILOT_INVITE_BCC isn't set on the server. Add it and press the Trustpilot button again.",
    failed: "That didn't save. Try again.",
  }
  return sp.error ? { tone: 'error', text: errors[sp.error] ?? errors.failed } : null
}

const section = 'rounded-md border border-stone-200 bg-white p-4 shadow-sm lg:p-5'
const sectionTitle = 'mb-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500'
const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 focus:border-stone-900 focus:outline-none'
const darkButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-700 disabled:opacity-60'
const lightButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:border-stone-500 disabled:opacity-60'

function Time({ value }: { value: string | null | undefined }) {
  const t = dualTimeText(value)
  return t ? <time dateTime={value ?? undefined}>{t}</time> : null
}

export interface OrderEvent {
  id: number
  created_at: string
  kind: string
  from_status: string | null
  to_status: string | null
  staff_id: string | null
  note: string | null
}

export interface OrderFlowSend {
  sent_at: string
  source: string
  by_hand: boolean
  answered_at: string | null
  status_code: number | null
  ok: boolean | null
  outcome: string | null
  message: string | null
  order_number: number | null
  error: string | null
}

export interface OrderViewProps {
  order: OrderWithLines
  events: OrderEvent[]
  sends: OrderFlowSend[]
  reviewLinks: ReviewLink[]
  pickers: { variants: PickerVariant[]; fabrics: PickerFabric[] }
  /** The signed-in admin, so their own history entries read "You". */
  userId: string | null
  /** The page's query string: the banner after a form comes back. */
  sp: Record<string, string | undefined>
}

export default function OrderView({ order, events, sends, reviewLinks, pickers, userId, sp }: OrderViewProps) {
  const orderflowNumber = sends.find(s => s.order_number)?.order_number ?? null

  const status = order.status ?? 'pending_cod'
  const code = shortCode(order.id)
  const name = firstName(order.customer_name)
  const statusMessage = orderWhatsAppMessage(order, SITE_URL, {
    reviewLink: status === 'delivered' ? (reviewLinks[0]?.reviewLink ?? trustpilotInviteLink()) : undefined,
  })
  const chatLink = whatsAppLink(order.customer_phone)
  const messageLink = whatsAppLink(order.customer_phone, statusMessage)
  const done = banner(sp, order)
  const changedStatus = sp.done === 'status' && sp.status ? sp.status : null
  const tellLink = changedStatus
    ? whatsAppLink(order.customer_phone, orderWhatsAppMessage(order, SITE_URL, {
      status: changedStatus,
      reviewLink: changedStatus === 'delivered' ? (reviewLinks[0]?.reviewLink ?? trustpilotInviteLink()) : undefined,
    }))
    : null

  // The furthest stage recorded, when it is ahead of the status (E4).
  const stages = [
    { status: 'confirmed', at: order.confirmed_at },
    { status: 'processing', at: order.processing_at },
    { status: 'shipped', at: order.shipped_at },
    { status: 'delivered', at: order.delivered_at },
  ].filter(s => s.at)
  const furthest = stages[stages.length - 1]
  const movedBack = status !== 'cancelled' && furthest && (STAGE_RANK[furthest.status] ?? -1) > (STAGE_RANK[status] ?? -1) ? furthest : null

  const next = NEXT_STEP[status]
  const postcode = postcodeOf(order.shipping_address)
  const addressWithoutPostcode = postcode
    ? order.shipping_address.replace(/,?\s*[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\s*$/i, '')
    : order.shipping_address
  const extrasFromCheckout = Number(order.fee_distance ?? 0) + Number(order.fee_upstairs ?? 0) + Number(order.fee_assembly ?? 0) + Number(order.fee_sofa_removal ?? 0)
  const agreedDelivery = Number(order.delivery_total ?? 0) > 0 && extrasFromCheckout === 0
  const googleAttributed = order.manual_acquisition_source === 'google' || (!order.manual_acquisition_source && order.utm_source === 'google' && Boolean(order.gclid || order.gbraid || order.wbraid) && !order.fbclid)
  const corrections = movesFrom(status)

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-in fade-in duration-500 print:space-y-2">
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 print:hidden">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Orders
      </Link>

      {done && (
        <div role="status" className={`rounded-md border p-4 ${done.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
          <p className="m-0 flex items-start gap-2 text-sm font-semibold">
            {done.tone === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            {done.text}
          </p>
          {tellLink && (
            <a href={tellLink} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#128C7E] px-4 py-3 text-base font-bold text-white hover:bg-[#0e7469]">
              <WhatsAppMark /> Tell {name} on WhatsApp
            </a>
          )}
        </div>
      )}

      {/* ── E1: header ────────────────────────────────────────────────── */}
      <header className={section}>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 font-mono text-lg font-bold text-stone-900">#{code}</h1>
          {orderflowNumber && <span className="text-sm text-stone-500">OrderFlow #{orderflowNumber}</span>}
          <StatusBadge status={status} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <OrderTags order={order} long />
          {order.purchase_event_sent_at && (
            <span className="inline-flex items-center rounded-pill border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Meta purchase sent{googleAttributed ? ' (historical, not acquisition)' : ''}</span>
          )}
          {order.delivered_event_sent_at && (
            <span className="inline-flex items-center rounded-pill border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-800">Meta delivery sent</span>
          )}
        </div>
        <p className="m-0 mt-3 text-3xl font-bold tabular-nums text-stone-900">{money(order.total_amount)}</p>
        <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-stone-500">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Placed <Time value={order.created_at} />
        </p>
      </header>

      {/* ── E4: moved back ────────────────────────────────────────────── */}
      {movedBack && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="m-0">
            <strong>This order went further before.</strong> It reached {adminStatusLabel(furthest.status)} on {dualTimeText(furthest.at)}, but it now shows {adminStatusLabel(status)}. Move it on again below, or leave it if going back was intended.
          </p>
        </div>
      )}

      {/* ── E2 + E3: next step and the WhatsApp message ───────────────── */}
      <section className={section} aria-labelledby="next-heading">
        <h2 id="next-heading" className={sectionTitle}>Next step</h2>
        {next ? (
          <form action={changeOrderStatusFromPage}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="status" value={next.to} />
            <ConfirmSubmit className={`${darkButton} w-full min-h-14 text-base`}>
              {next.label} <span aria-hidden="true">→</span>
            </ConfirmSubmit>
          </form>
        ) : (
          <p className="m-0 rounded-sm bg-stone-50 px-3 py-3 text-center text-sm font-semibold text-stone-600">
            {status === 'cancelled' ? 'Cancelled: no next step.' : 'All done.'}
          </p>
        )}
        {status === 'pending_cod' && (
          <p className="m-0 mt-2 text-sm text-stone-600">
            Usually the customer confirms from the link in their WhatsApp or email. Mark it confirmed yourself only if they confirmed by phone or in the chat.
          </p>
        )}
        {messageLink ? (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">WhatsApp message for {adminStatusLabel(status).toLowerCase()}</p>
            <p className="m-0 whitespace-pre-line rounded-sm bg-stone-50 p-3 text-sm text-stone-700">{statusMessage}</p>
            <a href={messageLink} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#25D366]/15 px-4 py-3 text-base font-bold text-[#0e7469] hover:bg-[#25D366]/25">
              <WhatsAppMark /> Send this to {name}
            </a>
          </div>
        ) : (
          <p className="m-0 mt-3 text-sm text-stone-500">The phone number on this order isn&apos;t a UK mobile, so WhatsApp can&apos;t be opened from here.</p>
        )}
      </section>

      {/* ── E5: customer ──────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="customer-heading">
        <h2 id="customer-heading" className={sectionTitle}>Customer</h2>
        <div className="space-y-3 text-sm">
          <p className="m-0 flex items-start gap-2 text-base font-semibold text-stone-900"><User className="mt-0.5 h-4 w-4 text-stone-400" aria-hidden="true" />{order.customer_name}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${order.customer_phone.replace(/\s+/g, '')}`} className={lightButton}><Phone className="h-4 w-4" aria-hidden="true" />{formatUkMobile(order.customer_phone)}</a>
            {chatLink && <a href={chatLink} target="_blank" rel="noopener noreferrer" className={lightButton}><WhatsAppMark className="h-4 w-4" />WhatsApp</a>}
            {order.customer_email && <a href={`mailto:${order.customer_email}`} className={`${lightButton} max-w-full`}><Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{order.customer_email}</span></a>}
          </div>
          <p className="m-0 flex items-start gap-2 text-stone-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
            <span>{addressWithoutPostcode}{postcode && <>, <strong className="text-stone-900">{postcode}</strong></>}</span>
          </p>
          {order.preferred_delivery_date && (
            <p className="m-0 flex items-start gap-2 text-stone-900">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span><strong>Wants delivery on {formatPreferredDeliveryDate(order.preferred_delivery_date)}</strong> - confirm the slot on the call</span>
            </p>
          )}
          {order.special_instructions?.trim() && (
            <div className="rounded-sm border border-stone-200 bg-stone-50 p-3">
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-stone-500">Their notes</p>
              <p className="m-0 mt-1 whitespace-pre-line text-stone-800">{order.special_instructions}</p>
            </div>
          )}
          {order.whatsapp_reference && <p className="m-0 text-xs text-stone-500">WhatsApp reference <span className="font-mono font-semibold text-stone-700">{order.whatsapp_reference}</span></p>}
        </div>
      </section>

      {/* ── E6: items and money ───────────────────────────────────────── */}
      <section className={section} aria-labelledby="items-heading">
        <h2 id="items-heading" className={sectionTitle}>Items and money</h2>
        <ul className="divide-y divide-stone-100">
          {order.order_items.map(item => {
            // A bed or mattress line carries its size, set and extras instead
            // of a /build specification. Both live in customisation.
            const options = isOptionsSnapshot(item.customisation) ? describeOptions(item.customisation) : null
            const build = options ? null : asBuildSnapshot(item.customisation)
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="m-0 font-semibold text-stone-900">{item.quantity} × {itemTitle(item)}</p>
                  {/* The variant colour is the photograph; once a fabric is
                      chosen it is not printed, so the line reads as one colour. */}
                  <p className="m-0 text-xs text-stone-500">{[!item.fabric_code && item.product_variants?.color, item.product_variants?.sku && `SKU ${item.product_variants.sku}`].filter(Boolean).join(' · ')}</p>
                  {item.fabric_code && (
                    <p className="m-0 mt-0.5 text-xs font-semibold text-amber-800">
                      {item.fabric_collection} {item.fabric_name} <span className="font-mono text-stone-500">{item.fabric_code}</span>
                    </p>
                  )}
                  {options && options.length > 0 && (
                    <ul className="mt-1.5 list-none space-y-0.5 rounded-sm border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs text-stone-700">
                      {options.map(line => (
                        <li key={line.label}><span className="font-semibold text-stone-900">{line.label}:</span> {line.value}</li>
                      ))}
                    </ul>
                  )}
                  {build && (
                    <ul className="mt-1.5 list-none space-y-0.5 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-stone-700">
                      <li className="font-bold uppercase tracking-wide text-amber-800">Built to order - confirm on the phone</li>
                      {describeBuild(build).map(line => (
                        <li key={line.label}><span className="font-semibold text-stone-900">{line.label}:</span> {line.value}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  <p className="m-0 font-semibold text-stone-900">{money(item.price_at_time_of_purchase * item.quantity)}</p>
                  {item.quantity > 1 && <p className="m-0 text-xs text-stone-500">{money(item.price_at_time_of_purchase)} each</p>}
                </div>
              </li>
            )
          })}
        </ul>
        <dl className="mt-2 space-y-1.5 border-t border-stone-200 pt-3 text-sm tabular-nums">
          <div className="flex justify-between gap-3"><dt className="text-stone-600">Items</dt><dd className="m-0">{money(order.items_subtotal ?? order.order_items.reduce((s, i) => s + i.price_at_time_of_purchase * i.quantity, 0))}</dd></div>
          {Number(order.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between gap-3 text-amber-800">
              <dt>Offer{order.promotion_code ? ` ${order.promotion_code}` : ''}{order.offer_source ? ` · ${order.offer_source.replace('_', ' ')}` : ''}{order.discount_tier ? ` · ${order.discount_tier}` : ''}</dt>
              <dd className="m-0">−{money(order.discount_amount)}</dd>
            </div>
          )}
          {Number(order.fee_distance ?? 0) > 0 && (
            <div className="flex justify-between gap-3"><dt className="text-stone-600">Delivery{order.delivery_region ? ` to ${order.delivery_region}` : ''} (distance from Blackburn)</dt><dd className="m-0">{money(order.fee_distance)}</dd></div>
          )}
          {Number(order.fee_upstairs ?? 0) > 0 && (
            <div className="flex justify-between gap-3"><dt className="text-stone-600">Upstairs: {order.delivery_has_lift ? 'lift available' : `floor ${order.delivery_floor}, no lift`}</dt><dd className="m-0">{money(order.fee_upstairs)}</dd></div>
          )}
          {order.wants_assembly && (
            <div className="flex justify-between gap-3"><dt className="text-stone-600">Assembly</dt><dd className="m-0">{money(order.fee_assembly)}</dd></div>
          )}
          {order.wants_sofa_removal && (
            <div className="flex justify-between gap-3"><dt className="text-stone-600">Old sofa removal{order.sofa_removal_seats ? `: ${order.sofa_removal_seats} seats` : ''} (confirm if oversized)</dt><dd className="m-0">{money(order.fee_sofa_removal)}</dd></div>
          )}
          {agreedDelivery && (
            <div className="flex justify-between gap-3"><dt className="text-stone-600">Delivery agreed with the customer</dt><dd className="m-0">{money(order.delivery_total)}</dd></div>
          )}
          <div className="flex justify-between gap-3 border-t border-stone-200 pt-2 text-base"><dt className="font-bold text-stone-900">To collect on delivery</dt><dd className="m-0 font-bold text-stone-900">{money(order.total_amount)}</dd></div>
        </dl>
      </section>

      {/* ── E7: copy, print, edit ─────────────────────────────────────── */}
      <section className={`${section} print:hidden`} aria-label="Copy, print and edit">
        <div className="flex flex-wrap gap-2">
          <CopyOrderButton order={order} />
          <DirectPrintButton order={order} />
          {/* H1: the driver's note, beside the invoice, which is unchanged. */}
          <Link
            href={`/admin/orders/${order.id}/delivery-note`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200"
          >
            <Truck className="h-4 w-4" aria-hidden="true" /> Delivery note
          </Link>
          {status !== 'cancelled' && <EditOrderForm order={order} variants={pickers.variants} fabrics={pickers.fabrics} />}
        </div>
      </section>

      {/* ── E8: review (delivered only) ───────────────────────────────── */}
      {status === 'delivered' && (
        <section className={section} aria-labelledby="review-heading">
          <h2 id="review-heading" className={sectionTitle}>Review</h2>
          <p className="m-0 text-sm text-stone-700">
            {order.review_request_sent_at
              ? <>Review email sent <Time value={order.review_request_sent_at} />.</>
              : order.customer_email ? 'The review email has not gone yet. It goes by itself three days after delivery.' : 'No email on this order, so ask on WhatsApp.'}
          </p>
          <p className="m-0 mt-1 text-xs text-stone-500">
            Trustpilot is never invited automatically. Marking an order delivered sends a
            notification, not a request &mdash; an invitation only goes when you press
            &ldquo;Send Trustpilot review request&rdquo; below, and the review that comes back
            is marked Verified on Trustpilot. Press it for every delivered customer, not only
            the happy ones: inviting only people you expect to be positive is against
            Trustpilot&apos;s rules and counts as hiding bad reviews under the DMCC Act.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.customer_email && (
              <>
                {/* Our own ask: review links to our pages, nothing sent to
                    Trustpilot. */}
                <form action={sendReviewEmailFromPage}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <ConfirmSubmit
                    className={lightButton}
                    question={order.review_request_sent_at ? `A review email already went to ${order.customer_email}. Send another?` : undefined}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" /> Send the review email now
                  </ConfirmSubmit>
                </form>

                {/* The same email, blind-copied to Trustpilot's invitation
                    service. Trustpilot then chases them on its own delay, so
                    this is the one that ends up as a Trustpilot review. */}
                <form action={sendReviewEmailFromPage}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="trustpilot" value="1" />
                  <ConfirmSubmit
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-[#00b67a]/40 bg-[#00b67a]/10 px-4 py-2.5 text-sm font-bold text-[#007a52] transition hover:bg-[#00b67a]/20"
                    question={
                      order.review_request_sent_at
                        ? `A review email already went to ${order.customer_email}. Send another, this time inviting them on Trustpilot?`
                        : `Email ${order.customer_email} and invite them to review on Trustpilot?`
                    }
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" /> Send Trustpilot review request
                  </ConfirmSubmit>
                </form>
              </>
            )}
            {reviewLinks.map(r => (
              <CopyTextButton key={r.reviewLink} text={r.reviewLink} label={reviewLinks.length > 1 ? `Copy review link: ${r.productTitle}` : 'Copy their review link'} />
            ))}
          </div>
          {whatsAppLink(order.customer_phone) && (
            <a
              href={whatsAppLink(order.customer_phone, `Hi ${name}, we hope the sofa has settled in well! If you have a minute, a quick review on Trustpilot would help the next person decide - it takes about a minute: ${trustpilotInviteLink()}\n\nThank you from all of us at UK Sofa Shop.`)!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-sm border border-[#00b67a]/40 bg-[#00b67a]/10 py-2.5 text-sm font-bold text-[#007a52] transition hover:bg-[#00b67a]/20"
            >
              Ask for a Trustpilot review on WhatsApp
            </a>
          )}
        </section>
      )}

      {/* ── Meta conversion (unchanged from the order card) ───────────── */}
      <section className={section} aria-labelledby="meta-heading">
        <h2 id="meta-heading" className={`${sectionTitle} flex items-center gap-2`}><Radio className="h-4 w-4 text-blue-600" aria-hidden="true" /> Meta conversion</h2>
        <p className="m-0 mb-3 text-xs text-stone-500">Changing order status does not send an ad conversion. Send it here only after the business event is real.</p>
        {order.is_test ? (
          <p className="m-0 flex items-start gap-2 rounded-sm border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong>Test order.</strong> Meta conversion sending is blocked.</span>
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-sm border border-stone-200 bg-stone-50 p-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-stone-500">Purchase</p>
              {order.purchase_event_sent_at ? (
                <div className="mt-1.5">
                  <p className="m-0 text-sm font-bold text-green-700">Sent to Meta</p>
                  <p className="m-0 mt-0.5 text-[11px] text-stone-500"><Time value={order.purchase_event_sent_at} /></p>
                  {status === 'cancelled' && <p className="m-0 mt-2 text-[11px] font-semibold text-red-700">This Purchase was sent before the order was cancelled. Do not count it as current revenue.</p>}
                </div>
              ) : order.confirmed_at && status !== 'cancelled' ? (
                <div className="mt-2">
                  <MetaConversionButton orderId={order.id} kind="purchase" label="Send Purchase event to Meta"
                    className="w-full rounded-sm bg-blue-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60" />
                </div>
              ) : (
                <p className="m-0 mt-1.5 text-xs text-stone-500">{status === 'cancelled' ? 'Cancelled - nothing to send.' : 'Confirm the order first.'}</p>
              )}
            </div>
            <div className="rounded-sm border border-stone-200 bg-stone-50 p-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-stone-500">Delivered</p>
              {order.delivered_event_sent_at ? (
                <div className="mt-1.5">
                  <p className="m-0 text-sm font-bold text-green-700">OrderDelivered sent</p>
                  <p className="m-0 mt-0.5 text-[11px] text-stone-500"><Time value={order.delivered_event_sent_at} /></p>
                </div>
              ) : status === 'delivered' && order.delivered_at ? (
                <div className="mt-2">
                  <MetaConversionButton orderId={order.id} kind="delivered" label="Send Delivered event to Meta"
                    className="w-full rounded-sm bg-green-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60" />
                  {!order.purchase_event_sent_at && <p className="m-0 mt-1.5 text-[10px] text-stone-500">Purchase has not been sent; this action will send Purchase first, then OrderDelivered.</p>}
                </div>
              ) : (
                <p className="m-0 mt-1.5 text-xs text-stone-500">Mark the order Delivered first.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── E9: OrderFlow ─────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="orderflow-heading">
        <h2 id="orderflow-heading" className={sectionTitle}>OrderFlow</h2>
        {sends.length === 0 ? (
          <p className="m-0 text-sm text-stone-500">No sends recorded for this order yet. Recording began on 14 Oct 2026; it is sent again whenever it changes.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {sends.slice(0, 8).map((s, i) => (
              <li key={i} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="m-0 font-semibold text-stone-900">
                    {s.answered_at === null ? 'Waiting for a reply' : s.ok ? `Accepted${s.outcome ? ` (${s.outcome})` : ''}` : `Turned away${s.message || s.error ? `: ${s.message ?? s.error}` : ''}`}
                  </p>
                  <p className="m-0 text-xs text-stone-500"><Time value={s.sent_at} /> · {SEND_SOURCE[s.source] ?? s.source}{s.status_code ? ` · HTTP ${s.status_code}` : ''}</p>
                </div>
                <span className={`shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.answered_at === null ? 'border-stone-200 bg-stone-50 text-stone-600' : s.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  {s.answered_at === null ? 'Waiting' : s.ok ? 'OK' : 'Refused'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form action={sendToOrderFlowFromPage} className="mt-3">
          <input type="hidden" name="orderId" value={order.id} />
          <ConfirmSubmit
            className={lightButton}
            question={order.is_test ? 'This is a test order. OrderFlow will receive it like any other order. Send it?' : undefined}
          >
            Send to OrderFlow now
          </ConfirmSubmit>
        </form>
      </section>

      {/* ── E10: timeline ─────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className={sectionTitle}>Timeline</h2>
        <ol className="space-y-2 text-sm">
          {[
            ['Placed', order.created_at, null],
            ['Confirmed', order.confirmed_at, order.confirmed_by === 'customer' ? 'by the customer' : order.confirmed_by === 'staff' ? 'by staff' : null],
            ['Processing', order.processing_at, null],
            ['On its way', order.shipped_at, null],
            ['Delivered', order.delivered_at, null],
            ['Cancelled', order.cancelled_at, order.cancellation_reason],
          ].filter(([, at]) => at).map(([label, at, note]) => {
            const t = dualTime(at)
            return (
              <li key={label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-stone-900">{label}{note ? <span className="font-normal text-stone-500"> {label === 'Cancelled' ? `: ${note}` : note}</span> : null}</span>
                {t && <span className="text-xs text-stone-500">{t.uk} UK · {t.pk} PK</span>}
              </li>
            )
          })}
        </ol>
      </section>

      {/* ── E11: history and notes ────────────────────────────────────── */}
      <section className={section} aria-labelledby="history-heading">
        <h2 id="history-heading" className={sectionTitle}>History and notes</h2>
        {events.length === 0 ? (
          <p className="m-0 text-sm text-stone-500">Nothing recorded yet. History began on 15 Oct 2026, so older orders start empty.</p>
        ) : (
          <ol className="space-y-2.5 text-sm">
            {events.map(e => (
              <li key={e.id} className="border-l-2 border-stone-200 pl-3">
                <p className="m-0 text-stone-900">
                  <span className="font-semibold">
                    {e.kind === 'status_changed' ? `${adminStatusLabel(e.from_status)} → ${adminStatusLabel(e.to_status)}` : EVENT_LABEL[e.kind] ?? e.kind}
                  </span>
                  {e.note && <span className="text-stone-700">{e.kind === 'note' ? ': ' : ' - '}{e.note}</span>}
                </p>
                <p className="m-0 text-xs text-stone-500">
                  {e.staff_id ? (e.staff_id === userId ? 'You' : 'Staff') : 'Customer or system'} · <Time value={e.created_at} />
                </p>
              </li>
            ))}
          </ol>
        )}
        <form action={addOrderNoteFromPage} className="mt-4 space-y-2 border-t border-stone-100 pt-4">
          <input type="hidden" name="orderId" value={order.id} />
          <label htmlFor="order-note" className="block text-xs font-bold uppercase tracking-wider text-stone-500">Add a note</label>
          <textarea id="order-note" name="note" rows={2} maxLength={2000} required className={field} placeholder="What was agreed, a delivery slot…" />
          <ConfirmSubmit className={darkButton}>Add note</ConfirmSubmit>
        </form>
      </section>

      {/* ── E12: where it came from ───────────────────────────────────── */}
      <section className={section} aria-labelledby="source-heading">
        <h2 id="source-heading" className={sectionTitle}>Where it came from</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-stone-500">Taken</dt><dd className="m-0 text-stone-900">{order.channel === 'phone' ? 'By phone' : order.source === 'whatsapp' ? 'On WhatsApp' : 'On the website'}</dd>
          {order.utm_source && <><dt className="text-stone-500">Source</dt><dd className="m-0 break-all text-stone-900">{[order.utm_source, order.utm_medium].filter(Boolean).join(' / ')}</dd></>}
          {order.utm_campaign && <><dt className="text-stone-500">Campaign</dt><dd className="m-0 break-all text-stone-900">{order.utm_campaign}</dd></>}
          {order.utm_content && <><dt className="text-stone-500">Ad</dt><dd className="m-0 break-all text-stone-900">{order.utm_content}</dd></>}
          {(order.fbclid || order.meta_fbc) && <><dt className="text-stone-500">Click</dt><dd className="m-0 text-stone-900">Facebook or Instagram ad click</dd></>}
          {(order.gclid || order.gbraid || order.wbraid) && <><dt className="text-stone-500">Click</dt><dd className="m-0 text-stone-900">Google ad click</dd></>}
          {order.whatsapp_reference && <><dt className="text-stone-500">WhatsApp ref</dt><dd className="m-0 font-mono text-stone-900">{order.whatsapp_reference}</dd></>}
          {order.landing_page && <><dt className="text-stone-500">Landed on</dt><dd className="m-0 break-all text-stone-900">{order.landing_page.split('?')[0]}</dd></>}
          {order.manual_acquisition_source && (
            <><dt className="text-stone-500">Staff say</dt><dd className="m-0 text-stone-900">{SOURCE_LABELS[order.manual_acquisition_source] ?? order.manual_acquisition_source}{order.manual_acquisition_note ? ` - ${order.manual_acquisition_note}` : ''}</dd></>
          )}
        </dl>
        <form action={setOrderSourceFromPage} className="mt-4 grid gap-2 border-t border-stone-100 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="orderId" value={order.id} />
          <div>
            <label htmlFor="order-source" className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Where it really came from</label>
            <select id="order-source" name="source" defaultValue={order.manual_acquisition_source ?? ''} className={field}>
              <option value="">Not set</option>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="order-source-note" className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Note</label>
            <input id="order-source-note" name="note" defaultValue={order.manual_acquisition_note ?? ''} maxLength={300} className={field} placeholder="e.g. saw the reel" />
          </div>
          <ConfirmSubmit className={lightButton}>Save</ConfirmSubmit>
        </form>
      </section>

      {/* ── E13: corrections ──────────────────────────────────────────── */}
      <details className={`${section} print:hidden`}>
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-bold text-stone-700">Corrections: change the status, test order, delete</summary>
        <div className="mt-3 space-y-5 border-t border-stone-100 pt-4">
          {corrections.length > 0 && (
            <form action={changeOrderStatusFromPage} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <label htmlFor="correct-status" className="block text-xs font-bold uppercase tracking-wider text-stone-500">Change the status to</label>
              <select id="correct-status" name="status" defaultValue={corrections[0]} className={field}>
                {corrections.map(s => <option key={s} value={s}>{ADMIN_STATUS_LABEL[s]}</option>)}
              </select>
              <label htmlFor="correct-reason" className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                Reason {status === 'cancelled' ? '(needed to reopen)' : '(needed to cancel; kept on the order and used in its WhatsApp message)'}
              </label>
              <input id="correct-reason" name="reason" maxLength={500} className={field} placeholder={status === 'cancelled' ? 'Why it is being reopened' : 'Why it is being cancelled'} />
              <ConfirmSubmit className={darkButton} question="Change this order's status?">Change status</ConfirmSubmit>
            </form>
          )}

          <form action={setOrderTestFlagFromPage} className="space-y-2">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="isTest" value={order.is_test ? 'false' : 'true'} />
            <p className="m-0 text-xs font-bold uppercase tracking-wider text-stone-500">Test order</p>
            {order.is_test ? (
              <p className="m-0 text-sm text-stone-700">This is a test order{order.test_reason ? `: ${order.test_reason}` : ''}. It doesn&apos;t count in reports or ads.</p>
            ) : (
              <>
                <label htmlFor="test-reason" className="sr-only">Why it is a test</label>
                <input id="test-reason" name="reason" maxLength={200} className={field} placeholder="Why it is a test (optional)" />
              </>
            )}
            <ConfirmSubmit className={lightButton}>{order.is_test ? 'Not a test order' : 'Mark as a test order'}</ConfirmSubmit>
          </form>

          <div className="space-y-2">
            <p className="m-0 text-xs font-bold uppercase tracking-wider text-stone-500">Delete</p>
            <DeleteOrderButton orderId={order.id} reference={code} redirectTo={`/admin/orders?deleted=${code}`} />
          </div>
        </div>
      </details>

      <p className="m-0 pb-2 text-center text-xs text-stone-400 print:hidden">
        <Truck className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        Order {order.id}
      </p>
    </div>
  )
}
