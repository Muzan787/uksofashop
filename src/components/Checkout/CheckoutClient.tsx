'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingBag, Plus, Minus,
  ArrowLeft, Truck, Wallet, ShieldCheck,
  Loader2,
  MapPin, Check, Search,
  ChevronDown, Landmark,
  Phone, AlertTriangle,
} from 'lucide-react'
import { useCart, type DisplayCartItem } from '@/context/CartContext'
import { placeOrder } from '@/app/actions/checkout'
import { trackOrderPlaced, trackInitiateCheckout, type TrackedItem } from '@/utils/tracking'
import { PROMISES } from '@/constants/promises'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import {
  ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR, UPSTAIRS_PER_EXTRA_FLOOR,
  DELIVERY_AREA_NOTE, NO_EXTRAS, deliveryBreakdown, deliveryTotal, floorName,
  type DeliveryOptions,
} from '@/constants/delivery'
import { lookupAddresses, normalisePostcode } from '@/utils/postcode'
import CartStep from './CartStep'
import Steps from './Steps'
import Field from '@/components/UI/Field'
import MobileTotalBar from './MobileTotalBar'
import SuccessStep from './SuccessStep'

// ─── Types ────────────────────────────────────────────────────────────────────
import type { Step } from './Steps'

/**
 * Cart lines in the shape the pixel and GA4 want. variant_id is the same id
 * the Merchant feed publishes as <g:id>, which is what lets a dynamic ad
 * retarget the exact sofa in someone's basket.
 */
function toTrackedItems(items: DisplayCartItem[]): TrackedItem[] {
  return items.map(i => ({
    variantId: i.variant_id,
    title: i.title,
    price: i.price,
    quantity: i.quantity,
  }))
}

interface FormState {
  customerName: string
  customerEmail: string
  customerPhone: string
  postcode: string           // NEW: Separate Postcode field
  shippingAddress: string
  specialInstructions: string
}

interface FieldError { [key: string]: string }

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  WHY THIS FILE NO LONGER STYLES ITSELF INLINE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every rule here used to be an inline `style` object — a hundred and four of
 * them, on the one page where a mistake costs an order rather than a
 * compliment. They were not merely verbose: inline styles were breaking things
 * in two ways a class cannot break.
 *
 * THEY BEAT THE BREAKPOINTS. An inline declaration outranks every class
 * selector, so a responsive class beside it can never win. The grid holding
 * the form and the order summary carried `gridTemplateColumns: 'auto'` inline
 * next to `lg:grid-cols-[1fr_340px]` — so the two-column layout never applied
 * at any width, and the summary dropped underneath the form on desktop. There
 * is a comment on the payment cards below warning about exactly this trap; the
 * grid two hundred lines further down had already fallen into it.
 *
 * THEY MADE COLOURS BY STRING CONCATENATION. `${ACCENT}08` was meant to read as
 * Ember at 3% — but ACCENT was `var(--color-ember-500)`, and gluing hex digits
 * onto a var() produces `var(--color-ember-500)08`, which is not a colour, so
 * the browser discards the declaration entirely. Three surfaces were affected
 * and all three had been invisible since the day they were written: the tint on
 * a ticked delivery extra, the highlight on the selected address, and both the
 * background and the border of the panel stating the total due on delivery —
 * which is the number the customer came to the page to find. Written as
 * `bg-ember-500/[0.07]` the same intent cannot fail to parse.
 *
 * One inline style survives, at the header rule: a background-image built from
 * --grad-rule, which has no utility of its own.
 */

// ─── The one bespoke input on the page ────────────────────────────────────────
// Postcode keeps its own control rather than using <Field>, because it is the
// only field on the site with a leading icon and a button sharing its row. The
// shell matches Field's: same radius, same hairline, and Ember 700 on focus
// (Ember 500 is 2.9:1 on a light ground, under the 3:1 a focus ring must meet).
const FIELD_SHELL =
  'w-full rounded-sm border-[1.5px] bg-calico-50 py-3 pl-8 pr-4 text-body-sm text-ink-900 ' +
  'outline-none transition-[border-color] duration-swift ease-out-expo'

