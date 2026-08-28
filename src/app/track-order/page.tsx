'use client'
// src/app/track-order/page.tsx

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Search } from 'lucide-react'
import { trackOrder } from '@/app/actions/orders'
import type { TrackedOrder, TrackedOrderItem } from '@/types/orders'
import { useSearchParams } from 'next/navigation'
import Timeline from '@/components/UI/Timeline'
import { STATUS } from '@/utils/orderStatus'
import { PHONE_DISPLAY, PHONE_HREF } from '@/constants/contact'

/**
 * Where is it.
 *
 * The lookup used to be a card of two boxed inputs under a 42px icon tile —
 * a form pretending to be a dashboard. It is one question, so it is asked
 * once, large, with the reference on an ember rule and nothing else competing
 * with it.
 *
 * The status display is the confirmation page's timeline now, not the private
 * five-step diagram this page had. Somebody arriving from the confirmation
 * email should recognise the picture they were shown when they ordered.
 */
function TrackInterface() {
  const sp = useSearchParams()
  // `code` is the parameter older status emails used, kept so links already
  // sitting in customers' inboxes still fill the field in.
  const [reference, setReference] = useState(sp.get('ref') || sp.get('code') || '')
  const [postcode, setPostcode] = useState(sp.get('postcode') || '')
  // Starts true when the URL already carries both values, so the spinner is
  // correct on first paint and the effect below never has to set it.
  const [searching, setSearching] = useState(
    () => Boolean((sp.get('ref') || sp.get('code')) && sp.get('postcode'))
  )
  const [error, setError] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const autoRan = useRef(false)

  const canSubmit = reference.replace(/[^0-9a-fA-F]/g, '').length === 8
    && postcode.replace(/[^a-zA-Z0-9]/g, '').length >= 5

  async function track() {
    if (!canSubmit) return
    setSearching(true); setError(''); setOrder(null)
    const res = await trackOrder(reference, postcode)
    if (res.error) setError(res.error)
    else if (res.order) setOrder(res.order)
    setSearching(false)
  }

  // Auto-search when both values arrive in the URL, e.g. from the checkout
  // success screen or a link in an order status email.
  useEffect(() => {
    if (autoRan.current) return
    const ref = sp.get('ref') || sp.get('code')
    const pc = sp.get('postcode')
    if (!ref || !pc) return

    autoRan.current = true
    let cancelled = false

    trackOrder(ref, pc).then(res => {
      if (cancelled) return
      if (res.error) setError(res.error)
      else if (res.order) setOrder(res.order)
      setSearching(false)
    })

    return () => { cancelled = true }
  }, [sp])

  return (
    <div className="w-full max-w-[640px]">
      <form
        onSubmit={e => { e.preventDefault(); track() }}
        className="motion-safe:animate-[fadeUp_var(--dur-settle)_var(--ease-out-expo)_both]"
      >
        <label htmlFor="track-ref" className="block font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
          Order reference
        </label>
        {/* The one big field. An ember rule under it rather than a box: this is
            the only thing on the screen being asked for, and a box would put
            three more edges around it to say so. */}
        <div className="group relative mt-3">
          <input
            id="track-ref"
            value={reference}
            onChange={e => setReference(e.target.value.toUpperCase())}
            placeholder="5D786B72"
            maxLength={9}
            autoComplete="off"
            spellCheck={false}
            className="w-full border-0 bg-transparent pb-3 font-display text-h1 font-semibold uppercase tracking-[0.06em] tabular-nums text-ink-900 focus-ring-inset rounded-sm placeholder:text-ink-400"
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-calico-300" />
          {/* Draws in from the left on focus. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-ember-500 transition-transform duration-base ease-out-expo group-focus-within:scale-x-100"
          />
        </div>

        <label htmlFor="track-postcode" className="mt-8 block font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
          Delivery postcode
        </label>
        <div className="group relative mt-3">
          <input
            id="track-postcode"
            value={postcode}
            onChange={e => setPostcode(e.target.value.toUpperCase())}
            placeholder="BB6 7LS"
            maxLength={9}
            autoComplete="postal-code"
            spellCheck={false}
            className="w-full border-0 bg-transparent pb-3 font-data text-lead font-bold uppercase tracking-[0.12em] text-ink-900 focus-ring-inset rounded-sm placeholder:text-ink-400"
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-calico-300" />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-ember-500 transition-transform duration-base ease-out-expo group-focus-within:scale-x-100"
          />
        </div>

        <p className="m-0 mt-3 text-caption text-ink-500">
          Eight characters, like the example. Both are on your confirmation email.
        </p>

        <button
          type="submit"
          disabled={searching || !canSubmit}
          className={`hover-btn mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-sm font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-colors duration-swift ease-out-expo ${
            canSubmit ? 'bg-ember-500 text-ink-900' : 'cursor-not-allowed bg-calico-200 text-ink-400'
          }`}
        >
          {searching
            ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            : <Search aria-hidden="true" className="h-4 w-4" />}
          {searching ? 'Looking' : 'Find my order'}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-sm border border-rust-700 bg-rust-50 px-4 py-3 text-body-sm leading-relaxed text-rust-700 motion-safe:animate-[fadeUp_var(--dur-base)_var(--ease-out-expo)]"
        >
          {error}
          <span className="mt-2 block text-caption text-ink-500">
            Still stuck? Call us on{' '}
            <a href={PHONE_HREF} className="hover-link font-semibold text-ember-700 no-underline">
              {PHONE_DISPLAY}
            </a>.
          </span>
        </div>
      )}

      {order && <Result order={order} />}
    </div>
  )
}

// ─── The answer ──────────────────────────────────────────────────────────────
function Result({ order }: { order: TrackedOrder }) {
  const cfg = STATUS[order.status] ?? STATUS.pending_cod
  const Icon = cfg.icon
  const reference = order.id.split('-')[0].toUpperCase()
  const deliveryTotal = Number(order.delivery_total ?? 0)

  return (
    <div className="mt-8 overflow-hidden rounded-md border border-calico-300 bg-calico-50 shadow-e1 motion-safe:animate-[fadeUp_var(--dur-settle)_var(--ease-out-expo)]">
      <div className="flex items-center justify-between gap-4 border-b-2 border-ember-500 bg-ember-500/8 px-5 py-4">
        <div className="min-w-0">
          <p className="m-0 font-data text-body font-bold tracking-[0.1em] tabular-nums text-ink-900">
            #{reference}
          </p>
          <p className="m-0 mt-1 text-caption text-ink-500">
            Placed {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <p className="m-0 shrink-0 font-data text-body font-bold tabular-nums text-ink-900">
          £{Number(order.total_amount).toFixed(0)}
        </p>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${cfg.pill}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
              Where it is
            </p>
            <p className="m-0 mt-1 text-body font-semibold text-ink-900">{cfg.label}</p>
            <p className="m-0 mt-1 text-caption leading-relaxed text-ink-500">{cfg.note}</p>
          </div>
        </div>

        {cfg.stage >= 0 && (
          <div className="mt-6">
            {/* The current dot pulses. Progress here is real and ongoing —
                unlike the confirmation page, where the order is seconds old
                and nothing has started moving yet. */}
            <Timeline current={cfg.stage} pulse={cfg.stage < 3} />
          </div>
        )}

        <p className="m-0 mt-7 font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">Items</p>
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {order.order_items?.map((item: TrackedOrderItem, i: number) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-sm bg-calico-100 px-3 py-2.5 text-body-sm"
            >
              <span className="min-w-0 text-ink-700">
                <span className="mr-2 font-data font-bold tabular-nums text-ink-900">{item.quantity}×</span>
                {item.product_variants?.products?.title ?? 'Product'}
                {item.product_variants?.color && (
                  <span className="text-ink-500"> · {item.product_variants.color}</span>
                )}
              </span>
              <span className="shrink-0 font-data font-semibold tabular-nums text-ink-900">
                £{Number(item.price_at_time_of_purchase).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col gap-2 rounded-sm bg-ink-900 px-4 py-4">
          {deliveryTotal > 0 && (
            <>
              <Line label="Your order" value={Number(order.items_subtotal ?? order.total_amount)} />
              {Number(order.fee_upstairs ?? 0) > 0 && (
                <Line
                  label={`Upstairs delivery${order.delivery_has_lift ? ' (lift)' : order.delivery_floor ? ` (${order.delivery_floor} up)` : ''}`}
                  value={Number(order.fee_upstairs)}
                />
              )}
              {Number(order.fee_assembly ?? 0) > 0 && <Line label="Assembly" value={Number(order.fee_assembly)} />}
              {Number(order.fee_sofa_removal ?? 0) > 0 && <Line label="Old sofa removal" value={Number(order.fee_sofa_removal)} />}
              <span aria-hidden="true" className="my-1 h-px bg-calico-50/10" />
            </>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-body-sm font-semibold text-calico-300">
              {order.status === 'delivered' ? 'Paid on delivery' : 'Due on delivery'}
            </span>
            {/* Ember 300, not Ember 700. On Ink 900 the dark ember is 2.4:1. */}
            <span className="font-data text-body font-bold tabular-nums text-ember-300">
              £{Number(order.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-caption text-calico-300">
      <span>{label}</span>
      <span className="font-data tabular-nums">£{value.toFixed(2)}</span>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <div className="border-b-2 border-ember-500 bg-ink-900 px-4 py-4">
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4">
          <Link href="/" className="no-underline">
            <span className="font-body text-lead font-bold text-calico-50">
              UK Sofa <span className="text-ember-300">Shop</span>
            </span>
          </Link>
          <Link
            href="/shop/all"
            className="hover-link flex items-center gap-1.5 text-caption text-calico-300 no-underline"
          >
            Shop <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[640px] px-4 pb-24 pt-12 sm:pt-16">
        <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-ember-700">
          Track an order
        </p>
        <h1 className="m-0 mt-3 font-display text-display-l font-semibold leading-[1.05] text-ink-900">
          Where is it?
        </h1>
        <p className="m-0 mt-4 max-w-[46ch] text-body leading-relaxed text-ink-500">
          Two things and we will tell you exactly where your sofa has got to.
        </p>

        <div className="mt-10">
          <Suspense fallback={<div className="h-[420px] rounded-md bg-calico-100" />}>
            <TrackInterface />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
