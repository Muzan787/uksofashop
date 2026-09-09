'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingBag, Plus, Minus,
  ArrowLeft, Truck, Wallet, ShieldCheck,
  Loader2,
  MapPin, Check, Search,
  ChevronDown, Landmark,
  Phone, AlertTriangle, MessageCircle,
} from 'lucide-react'
import { useCart, type DisplayCartItem } from '@/context/CartContext'
import {
  placeOrder,
  checkDeliveryPostcode,
  type DeliveryCheckResult,
} from '@/app/actions/checkout'
import { quoteOffer } from '@/app/actions/offer'
import {
  trackOrderPlaced,
  trackInitiateCheckout,
  setMetaIdentity,
  type TrackedItem,
} from '@/utils/tracking'
import { PROMISES } from '@/constants/promises'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import {
  ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR, UPSTAIRS_PER_EXTRA_FLOOR,
  DELIVERY_AREA_NOTE, NO_EXTRAS, deliveryBreakdown, deliveryTotal, floorName,
  type DeliveryOptions,
} from '@/constants/delivery'
import { isValidUkPostcode, lookupAddresses, normalisePostcode } from '@/utils/postcode'
import { useWhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA'
import CartStep from './CartStep'
import Steps from './Steps'
import Field from '@/components/UI/Field'
import MobileTotalBar from './MobileTotalBar'
import SuccessStep from './SuccessStep'
import AdsPurchaseConversion from './AdsPurchaseConversion'
import OfferCode from './OfferCode'
import { useOffer } from '@/components/Offer/OfferProvider'

// ─── Types ────────────────────────────────────────────────────────────────────
import type { Step } from './Steps'
import type { OfferQuote } from '@/types/offers'

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

/** Only identities/quantities go to the offer/order authority, never prices. */
function toOfferItems(items: DisplayCartItem[]) {
  return items.map(i => ({
    variant_id: i.variant_id,
    quantity: i.quantity,
    fabric_id: i.fabric_id ?? null,
  }))
}

/** A quote is valid only for the exact basket identities and quantities it saw. */
function basketOfferKey(items: DisplayCartItem[]): string {
  return items
    .map(i => `${i.variant_id}:${i.fabric_id ?? ''}:${i.quantity}`)
    .sort()
    .join('|')
}

interface FormState {
  customerName: string
  customerEmail: string
  customerPhone: string
  postcode: string
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
function OrderSummary({
  compact = false,
  extras = NO_EXTRAS,
  offer = null,
  deliveryStatus = null,
}: {
  compact?: boolean
  extras?: DeliveryOptions
  offer?: OfferQuote | null
  deliveryStatus?: DeliveryCheckResult['status'] | null
}) {
  const { cartItems, totalAmount } = useCart()
  const { lines: extraLines, total: delivery } = deliveryBreakdown(extras)
  const discount = offer?.valid ? offer.discountAmount : 0
  const grandTotal = Math.max(0, totalAmount - discount) + delivery
  const quoteRequired = deliveryStatus === 'custom_quote'

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
              <div className="text-caption font-semibold leading-snug text-calico-300">{item.title}</div>
              <div className="mt-0.5 break-words text-caption leading-snug text-calico-300">
                {item.fabric_label || item.color}
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

      <div className="mb-4 rounded-sm bg-sage-700 p-4">
        <p className="m-0 flex items-center gap-2 text-body-sm font-semibold text-calico-50">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-sage-300" />
          Nothing to pay today
        </p>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
          {[
            'No card details needed',
            'Nothing leaves your account now',
            quoteRequired
              ? 'We confirm the delivery charge before taking a non-mainland order'
              : 'Pay cash or by bank transfer when it arrives',
          ].map(line => (
            <li key={line} className="flex items-start gap-2 text-caption leading-relaxed text-sage-50">
              <Check aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-sage-300" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-calico-50/[0.07] pt-3">
        <div className="flex justify-between text-caption text-calico-300">
          <span>Subtotal</span>
          <span className="font-data tnum">£{totalAmount.toFixed(2)}</span>
        </div>
        {offer?.valid && (
          <div className="flex justify-between gap-3 text-caption text-calico-300">
            <span className="min-w-0">
              {offer.offerSource === 'paid_entitlement'
                ? 'Online offer'
                : `Offer${offer.normalizedCode ? ` · ${offer.normalizedCode}` : ''}`}
            </span>
            <span className="font-data tnum shrink-0 font-bold text-sage-300">
              {discount > 0 ? `−£${discount.toFixed(2)}` : '£0.00'}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-3 text-caption text-calico-300">
          <span>{quoteRequired ? 'Delivery · Custom quote' : 'Delivery · UK Mainland'}</span>
          <span className={`shrink-0 font-bold ${quoteRequired ? 'text-ember-300' : 'text-sage-300'}`}>
            {quoteRequired ? 'TO CONFIRM' : 'FREE'}
          </span>
        </div>

        {extraLines.map(line => (
          <div key={line.key} className="flex justify-between gap-3 text-caption text-calico-300">
            <span className="min-w-0">
              {line.label}
              {line.detail && <span> · {line.detail}</span>}
            </span>
            <span className="font-data tnum shrink-0 text-calico-50">£{line.amount.toFixed(2)}</span>
          </div>
        ))}

        <div className="mt-1 flex justify-between gap-3 border-t border-calico-50/[0.07] pt-2 text-body font-extrabold text-calico-50">
          <span>{quoteRequired ? 'Current online subtotal' : 'Total due on delivery'}</span>
          <span className="font-data tnum shrink-0 text-ember-300">£{grandTotal.toFixed(2)}</span>
        </div>
        {quoteRequired && (
          <p className="m-0 text-caption leading-relaxed text-calico-300">
            Your product offer stays applied. A delivery charge is agreed separately before an order is taken.
          </p>
        )}
      </div>

      {!compact && (
        <div className="mt-4 flex flex-col gap-2 border-t border-calico-50/[0.06] pt-4">
          {([
            [ShieldCheck, PROMISES.guarantee.short],
            [Truck, quoteRequired ? 'Non-mainland delivery is confirmed by quote first' : PROMISES.delivery.long],
          ] as const).map(([Icon, text]) => (
            <div key={text} className="flex items-center gap-2">
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
  onBack, onSuccess, extras, setExtras, form, setForm,
  offer, offerCodeInput, setOfferCodeInput, appliedPromotionCode,
  offerPending, offerError, onApplyOffer,
  deliveryCheck, setDeliveryCheck,
}: {
  onBack: () => void
  onSuccess: (id: string, postcode: string, amount: number) => void
  extras: DeliveryOptions
  setExtras: (next: DeliveryOptions) => void
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  offer: OfferQuote | null
  offerCodeInput: string
  setOfferCodeInput: (next: string) => void
  appliedPromotionCode: string | null
  offerPending: boolean
  offerError: string
  onApplyOffer: () => void
  deliveryCheck: DeliveryCheckResult | null
  setDeliveryCheck: React.Dispatch<React.SetStateAction<DeliveryCheckResult | null>>
}) {
  const { cartItems, totalAmount, clearCart } = useCart()
  const madeToOrder = cartItems.some(i => i.fabric_id)
  const extrasTotal = deliveryTotal(extras)
  const offerDiscount = offer?.valid ? offer.discountAmount : 0
  const grandTotal = Math.max(0, totalAmount - offerDiscount) + extrasTotal

  const [errors, setErrors] = useState<FieldError>({})
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [checkingDelivery, setCheckingDelivery] = useState(false)

  const [addresses, setAddresses] = useState<string[]>([])
  const [searchingPostcode, setSearchingPostcode] = useState(false)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const set = (k: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const setPostcode = (value: string) => {
    set('postcode')(value.toUpperCase())
    // Removing the old decision synchronously is what prevents a stale
    // mainland=true state surviving while a new custom-quote postcode is being
    // checked. The six form fields themselves are deliberately untouched.
    setDeliveryCheck(null)
    setConfirmed(null)
    setAddresses([])
    setDropdownOpen(false)
    setServerError('')
  }

  // Resolve every complete postcode as the customer types. This response is
  // only UX state; placeOrder independently resolves the actual postcode again.
  useEffect(() => {
    const raw = form.postcode.trim()
    if (!isValidUkPostcode(raw)) {
      setCheckingDelivery(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setCheckingDelivery(true)
      void checkDeliveryPostcode(raw)
        .then(result => {
          if (cancelled) return
          setDeliveryCheck(result)
          if (result.status === 'mainland') setConfirmed(result.postcode)
          else setConfirmed(null)
        })
        .catch(() => {
          if (!cancelled) setDeliveryCheck(null)
        })
        .finally(() => {
          if (!cancelled) setCheckingDelivery(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [form.postcode, setDeliveryCheck])

  const validate = (): boolean => {
    const errs: FieldError = {}
    if (form.customerName.trim().length < 2) errs.customerName = 'Please enter your full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) errs.customerEmail = 'Please enter a valid email address'
    if (!isValidUkMobile(form.customerPhone)) errs.customerPhone = UK_MOBILE_ERROR
    if (!isValidUkPostcode(form.postcode)) errs.postcode = 'Please enter a valid UK postcode'
    if (form.shippingAddress.trim().length < 5) errs.shippingAddress = 'Please enter your full delivery address'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleFindAddress = async () => {
    if (!isValidUkPostcode(form.postcode)) {
      setErrors(e => ({ ...e, postcode: 'Please enter a valid UK postcode first.' }))
      return
    }

    setSearchingPostcode(true)
    setErrors(e => { const n = { ...e }; delete n.postcode; return n })
    setAddresses([])

    try {
      const decision = await checkDeliveryPostcode(form.postcode)
      setDeliveryCheck(decision)

      if (decision.status === 'invalid') {
        setConfirmed(null)
        setErrors(e => ({ ...e, postcode: decision.message }))
        return
      }
      if (decision.status === 'custom_quote') {
        setConfirmed(null)
        return
      }

      setConfirmed(decision.postcode)
      setAddresses(await lookupAddresses(decision.postcode))
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setErrors(e => ({ ...e, postcode: message || 'Lookup failed. Please type your address below.' }))
    } finally {
      setSearchingPostcode(false)
    }
  }

  const quoteItemLines = cartItems.map(item => {
    const configuration = [
      item.fabric_label || item.color,
      item.fabric_code ? `code ${item.fabric_code}` : '',
    ].filter(Boolean).join(', ')
    return `- ${item.title}${configuration ? ` (${configuration})` : ''} x ${item.quantity}`
  }).join('\n')
  const quoteOfferContext = offer?.valid
    ? offerDiscount > 0
      ? `£${offerDiscount.toFixed(0)} product/order offer currently applied`
      : 'Offer checked; no product discount applies to this basket'
    : 'No online product offer currently applied'
  const quoteExtras = deliveryBreakdown(extras).lines
    .map(line => `${line.label}${line.detail ? ` (${line.detail})` : ''}`)
    .join(', ') || 'None selected'
  const quoteMessage = [
    "Hi, I'd like a delivery quote for my order.",
    '',
    `Postcode: ${normalisePostcode(form.postcode)}`,
    '',
    'Items:',
    quoteItemLines || '- Basket details available in checkout',
    '',
    `Current online offer: ${quoteOfferContext}`,
    `Selected delivery extras: ${quoteExtras}`,
    '',
    'Please let me know the delivery charge and whether delivery is available.',
  ].join('\n')
  const deliveryQuoteCta = useWhatsAppCTA({
    message: quoteMessage,
    pageContext: 'checkout_delivery_quote',
    acquisition: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (offerPending || !validate()) return

    setServerError('')

    // Do not trust a client-side decision, even our own previous one. Recheck
    // the actual postcode immediately before invoking the order Server Action.
    let currentDecision = deliveryCheck
    if (currentDecision?.postcode !== normalisePostcode(form.postcode)) {
      setCheckingDelivery(true)
      try {
        currentDecision = await checkDeliveryPostcode(form.postcode)
        setDeliveryCheck(currentDecision)
      } catch {
        setServerError('We could not confirm delivery for that postcode right now. Please try again.')
        setCheckingDelivery(false)
        return
      }
      setCheckingDelivery(false)
    }

    if (!currentDecision || currentDecision.status !== 'mainland') {
      if (currentDecision?.status === 'invalid') {
        setErrors(e => ({ ...e, postcode: currentDecision?.message || 'Please enter a valid UK postcode' }))
      }
      return
    }

    setPending(true)

    setMetaIdentity({
      email: form.customerEmail,
      phone: form.customerPhone,
      name: form.customerName,
      postcode: form.postcode,
    })

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))

    const items = toOfferItems(cartItems)
    const res = await placeOrder(fd, items, grandTotal, extras, appliedPromotionCode)

    if (res?.error) { setServerError(res.error); setPending(false) }
    else if (res?.success) {
      trackOrderPlaced(res.orderId, res.total, toTrackedItems(cartItems))
      clearCart()
      onSuccess(res.orderId, form.postcode.toUpperCase(), res.total)
    }
  }

  const customQuote = deliveryCheck?.status === 'custom_quote'

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
        <Field label="Full Name" name="customerName" value={form.customerName} onChange={set('customerName')} error={errors.customerName} />
        <Field label="Email Address" type="email" name="customerEmail" hint="Your order confirmation will be sent here" value={form.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail} />
        <Field label="Mobile Number" type="tel" name="customerPhone" hint="A UK mobile — our driver calls before delivery, and we message you on WhatsApp" value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} />

        <div>
          <label className="mb-2 flex items-center gap-1 font-data text-eyebrow font-bold uppercase tracking-[0.15em] text-ink-500">
             Postcode <span className="text-ember-700">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
               <MapPin aria-hidden="true" className="absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
               <input
                  type="text"
                  name="postcode"
                  autoComplete="postal-code"
                  value={form.postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className={`${fieldClass(!!errors.postcode)} uppercase`}
               />
            </div>
            <button
               type="button"
               onClick={handleFindAddress}
               disabled={searchingPostcode || checkingDelivery || form.postcode.length < 5}
               className="flex cursor-pointer items-center gap-2 rounded-sm border-0 bg-ink-900 px-4 text-caption font-bold text-calico-50 transition-[background-color,opacity] duration-swift ease-out-expo disabled:cursor-not-allowed disabled:opacity-60"
            >
               {searchingPostcode || checkingDelivery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
               Find
            </button>
          </div>
          {errors.postcode && <p className="mt-1 text-caption text-rust-700">{errors.postcode}</p>}
          {checkingDelivery && !errors.postcode && (
            <p className="m-0 mt-2 flex items-center gap-2 text-caption text-ink-500" aria-live="polite">
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> Checking delivery area…
            </p>
          )}
          {confirmed && deliveryCheck?.status === 'mainland' && !errors.postcode && !checkingDelivery && (
            <div
              className="mt-2 grid grid-rows-[1fr] transition-[grid-template-rows] duration-base ease-out-expo"
              aria-live="polite"
            >
              <p className="m-0 flex items-center gap-2 overflow-hidden rounded-sm border border-sage-300 bg-sage-50 px-3 py-2 text-body-sm font-semibold text-sage-700">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                FREE UK Mainland delivery to {confirmed}
              </p>
            </div>
          )}
          {customQuote && !checkingDelivery && (
            <div className="mt-2 rounded-sm border border-calico-300 bg-calico-100 px-3 py-3" aria-live="polite">
              <p className="m-0 flex items-start gap-2 text-body-sm font-semibold text-ink-900">
                <Truck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
                Custom delivery quote needed for {deliveryCheck.postcode}
              </p>
              <p className="m-0 mt-1 text-caption leading-relaxed text-ink-500">
                We may still be able to deliver to you. Standard online checkout covers UK Mainland,
                so this address needs a custom delivery quote first.
              </p>
            </div>
          )}
        </div>

        {addresses.length > 0 && (
          <div className="relative animate-[fadeIn_var(--dur-base)_var(--ease-out-expo)]">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-sm border-[1.5px] border-ember-500 bg-calico-50 px-4 py-3 text-left text-body-sm outline-none ${
                form.shippingAddress ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              <span className="truncate pr-3">
                {form.shippingAddress || 'Select your address...'}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-ember-700 transition-transform duration-swift ease-out-expo ${
                  dropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-60 flex-col overflow-y-auto rounded-sm border border-calico-300 bg-calico-50 shadow-e1">
                {addresses.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      set('shippingAddress')(addr)
                      setDropdownOpen(false)
                    }}
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

        <Field label="Full Address" name="shippingAddress" type="textarea" value={form.shippingAddress} onChange={set('shippingAddress')} error={errors.shippingAddress} />
        <Field label="Special Instructions" name="specialInstructions" required={false} type="textarea" value={form.specialInstructions} onChange={set('specialInstructions')} />
      </div>

      <OfferCode
        value={offerCodeInput}
        onChange={setOfferCodeInput}
        quote={offer}
        pending={offerPending}
        error={offerError}
        onApply={onApplyOffer}
      />

      <div className="mb-4">
        <div className="mb-1 font-data text-eyebrow font-bold uppercase tracking-[0.2em] text-ember-700">
          Delivery Options
        </div>
        <p className="mb-3 text-caption leading-relaxed text-ink-500">
          Delivery to a UK Mainland ground floor is free. Add anything else you need —
          your current online subtotal updates as you go.
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

      <div className="mb-4">
        <div className="mb-1 font-data text-eyebrow font-bold uppercase tracking-[0.2em] text-ember-700">
          How You Pay
        </div>
        <p className="mb-3 text-caption leading-relaxed text-ink-500">
          Nothing is taken now. For a UK Mainland order, you pay once your sofa has arrived and you&apos;re happy with it.
          For a custom-quote destination, we agree the delivery charge with you first.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-sm border border-calico-300 bg-calico-50 px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
              <span className="text-body-sm font-bold text-ink-900">Cash</span>
            </div>
            <p className="m-0 text-caption leading-relaxed text-ink-500">
              Hand the full agreed amount to our driver when your sofa is delivered.
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

        <div className="mt-3 flex items-start gap-3 rounded-sm border border-ember-500/20 bg-ember-500/[0.07] px-4 py-3">
          <ShieldCheck aria-hidden="true" className="mt-px h-4 w-4 shrink-0 text-ember-700" />
          <div className="text-caption leading-relaxed text-ink-500">
            {customQuote ? (
              <>
                Your current online subtotal is <strong className="font-data tnum text-ink-900">£{grandTotal.toFixed(2)}</strong>.
                {' '}Your product offer remains applied; the custom delivery charge is confirmed separately.
              </>
            ) : (
              <>
                Your total due on delivery is <strong className="font-data tnum text-ink-900">£{grandTotal.toFixed(2)}</strong>
                {offerDiscount > 0 ? (
                  <span>
                    {' '} (£{totalAmount.toFixed(2)} subtotal − £{offerDiscount.toFixed(2)} offer{extrasTotal > 0 ? ` + £${extrasTotal.toFixed(2)} delivery extras` : ''})
                  </span>
                ) : extrasTotal > 0 ? (
                  <span> (£{totalAmount.toFixed(2)} for your order plus £{extrasTotal.toFixed(2)} of delivery extras)</span>
                ) : null}.
              </>
            )}
            <span className="mt-1 block">
              We don&apos;t accept card payments of any kind.
            </span>
          </div>
        </div>
      </div>

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

      {customQuote ? (
        <div className="rounded-md border border-calico-300 bg-calico-100 p-4 sm:p-5">
          <p className="m-0 text-body font-bold text-ink-900">Let&apos;s confirm delivery first</p>
          <p className="m-0 mt-2 text-body-sm leading-relaxed text-ink-500">
            We may still be able to deliver to your postcode. Your basket, configuration and online product offer stay unchanged; only the delivery charge and availability need confirming.
          </p>
          <a
            href={deliveryQuoteCta.href}
            onClick={deliveryQuoteCta.onClick}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-btn btn-ember sheen shadow-ember mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-pill bg-ember-500 px-5 text-center font-data text-eyebrow font-bold uppercase tracking-[0.08em] text-ink-900 no-underline"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            Get a Delivery Quote on WhatsApp
          </a>
          <p className="m-0 mt-3 text-center text-caption leading-relaxed text-ink-500">
            This is a delivery-support handoff, not a new advertising enquiry. No order is placed from this checkout until delivery is agreed.
          </p>
        </div>
      ) : (
        <>
          <button
            type="submit"
            disabled={pending || offerPending || checkingDelivery || deliveryCheck?.status !== 'mainland'}
            className={`flex h-14 w-full items-center justify-center gap-3 rounded-pill border-0 font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-[background-color,box-shadow] duration-swift ease-out-expo ${
              pending || checkingDelivery
                ? 'cursor-wait bg-ink-500 text-calico-50'
                : deliveryCheck?.status !== 'mainland'
                  ? 'cursor-not-allowed bg-ink-300 text-calico-50'
                  : 'hover-btn btn-ember sheen shadow-ember cursor-pointer bg-ember-500 text-ink-900'
            }`}
          >
            {pending
              ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Placing Order…</>
              : checkingDelivery
                ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Checking Delivery…</>
                : <><ShoppingBag aria-hidden="true" className="h-4 w-4" /> Place Order</>
            }
          </button>

          <p className="mt-3 text-center text-caption leading-relaxed text-ink-500">
            By placing this order you agree to pay on delivery. We&apos;ll send a confirmation email with a tracking link.
          </p>
        </>
      )}
    </form>
  )
}

export default function CheckoutClient() {
  const [step, setStep] = useState<Step>('cart')
  const [orderId, setOrderId] = useState('')
  const [orderPostcode, setOrderPostcode] = useState('')
  const [orderAmount, setOrderAmount] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(true)
  const [extras, setExtras] = useState<DeliveryOptions>(NO_EXTRAS)
  const [form, setForm] = useState<FormState>({
    customerName: '', customerEmail: '', customerPhone: '',
    postcode: '', shippingAddress: '', specialInstructions: '',
  })
  // Lives beside the six form fields so Delivery -> Cart -> Delivery does not
  // forget the fulfilment decision either. It is presentation state only; the
  // server re-runs the classification at placement time.
  const [deliveryCheck, setDeliveryCheck] = useState<DeliveryCheckResult | null>(null)

  const [offerCodeInput, setOfferCodeInput] = useState('')
  const [appliedPromotionCode, setAppliedPromotionCode] = useState<string | null>(null)
  const [offerQuote, setOfferQuote] = useState<OfferQuote | null>(null)
  const [quotedBasketKey, setQuotedBasketKey] = useState('')
  const [offerPending, setOfferPending] = useState(false)
  const [offerError, setOfferError] = useState('')

  const { cartItems, totalAmount } = useCart()
  const { active: automaticOfferActive } = useOffer()
  const currentBasketKey = basketOfferKey(cartItems)

  const offerAuthorityActive = Boolean(appliedPromotionCode) || automaticOfferActive
  const effectiveOffer = quotedBasketKey === currentBasketKey && offerAuthorityActive ? offerQuote : null
  const effectiveDiscount = effectiveOffer?.valid ? effectiveOffer.discountAmount : 0

  const applyOffer = async () => {
    const code = offerCodeInput
    if (!code.trim() || cartItems.length === 0) {
      setOfferError('Offer code not recognised.')
      return
    }

    const snapshotKey = currentBasketKey
    setOfferPending(true)
    setOfferError('')
    const res = await quoteOffer(toOfferItems(cartItems), code)
    setOfferPending(false)

    if (res?.error) {
      setOfferError(res.error)
      return
    }
    if (!res.success) {
      setOfferError('Offer code not recognised.')
      return
    }

    if (!res.quote.codeValid) {
      setOfferError('Offer code not recognised.')
      if (res.quote.valid && res.quote.offerSource === 'paid_entitlement') {
        setOfferQuote(res.quote)
        setQuotedBasketKey(snapshotKey)
      }
      return
    }

    if (!res.quote.valid) {
      setOfferError(res.quote.message || 'Offer code not recognised.')
      return
    }

    setAppliedPromotionCode(res.quote.normalizedCode)
    setOfferCodeInput(res.quote.normalizedCode ?? code.trim().toUpperCase())
    setOfferQuote(res.quote)
    setQuotedBasketKey(snapshotKey)
  }

  useEffect(() => {
    if ((!appliedPromotionCode && !automaticOfferActive) || cartItems.length === 0) return

    let cancelled = false
    const snapshotKey = currentBasketKey
    const items = toOfferItems(cartItems)
    void quoteOffer(items, appliedPromotionCode).then(res => {
      if (cancelled) return
      if (res?.success) {
        setOfferQuote(res.quote)
        setQuotedBasketKey(snapshotKey)
      } else if (res?.error) {
        setOfferError(res.error)
      }
    })

    return () => { cancelled = true }
  }, [appliedPromotionCode, automaticOfferActive, cartItems, currentBasketKey])

  const transition = useCallback((nextStep: Step, dir: 'forward' | 'back') => {
    setDirection(dir)
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 190)
  }, [])

  const goNext = () => {
    if (cartItems.length > 0) {
      trackInitiateCheckout(toTrackedItems(cartItems), totalAmount)
    }
    transition('details', 'forward')
  }
  const goBack = () => transition('cart', 'back')
  const goSuccess = (id: string, postcode: string, amount: number) => {
    setOrderId(id)
    setOrderPostcode(postcode)
    setOrderAmount(amount)
    transition('success', 'forward')
  }

  const quoteRequired = deliveryCheck?.status === 'custom_quote'

  return (
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50 pb-16">
      <div data-ground="dark" className="grad-ink relative bg-ink-900">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5"
          style={{ backgroundImage: 'var(--grad-rule)' }}
        />
        <div className="mx-auto flex max-w-[60rem] items-center justify-between p-4">
          <Link href="/" className="no-underline">
            <span className="font-body text-lead font-bold text-calico-50">
              UK Sofa <span className="text-ember-300">Shop</span>
            </span>
          </Link>
          {step !== 'success' && (
            <div className="flex items-center gap-2 text-caption text-calico-300">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-ember-300" />
              Secure Checkout
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[60rem] px-4 py-6">
        <h1 className="sr-only">
          {step === 'cart' ? 'Your cart'
            : step === 'details' ? 'Delivery details'
            : 'Order confirmed'}
        </h1>

        {step !== 'success' && <Steps current={step} />}

        <div className={`grid gap-4 ${step === 'success' ? 'grid-cols-1' : 'lg:grid-cols-[1fr_340px]'}`}>
          <div
            className={`rounded-md border border-calico-300 bg-calico-50 p-4 shadow-e1 transition-[opacity,transform] duration-base ease-out-expo sm:p-6 ${
              step === 'success' ? 'mx-auto max-w-[520px]' : ''
            } ${
              visible
                ? 'translate-x-0 opacity-100'
                : direction === 'forward' ? 'translate-x-10 opacity-0' : '-translate-x-10 opacity-0'
            }`}
          >
            {step === 'cart' && <CartStep onNext={goNext} />}
            {step === 'details' && (
              <DetailsStep
                onBack={goBack}
                onSuccess={goSuccess}
                extras={extras}
                setExtras={setExtras}
                form={form}
                setForm={setForm}
                offer={effectiveOffer}
                offerCodeInput={offerCodeInput}
                setOfferCodeInput={setOfferCodeInput}
                appliedPromotionCode={appliedPromotionCode}
                offerPending={offerPending || (offerAuthorityActive && quotedBasketKey !== currentBasketKey)}
                offerError={offerError}
                onApplyOffer={applyOffer}
                deliveryCheck={deliveryCheck}
                setDeliveryCheck={setDeliveryCheck}
              />
            )}
            {step === 'success' && (
              <>
                <AdsPurchaseConversion reference={orderId} total={orderAmount} />
                <SuccessStep orderId={orderId} postcode={orderPostcode} amount={orderAmount} />
              </>
            )}
          </div>

          {step !== 'success' && cartItems.length > 0 && (
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <OrderSummary extras={extras} offer={effectiveOffer} deliveryStatus={deliveryCheck?.status} />
              </div>
            </div>
          )}
        </div>

        {step !== 'success' && cartItems.length > 0 && (
          <MobileTotalBar
            total={Math.max(0, totalAmount - effectiveDiscount) + deliveryTotal(extras)}
            itemCount={cartItems.reduce((n, i) => n + i.quantity, 0)}
            quoteRequired={quoteRequired}
          >
            <OrderSummary extras={extras} offer={effectiveOffer} deliveryStatus={deliveryCheck?.status} />
          </MobileTotalBar>
        )}
      </div>
    </div>
  )
}