function fieldClass(error: boolean): string {
  return `${FIELD_SHELL} ${
    error ? 'border-rust-700' : 'border-calico-300 focus:border-ember-700'
  }`
}

// ─── Optional delivery extra ──────────────────────────────────────────────────
function ExtraOption({
  checked, onToggle, title, note, price, priceIsFrom = false, children,
}: {
  checked: boolean
  onToggle: (on: boolean) => void
  title: string
  note: string
  price: number
  priceIsFrom?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-sm border-[1.5px] px-4 py-3 transition-[border-color,background-color] duration-swift ease-out-expo ${
        checked ? 'border-ember-500 bg-ember-500/[0.06]' : 'border-calico-300 bg-calico-50'
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onToggle(e.target.checked)}
          className="h-11 w-11 shrink-0 cursor-pointer accent-ember-500"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-body-sm font-bold text-ink-900">{title}</span>
            <span className="shrink-0 text-body-sm font-extrabold text-ember-700">
              {priceIsFrom && (
                <span className="font-data text-caption font-semibold text-ink-500">from </span>
              )}
              £{price.toFixed(2)}
            </span>
          </span>
          <span className="mt-1 block text-caption leading-relaxed text-ink-500">{note}</span>
        </span>
      </label>
      {checked && children}
    </div>
  )
}

// ─── Order summary sidebar ────────────────────────────────────────────────────
function OrderSummary({ compact = false, extras = NO_EXTRAS }: { compact?: boolean; extras?: DeliveryOptions }) {
  const { cartItems, totalAmount } = useCart()
  // Base delivery to a UK Mainland ground floor is free, with no threshold.
  // Anything chargeable comes from the extras the customer ticked.
  const { lines: extraLines, total: delivery } = deliveryBreakdown(extras)
  const grandTotal = totalAmount + delivery

  return (
    <div
      data-ground="dark"
      className={`rounded-md border border-calico-50/[0.06] bg-ink-900 ${compact ? 'px-4 py-3.5' : 'p-5'}`}
    >
      {!compact && (
        <div className="mb-4 font-data text-eyebrow font-bold uppercase tracking-[0.2em] text-ember-300">
          Order Summary
        </div>
      )}

      {/* Items */}
      <div className="mb-4 flex flex-col gap-3">
        {cartItems.map((item, i) => (
          <div key={`${item.variant_id}-${i}`} className="flex items-center gap-3">
            <div className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-sm bg-ink-900">
              <Image
                src={item.image_url || '/placeholder.svg'}
                alt={item.title}
                fill
                sizes="46px"
                className="object-cover"
              />
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-pill bg-ember-500 text-caption font-bold text-ink-900">
                {item.quantity}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-caption font-semibold text-calico-300">{item.title}</div>
              <div className="mt-0.5 truncate text-caption text-calico-300">
                {item.color}
                {item.fabric_code && (
                  <span className="font-data text-ember-300"> · {item.fabric_code}</span>
                )}
              </div>
            </div>
            <div className="font-data tnum shrink-0 text-caption font-bold text-calico-50">
              £{(item.price * item.quantity).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      {/* ── What you owe right now ─────────────────────────────────────
          Which is nothing, and it is the single most reassuring fact about
          buying a sofa here. It was one 12px line of Ink 500 inside the
          trust strip at the foot of this box — a colour that measures about
          2.5:1 against Ink 900, so it was close to unreadable as well as
          buried. It is a panel now, above the numbers it qualifies. */}
      <div className="mb-4 rounded-sm bg-sage-700 p-4">
        <p className="m-0 flex items-center gap-2 text-body-sm font-semibold text-calico-50">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-sage-300" />
          Nothing to pay today
        </p>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
          {[
            'No card details needed',
            'Nothing leaves your account now',
            'Pay cash or by bank transfer when it arrives',
          ].map(line => (
            <li key={line} className="flex items-start gap-2 text-caption leading-relaxed text-sage-50">
              <Check aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-sage-300" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-2 border-t border-calico-50/[0.07] pt-3">
        <div className="flex justify-between text-caption text-calico-300">
          <span>Subtotal</span>
          <span className="font-data tnum">£{totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-caption text-calico-300">
          <span>Delivery · UK Mainland</span>
          <span className="font-bold text-sage-300">FREE</span>
        </div>

        {/* Each chosen extra as its own line, so the total is never a mystery. */}
        {extraLines.map(line => (
          <div key={line.key} className="flex justify-between gap-3 text-caption text-calico-300">
            <span className="min-w-0">
              {line.label}
              {line.detail && <span> · {line.detail}</span>}
            </span>
            <span className="font-data tnum shrink-0 text-calico-50">£{line.amount.toFixed(2)}</span>
          </div>
        ))}

        <div className="mt-1 flex justify-between border-t border-calico-50/[0.07] pt-2 text-body font-extrabold text-calico-50">
          <span>Total due on delivery</span>
          <span className="font-data tnum text-ember-300">£{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Trust strip */}
      {!compact && (
        <div className="mt-4 flex flex-col gap-2 border-t border-calico-50/[0.06] pt-4">
          {([
            [ShieldCheck, PROMISES.guarantee.short],
            [Truck, PROMISES.delivery.long],
          ] as const).map(([Icon, text]) => (
            <div key={text} className="flex items-center gap-2">
              {/* `as const` above keeps Icon a callable component type. Without it the
                  tuple widens to a union TS cannot call, which is why this line
                  used to carry a suppression comment. */}
              <Icon aria-hidden="true" className="h-3 w-3 shrink-0 text-ember-300" />
              <span className="text-caption text-calico-300">{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── STEP 2: Delivery details ─────────────────────────────────────────────────
function DetailsStep({
  onBack, onSuccess, extras, setExtras,
}: {
  onBack: () => void
  onSuccess: (id: string, postcode: string, amount: number) => void
  extras: DeliveryOptions
  setExtras: (next: DeliveryOptions) => void
}) {
  const { cartItems, totalAmount, clearCart } = useCart()
  // A line with a fabric is a line that has to be built. Nothing else in the
  // basket knows whether a product was flagged made-to-order, and it does not
  // need to - the fabric is the thing that makes it one.
  const madeToOrder = cartItems.some(i => i.fabric_id)
  const extrasTotal = deliveryTotal(extras)
  const grandTotal = totalAmount + extrasTotal
  const [form, setForm] = useState<FormState>({
    customerName: '', customerEmail: '', customerPhone: '',
    postcode: '', shippingAddress: '', specialInstructions: '', // NEW POSTCODE FIELD
  })

  const [errors, setErrors] = useState<FieldError>({})
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState('')

  // Postcode Lookup State
  const [addresses, setAddresses] = useState<string[]>([])
  const [searchingPostcode, setSearchingPostcode] = useState(false)
  /** Set once a postcode has been confirmed as one we deliver to, free. */
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const set = (k: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const validate = (): boolean => {
    const errs: FieldError = {}
    if (form.customerName.trim().length < 2) errs.customerName = 'Please enter your full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) errs.customerEmail = 'Please enter a valid email address'
    if (!isValidUkMobile(form.customerPhone)) errs.customerPhone = UK_MOBILE_ERROR
    if (form.postcode.trim().length < 5) errs.postcode = 'Please enter a valid UK postcode'
    if (form.shippingAddress.trim().length < 5) errs.shippingAddress = 'Please enter your full delivery address'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // The request itself now lives in src/utils/postcode.ts, so the product
  // page's delivery estimator and this form ask Homedata the same question in
  // the same way. Only the error handling is local, because only this form has
  // a manual-entry field to fall back to.
  const handleFindAddress = async () => {
    if (!form.postcode || form.postcode.trim().length < 5) {
      setErrors(e => ({ ...e, postcode: 'Please enter a valid postcode first.' }));
      return;
    }

    setSearchingPostcode(true);
    setErrors(e => { const n = { ...e }; delete n.postcode; return n; });
    setAddresses([]);

    try {
      setAddresses(await lookupAddresses(form.postcode))
      setConfirmed(normalisePostcode(form.postcode));
    } catch (err) {
      // The customer can always type the address by hand below, so a failure
      // here is a prompt rather than a dead end.
      const message = err instanceof Error ? err.message : '';
      setConfirmed(null)
      setErrors(e => ({ ...e, postcode: message || 'Lookup failed. Please type your address below.' }));
    } finally {
      setSearchingPostcode(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setPending(true); setServerError('')

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      // We append the postcode to the shipping address so your backend schema doesn't need to change
      if (k === 'shippingAddress') {
         fd.append('shippingAddress', `${v}, ${form.postcode.toUpperCase()}`);
      } else {
         fd.append(k, v)
      }
    })

    // Ids and quantities only - the database looks up every price itself, so a
    // tampered request can't change what an order costs.
    const items = cartItems.map(i => ({
      variant_id: i.variant_id,
      quantity: i.quantity,
      fabric_id: i.fabric_id ?? null,
    }))

    const res = await placeOrder(fd, items, grandTotal, extras)

    if (res?.error) { setServerError(res.error); setPending(false) }
    else if (res?.success) {
      // The database's figure, not ours, so reported conversion value always
      // matches what we actually collect - and total_amount is delivery
      // inclusive, so paid extras are credited to the campaign too. Items are
      // read before clearCart(), which empties the array this maps over.
      trackOrderPlaced(res.orderId || '', res.total ?? grandTotal, toTrackedItems(cartItems));
      clearCart();
      onSuccess(res.orderId || '', form.postcode.toUpperCase(), res.total ?? grandTotal)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-caption text-ink-500"
      >
        <ArrowLeft aria-hidden="true" className="h-3 w-3" /> Back to Cart
      </button>

      <div className="mb-1 font-data text-eyebrow font-bold uppercase tracking-[0.2em] text-ember-700">
        Delivery Information
      </div>
      <p className="mb-4 text-caption text-ink-500">
        Delivered free to UK Mainland, ground floor. We&apos;ll call before arrival.
      </p>

      {serverError && (
        <div className="mb-4 rounded-sm border border-rust-200 bg-rust-50 px-4 py-3 text-caption text-rust-700">
          {serverError}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4">

        {/* Basic Info Fields */}
        <Field label="Full Name" name="customerName" value={form.customerName} onChange={set('customerName')} error={errors.customerName} />
        <Field label="Email Address" type="email" name="customerEmail" hint="Your order confirmation will be sent here" value={form.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail} />
        <Field label="Mobile Number" type="tel" name="customerPhone" hint="A UK mobile — our driver calls before delivery, and we message you on WhatsApp" value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} />

        {/* NEW: Postcode Lookup Section */}
        <div>
          <label className="mb-2 flex items-center gap-1 font-data text-eyebrow font-bold uppercase tracking-[0.15em] text-ink-500">
             Postcode <span className="text-ember-700">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
               <MapPin aria-hidden="true" className="absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
               <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => set('postcode')(e.target.value.toUpperCase())}
                  className={`${fieldClass(!!errors.postcode)} uppercase`}
               />
            </div>
            <button
               type="button"
               onClick={handleFindAddress}
               disabled={searchingPostcode || form.postcode.length < 5}
               className="flex cursor-pointer items-center gap-2 rounded-sm border-0 bg-ink-900 px-4 text-caption font-bold text-calico-50 transition-[background-color,opacity] duration-swift ease-out-expo disabled:cursor-not-allowed disabled:opacity-60"
            >
               {searchingPostcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
               Find
            </button>
          </div>
          {errors.postcode && <p className="mt-1 text-caption text-rust-700">{errors.postcode}</p>}
          {/* Confirmation, not decoration: "free" is the fact a customer is
              actually checking for, and it was never stated against their own
              address. Grows in rather than appearing, so it reads as an answer
              arriving. */}
          {confirmed && !errors.postcode && (
            <div
              className="mt-2 grid grid-rows-[1fr] transition-[grid-template-rows] duration-base ease-out-expo"
              aria-live="polite"
            >
              <p className="m-0 flex items-center gap-2 overflow-hidden rounded-sm border border-sage-300 bg-sage-50 px-3 py-2 text-body-sm font-semibold text-sage-700">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                We deliver free to {confirmed}
              </p>
            </div>
          )}
        </div>

        {/* Custom Address Dropdown */}
        {addresses.length > 0 && (
          <div className="relative animate-[fadeIn_var(--dur-base)_var(--ease-out-expo)]">
            {/* The Trigger Button */}
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-sm border-[1.5px] border-ember-500 bg-calico-50 px-4 py-3 text-left text-body-sm outline-none ${
                form.shippingAddress ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              <span className="truncate pr-3">
                {form.shippingAddress || "Select your address..."}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-ember-700 transition-transform duration-swift ease-out-expo ${
                  dropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {/* The Floating Menu. max-h-60 keeps it off the whole screen. */}
            {dropdownOpen && (
              <div className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-60 flex-col overflow-y-auto rounded-sm border border-calico-300 bg-calico-50 shadow-e1">
                {addresses.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      set('shippingAddress')(addr);
                      setDropdownOpen(false); // Close after selection
                    }}
                    // last:border-b-0 rather than comparing i to the array
                    // length, and leading-snug so a long address wraps.
                    className={`cursor-pointer border-0 border-b border-calico-100 px-4 py-3 text-left text-caption leading-snug transition-colors duration-press ease-out-expo last:border-b-0 ${
                      form.shippingAddress === addr
                        ? 'bg-ember-500/10 font-bold text-ink-900'
                        : 'bg-transparent font-medium text-ink-500'
                    }`}
                  >
                    {addr}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manual Address Field (Always visible for manual edits) */}
        <Field label="Full Address" name="shippingAddress" type="textarea" value={form.shippingAddress} onChange={set('shippingAddress')} error={errors.shippingAddress} />

        <Field label="Special Instructions" name="specialInstructions" required={false} type="textarea" value={form.specialInstructions} onChange={set('specialInstructions')} />
      </div>

      {/* ── Optional delivery extras ── */}
      <div className="mb-4">
        <div className="mb-1 font-data text-eyebrow font-bold uppercase tracking-[0.2em] text-ember-700">
          Delivery Options
        </div>
        <p className="mb-3 text-caption leading-relaxed text-ink-500">
          Delivery to a UK Mainland ground floor is free. Add anything else you need —
          your total updates as you go, and you still pay on delivery.
        </p>

        <div className="flex flex-col gap-2">

          <ExtraOption
            checked={extras.floor > 0}
            onToggle={on => setExtras({ ...extras, floor: on ? 1 : 0, hasLift: on ? extras.hasLift : false })}
            title="Upstairs delivery"
            note={`£${UPSTAIRS_FIRST_FLOOR} to the first floor or any floor with a lift, £${UPSTAIRS_PER_EXTRA_FLOOR} per extra floor without one.`}
            price={extras.floor > 0 ? deliveryBreakdown(extras).lines.find(l => l.key === 'upstairs')?.amount ?? 0 : UPSTAIRS_FIRST_FLOOR}
            priceIsFrom={extras.floor === 0}
          >
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-caption font-semibold text-ink-500">Floor</span>
                <div className="flex items-center overflow-hidden rounded-sm border border-calico-300 bg-calico-50">
                  <button type="button" aria-label="Fewer floors"
                    onClick={() => setExtras({ ...extras, floor: Math.max(1, extras.floor - 1) })}
                    className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-700 hover:bg-calico-200">
                    <Minus aria-hidden="true" className="h-3 w-3" />
                  </button>
                  <span className="min-w-[30px] text-center text-body-sm font-bold text-ink-900">{extras.floor}</span>
                  <button type="button" aria-label="More floors"
                    onClick={() => setExtras({ ...extras, floor: Math.min(20, extras.floor + 1) })}
                    className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-700 hover:bg-calico-200">
                    <Plus aria-hidden="true" className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-caption text-ink-500">{floorName(extras.floor)}</span>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-caption text-ink-500">
                <input
                  type="checkbox"
                  checked={extras.hasLift}
                  onChange={e => setExtras({ ...extras, hasLift: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-ember-500"
                />
                There&apos;s a lift
              </label>
            </div>
          </ExtraOption>

          <ExtraOption
            checked={extras.assembly}
            onToggle={on => setExtras({ ...extras, assembly: on })}
            title="Assembly"
            note="Our team assembles the sofa in the room for you."
            price={ASSEMBLY_FEE}
          />

          <ExtraOption
            checked={extras.sofaRemoval}
            onToggle={on => setExtras({ ...extras, sofaRemoval: on })}
            title="Old sofa removal"
            note="We take your old sofa away. This is an estimate — for very large items the team will contact you to confirm before delivery."
            price={SOFA_REMOVAL_FEE}
          />
        </div>

        <p className="mt-3 text-caption leading-relaxed text-ink-500">
          {DELIVERY_AREA_NOTE}
        </p>
      </div>

      {/* ── How you pay ── */}
      <div className="mb-4">
        <div className="mb-1 font-data text-eyebrow font-bold uppercase tracking-[0.2em] text-ember-700">
          How You Pay
        </div>
        <p className="mb-3 text-caption leading-relaxed text-ink-500">
          Nothing is taken now. You pay once your sofa has arrived and you&apos;re happy with it —
          choose either method on the day, there&apos;s nothing to decide here.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-sm border border-calico-300 bg-calico-50 px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
              <span className="text-body-sm font-bold text-ink-900">Cash</span>
            </div>
            <p className="m-0 text-caption leading-relaxed text-ink-500">
              Hand the full amount to our driver when your sofa is delivered.
            </p>
          </div>

          <div className="rounded-sm border border-calico-300 bg-calico-50 px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <Landmark aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
              <span className="text-body-sm font-bold text-ink-900">Bank transfer</span>
            </div>
            <p className="m-0 text-caption leading-relaxed text-ink-500">
              Transfer <strong>at the door</strong>, not in advance. Our
              driver gives you the account details and waits for the payment to show.
            </p>
          </div>
        </div>

        {/* The panel stating what is owed. Its background and its border were
            both written as `${ACCENT}10` / `${ACCENT}22` — hex digits
            concatenated onto a var(), which parses as nothing, so this box had
            neither of them. */}
        <div className="mt-3 flex items-start gap-3 rounded-sm border border-ember-500/20 bg-ember-500/[0.07] px-4 py-3">
          <ShieldCheck aria-hidden="true" className="mt-px h-4 w-4 shrink-0 text-ember-700" />
          <div className="text-caption leading-relaxed text-ink-500">
            Your total due on delivery is <strong className="font-data tnum text-ink-900">£{grandTotal.toFixed(2)}</strong>
            {extrasTotal > 0 && (
              <span> (£{totalAmount.toFixed(2)} for your order plus £{extrasTotal.toFixed(2)} of delivery extras)</span>
            )}.
            <span className="mt-1 block">
              We don&apos;t accept card payments of any kind.
            </span>
          </div>
        </div>
      </div>

      {/* ── Made to order ────────────────────────────────────────────────
          Only when a basket line carries a fabric, which is the same thing as
          saying the sofa has to be built. Two facts belong here rather than
          only on the product page: that a person will ring to confirm the
          specification, and that a made-to-measure item carries no 14-day
          right to change your mind. The second one is a term of the sale, and
          a term of the sale belongs at the point of sale. */}
      {madeToOrder && (
        <div className="mb-4 rounded-sm border border-indigo-300 bg-indigo-50 px-4 py-3">
          <p className="m-0 flex items-center gap-2 text-body-sm font-semibold text-indigo-700">
            <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
            We&apos;ll call you to confirm this one
          </p>
          <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
            Your sofa is built to order in the fabric you chose, so one of our team will ring
            you to go through the details before anything is made. Nothing is charged in the
            meantime — you still pay on delivery.
          </p>
          <p className="m-0 mt-3 flex gap-2 border-t border-indigo-300 pt-3 text-caption leading-relaxed text-ink-500">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
            <span>
              <strong className="text-ink-900">Because it&apos;s made to your specification</strong>,
              the 14-day right to change your mind doesn&apos;t apply — that&apos;s the standard
              exemption under the Consumer Contracts Regulations. Faulty or damaged items are
              covered exactly as normal.
            </span>
          </p>
        </div>
      )}

      {/* THE MOST IMPORTANT BUTTON ON THE SITE, and it was breaking the one
          rule the palette calls load-bearing.

          It read `background: ACCENT` with `color: var(--color-calico-50)` —
          near-white letterforms on Ember 500, which measures 2.9:1 and fails
          AA at any size. tokens.css states it outright: "an ember-500 button
          always carries ink-900 text (6.6:1), never white (2.9:1)", and the
          quantity badge in the summary already does exactly that. Only the
          submit button had it backwards.

          The glow was not rendering either — `0 6px 24px ${ACCENT}44`, the same
          concatenation bug as above. It carries the real --shadow-ember token
          now. */}
      <button
        type="submit"
        disabled={pending}
        className={`flex h-14 w-full items-center justify-center gap-3 rounded-pill border-0 font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-[background-color,box-shadow] duration-swift ease-out-expo ${
          pending
            ? 'cursor-wait bg-ink-500 text-calico-50'
            : 'hover-btn btn-ember sheen shadow-ember cursor-pointer bg-ember-500 text-ink-900'
        }`}
      >
        {pending
          ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Placing Order…</>
          : <><ShoppingBag aria-hidden="true" className="h-4 w-4" /> Place Order</>
        }
      </button>

      <p className="mt-3 text-center text-caption leading-relaxed text-ink-500">
        By placing this order you agree to pay on delivery. We&apos;ll send a confirmation email with a tracking link.
      </p>
    </form>
  )
}

export default function CheckoutClient() {
  const [step, setStep] = useState<Step>('cart')
  const [orderId, setOrderId] = useState('')
  const [orderPostcode, setOrderPostcode] = useState('')
  /** What the database says this order costs. Held because the cart empties. */
  const [orderAmount, setOrderAmount] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(true)
  // Held here rather than in DetailsStep so the order summary - which renders in
  // the sidebar and again in the mobile drawer - reflects every tick live.
  const [extras, setExtras] = useState<DeliveryOptions>(NO_EXTRAS)
  const { cartItems, totalAmount } = useCart()

  const transition = useCallback((nextStep: Step, dir: 'forward' | 'back') => {
    setDirection(dir)
    setVisible(false)
    // Half of --dur-base. The outgoing step is mid-fade when the incoming one
    // is mounted, so the two overlap instead of queueing.
    setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 190)
  }, [])

  // Fired on the way from the basket into the details form - the moment the
  // visitor commits to checking out. Sits in the click handler rather than in
  // an effect on `step`, so it cannot re-fire if the user navigates back to the
  // cart and forward again, and is not double-counted under StrictMode.
  const goNext = () => {
    if (cartItems.length > 0) {
      trackInitiateCheckout(toTrackedItems(cartItems), totalAmount)
    }
    transition('details', 'forward')
  }
  const goBack   = () => transition('cart', 'back')
  const goSuccess = (id: string, postcode: string, amount: number) => {
    setOrderId(id)
    setOrderPostcode(postcode)
    setOrderAmount(amount)
    transition('success', 'forward')
  }

  return (
    // This page used to open with a <style> block declaring @keyframes spin and
    // @keyframes pulseRing. globals.css already defines spin, so that was a
    // duplicate shipped on every checkout, and nothing anywhere on the site has
    // ever referenced pulseRing. Both are gone.
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50 pb-16">

      {/* Header strip */}
      {/* The ink gradient, and a fading ember rule along the bottom rather
          than a flat 2px bar — the same edge the announcement bar, the mega
          menu and both collection headers carry. */}
      <div data-ground="dark" className="grad-ink relative bg-ink-900">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5"
          style={{ backgroundImage: 'var(--grad-rule)' }}
        />
        <div className="mx-auto flex max-w-[60rem] items-center justify-between p-4">
          <Link href="/" className="no-underline">
            {/* Ember 300, not Ember 700. Ember 700 is the amber a LIGHT ground
                takes; on Ink 900 it is dark on dark. Same correction on the
                shield to the right. */}
            <span className="font-body text-lead font-bold text-calico-50">
              UK Sofa <span className="text-ember-300">Shop</span>
            </span>
          </Link>
          {step !== 'success' && (
            // Ink 500 on Ink 900 measures about 2.5:1 — this line was very
            // nearly invisible. Calico 300 is the ramp's colour for secondary
            // type on a dark ground.
            <div className="flex items-center gap-2 text-caption text-calico-300">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-ember-300" />
              Secure Checkout
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[60rem] px-4 py-6">

        {/* The whole flow had no level-1 heading — three steps, a stepper
            and a form, and nothing naming the page. It is visually hidden
            because the stepper already says where you are on screen, and a
            second visible title above it would be repeating itself. */}
        <h1 className="sr-only">
          {step === 'cart' ? 'Your cart'
            : step === 'details' ? 'Delivery details'
            : 'Order confirmed'}
        </h1>

        {/* Steps indicator */}
        {step !== 'success' && <Steps current={step} />}

        {/* All classes. This grid carried `gridTemplateColumns: 'auto'` inline
            beside `lg:grid-cols-[1fr_340px]`, and an inline declaration beats
            every class — so the two-column layout never applied and the order
            summary sat below the form at every width instead of beside it. */}
        <div className={`grid gap-4 ${step === 'success' ? 'grid-cols-1' : 'lg:grid-cols-[1fr_340px]'}`}>

          {/* Main panel */}
          <div
            // 380ms, and the outgoing step is already fading as the incoming
            // one starts — see goNext/goBack, where the swap happens a beat
            // into the fade rather than after it.
            className={`rounded-md border border-calico-300 bg-calico-50 p-4 shadow-e1 transition-[opacity,transform] duration-base ease-out-expo sm:p-6 ${
              step === 'success' ? 'mx-auto max-w-[520px]' : ''
            } ${
              visible
                ? 'translate-x-0 opacity-100'
                : direction === 'forward' ? 'translate-x-10 opacity-0' : '-translate-x-10 opacity-0'
            }`}
          >
            {step === 'cart'    && <CartStep onNext={goNext} />}
            {step === 'details' && <DetailsStep onBack={goBack} onSuccess={goSuccess} extras={extras} setExtras={setExtras} />}
            {step === 'success' && <SuccessStep orderId={orderId} postcode={orderPostcode} amount={orderAmount} />}
          </div>

          {/* Sidebar — hidden on success */}
          {step !== 'success' && cartItems.length > 0 && (
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <OrderSummary extras={extras} />
              </div>
            </div>
          )}
        </div>

        {/* ── The total, pinned ─────────────────────────────────────────
            This was a <details> between the form and the foot of the page,
            so on a phone the delivery form was pushed down by a block most
            people never opened — and the number they wanted was below it
            either way. It is a bar now: the total always on screen, the
            breakdown rising over the page when asked for. */}
        {step !== 'success' && cartItems.length > 0 && (
          <MobileTotalBar
            total={totalAmount + deliveryTotal(extras)}
            itemCount={cartItems.reduce((n, i) => n + i.quantity, 0)}
          >
            <OrderSummary extras={extras} />
          </MobileTotalBar>
        )}
      </div>
    </div>
  )
}
