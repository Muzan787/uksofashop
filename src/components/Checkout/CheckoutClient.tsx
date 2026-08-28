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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges
const ACCENT_TEXT = 'var(--color-ember-700)' // letterforms on a light ground

function inputStyle(focused: boolean, error: boolean) {
  return {
    width: '100%',
    padding: '12px 16px 12px 32px',
    fontSize: 'var(--text-body-sm)',
    border: `1.5px solid ${error ? 'var(--color-rust-700)' : focused ? ACCENT : 'var(--color-calico-300)'}`,
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    background: 'var(--color-calico-50)',
    color: 'var(--color-ink-900)',
    transition: 'border-color var(--dur-swift) var(--ease-out-expo), scale var(--dur-press) var(--ease-out-expo)',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }
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
    <div style={{
      border: `1.5px solid ${checked ? ACCENT : 'var(--color-calico-300)'}`,
      borderRadius: 'var(--radius-sm)',
      background: checked ? `${ACCENT}08` : 'var(--color-calico-50)',
      padding: '12px 16px',
      transition: 'border-color var(--dur-swift) var(--ease-out-expo), background var(--dur-swift) var(--ease-out-expo), scale var(--dur-press) var(--ease-out-expo)',
    }}>
      <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onToggle(e.target.checked)}
          className="h-11 w-11 shrink-0 cursor-pointer"
          style={{ accentColor: ACCENT }}
        />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--color-ink-900)' }}>{title}</span>
            <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: ACCENT_TEXT, flexShrink: 0 }}>
              {priceIsFrom && <span style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums',  fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-ink-500)' }}>from </span>}
              £{price.toFixed(2)}
            </span>
          </span>
          <span style={{ display: 'block', fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', lineHeight: 1.55, marginTop: 4 }}>
            {note}
          </span>
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
    <div data-ground="dark" style={{
      background: 'var(--color-ink-900)', borderRadius: 'var(--radius-md)',
      padding: compact ? '14px 16px' : '20px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {!compact && (
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: 'var(--color-ember-300)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 16 }}>
          Order Summary
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {cartItems.map((item, i) => (
          <div key={`${item.variant_id}-${i}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-ink-900)' }}>
              <Image src={item.image_url || '/placeholder.svg'} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="46px" />
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, borderRadius: 'var(--radius-pill)',
                background: ACCENT, color: 'var(--color-ink-900)',
                fontSize: 'var(--text-caption)', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.quantity}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-calico-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-calico-300)', marginTop: 2 }}>{item.color}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums',  fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--color-calico-50)', flexShrink: 0 }}>
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
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-caption)', color: 'var(--color-calico-300)' }}>
          <span>Subtotal</span>
          <span className="font-data tnum">£{totalAmount.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-caption)', color: 'var(--color-calico-300)' }}>
          <span>Delivery <span style={{ color: 'var(--color-calico-300)' }}>· UK Mainland</span></span>
          <span style={{ color: 'var(--color-sage-300)', fontWeight: 700 }}>FREE</span>
        </div>

        {/* Each chosen extra as its own line, so the total is never a mystery. */}
        {extraLines.map(line => (
          <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--text-caption)', color: 'var(--color-calico-300)' }}>
            <span style={{ minWidth: 0 }}>
              {line.label}
              {line.detail && <span style={{ color: 'var(--color-calico-300)' }}> · {line.detail}</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums',  color: 'var(--color-calico-50)', flexShrink: 0 }}>£{line.amount.toFixed(2)}</span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-body)', fontWeight: 800, color: 'var(--color-calico-50)', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4 }}>
          <span>Total due on delivery</span>
          <span style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums',  color: 'var(--color-ember-300)' }}>£{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Trust strip */}
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            [ShieldCheck, PROMISES.guarantee.short],
            [Truck, PROMISES.delivery.long],
          ] as const).map(([Icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* `as const` above keeps Icon a callable component type. Without it the
                  tuple widens to a union TS cannot call, which is why this line
                  used to carry a suppression comment. */}
              <Icon style={{ width: 12, height: 12, color: 'var(--color-ember-300)', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-calico-300)' }}>{text}</span>
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
    const items = cartItems.map(i => ({ variant_id: i.variant_id, quantity: i.quantity }))

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
        type="button" onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginBottom: 16, padding: 0 }}
      >
        <ArrowLeft style={{ width: 12, height: 12 }} /> Back to Cart
      </button>

      <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
        Delivery Information
      </div>
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginBottom: 16 }}>
        Delivered free to UK Mainland, ground floor. We&apos;ll call before arrival.
      </p>

      {serverError && (
        <div style={{ padding: '12px 16px', background: 'var(--color-rust-50)', border: '1px solid var(--color-rust-200)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-caption)', color: 'var(--color-rust-700)', marginBottom: 16 }}>
          {serverError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        
        {/* Basic Info Fields */}
        <Field label="Full Name" name="customerName" value={form.customerName} onChange={set('customerName')} error={errors.customerName} />
        <Field label="Email Address" type="email" name="customerEmail" hint="Your order confirmation will be sent here" value={form.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail} />
        <Field label="Mobile Number" type="tel" name="customerPhone" hint="A UK mobile — our driver calls before delivery, and we message you on WhatsApp" value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} />
        
        {/* NEW: Postcode Lookup Section */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', fontWeight: 700, color: 'var(--color-ink-500)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
             Postcode <span style={{ color: ACCENT_TEXT }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
               <MapPin style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-ink-500)', zIndex: 1 }} />
               <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => set('postcode')(e.target.value.toUpperCase())}
                  style={{ ...inputStyle(false, !!errors.postcode), textTransform: 'uppercase' }}
               />
            </div>
            <button
               type="button"
               onClick={handleFindAddress}
               disabled={searchingPostcode || form.postcode.length < 5}
               style={{ 
                 padding: '0 16px', background: 'var(--color-ink-900)', color: 'var(--color-calico-50)', borderRadius: 'var(--radius-sm)', 
                 fontSize: 'var(--text-caption)', fontWeight: 700, border: 'none', cursor: 'pointer', 
                 display: 'flex', alignItems: 'center', gap: 8, transition: 'background var(--dur-swift), scale var(--dur-press) var(--ease-out-expo)',
                 opacity: searchingPostcode || form.postcode.length < 5 ? 0.6 : 1
               }}
            >
               {searchingPostcode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
               Find
            </button>
          </div>
          {errors.postcode && <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-rust-700)', marginTop: 4 }}>{errors.postcode}</p>}
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
          <div style={{ position: 'relative', animation: 'fadeIn var(--dur-base) var(--ease-out-expo)' }}>
            {/* The Trigger Button */}
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${ACCENT}`,
                outline: 'none',
                fontSize: 'var(--text-body-sm)',
                background: 'var(--color-calico-50)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: form.shippingAddress ? 'var(--color-ink-900)' : 'var(--color-ink-500)',
                textAlign: 'left'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                {form.shippingAddress || "Select your address..."}
              </span>
              <ChevronDown 
                style={{ 
                  width: 16, height: 16, color: ACCENT_TEXT, flexShrink: 0, 
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform var(--dur-swift) var(--ease-out-expo), scale var(--dur-press) var(--ease-out-expo)' 
                }} 
              />
            </button>

            {/* The Floating Menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 8,
                  background: 'var(--color-calico-50)',
                  border: '1px solid var(--color-calico-300)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-e1)',
                  maxHeight: 240, // Limits height so it never takes the whole screen
                  overflowY: 'auto', // Adds an elegant scrollbar
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {addresses.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      set('shippingAddress')(addr);
                      setDropdownOpen(false); // Close after selection
                    }}
                    style={{
                      padding: '12px 16px',
                      background: form.shippingAddress === addr ? `${ACCENT}15` : 'transparent',
                      border: 'none',
                      borderBottom: i < addresses.length - 1 ? '1px solid var(--color-calico-100)' : 'none',
                      textAlign: 'left',
                      fontSize: 'var(--text-caption)',
                      color: form.shippingAddress === addr ? 'var(--color-ink-900)' : 'var(--color-ink-500)',
                      fontWeight: form.shippingAddress === addr ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'background var(--dur-press) var(--ease-out-expo), scale var(--dur-press) var(--ease-out-expo)',
                      lineHeight: 1.4 // Allows long addresses to wrap nicely
                    }}
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
          Delivery Options
        </div>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginBottom: 12, lineHeight: 1.5 }}>
          Delivery to a UK Mainland ground floor is free. Add anything else you need —
          your total updates as you go, and you still pay on delivery.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          <ExtraOption
            checked={extras.floor > 0}
            onToggle={on => setExtras({ ...extras, floor: on ? 1 : 0, hasLift: on ? extras.hasLift : false })}
            title="Upstairs delivery"
            note={`£${UPSTAIRS_FIRST_FLOOR} to the first floor or any floor with a lift, £${UPSTAIRS_PER_EXTRA_FLOOR} per extra floor without one.`}
            price={extras.floor > 0 ? deliveryBreakdown(extras).lines.find(l => l.key === 'upstairs')?.amount ?? 0 : UPSTAIRS_FIRST_FLOOR}
            priceIsFrom={extras.floor === 0}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', fontWeight: 600 }}>Floor</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-calico-300)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--color-calico-50)' }}>
                  <button type="button" aria-label="Fewer floors"
                    onClick={() => setExtras({ ...extras, floor: Math.max(1, extras.floor - 1) })}
                    className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-700 hover:bg-calico-200">
                    <Minus style={{ width: 12, height: 12 }} />
                  </button>
                  <span style={{ minWidth: 30, textAlign: 'center', fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--color-ink-900)' }}>{extras.floor}</span>
                  <button type="button" aria-label="More floors"
                    onClick={() => setExtras({ ...extras, floor: Math.min(20, extras.floor + 1) })}
                    className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-700 hover:bg-calico-200">
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)' }}>{floorName(extras.floor)}</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)' }}>
                <input
                  type="checkbox"
                  checked={extras.hasLift}
                  onChange={e => setExtras({ ...extras, hasLift: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: ACCENT, cursor: 'pointer' }}
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

        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginTop: 12, lineHeight: 1.6 }}>
          {DELIVERY_AREA_NOTE}
        </p>
      </div>

      {/* ── How you pay ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
          How You Pay
        </div>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginBottom: 12, lineHeight: 1.5 }}>
          Nothing is taken now. You pay once your sofa has arrived and you&apos;re happy with it —
          choose either method on the day, there&apos;s nothing to decide here.
        </p>

        {/* Tailwind only - an inline gridTemplateColumns would beat the
            sm: breakpoint and pin this to one column at every width. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div style={{ border: '1px solid var(--color-calico-300)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', background: 'var(--color-calico-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Wallet style={{ width: 15, height: 15, color: ACCENT_TEXT, flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--color-ink-900)' }}>Cash</span>
            </div>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', lineHeight: 1.55, margin: 0 }}>
              Hand the full amount to our driver when your sofa is delivered.
            </p>
          </div>

          <div style={{ border: '1px solid var(--color-calico-300)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', background: 'var(--color-calico-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Landmark style={{ width: 15, height: 15, color: ACCENT_TEXT, flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--color-ink-900)' }}>Bank transfer</span>
            </div>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', lineHeight: 1.55, margin: 0 }}>
              Transfer <strong style={{ color: 'var(--color-ink-500)' }}>at the door</strong>, not in advance. Our
              driver gives you the account details and waits for the payment to show.
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginTop: 12,
          background: `${ACCENT}10`, border: `1px solid ${ACCENT}22`,
        }}>
          <ShieldCheck style={{ width: 17, height: 17, color: ACCENT_TEXT, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', lineHeight: 1.55 }}>
            Your total due on delivery is <strong style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums',  color: 'var(--color-ink-900)' }}>£{grandTotal.toFixed(2)}</strong>
            {extrasTotal > 0 && (
              <span style={{ color: 'var(--color-ink-500)' }}> (£{totalAmount.toFixed(2)} for your order plus £{extrasTotal.toFixed(2)} of delivery extras)</span>
            )}.
            <span style={{ display: 'block', marginTop: 4, color: 'var(--color-ink-500)', fontSize: 'var(--text-caption)' }}>
              We don&apos;t accept card payments of any kind.
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit" disabled={pending}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '16px 0', borderRadius: 'var(--radius-sm)', border: 'none',
          background: pending ? 'var(--color-ink-500)' : ACCENT, color: 'var(--color-calico-50)',
          fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: pending ? 'wait' : 'pointer',
          boxShadow: pending ? 'none' : `0 6px 24px ${ACCENT}44`,
          transition: 'all var(--dur-swift) var(--ease-out-expo)',
        }}
      >
        {pending
          ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} /> Placing Order…</>
          : <><ShoppingBag style={{ width: 15, height: 15 }} /> Place Order</>
        }
      </button>

      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
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
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseRing { 0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(212,135,26,0.3); } 70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(212,135,26,0); } 100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(212,135,26,0); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--color-calico-50)', paddingBottom: 64 }}>

        {/* Header strip */}
        <div data-ground="dark" style={{ background: 'var(--color-ink-900)', borderBottom: `2px solid ${ACCENT}` }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span className="font-body font-semibold" style={{ fontSize: 'var(--text-lead)', fontWeight: 700, color: 'var(--color-calico-50)' }}>
                UK Sofa <span style={{ color: ACCENT_TEXT }}>Shop</span>
              </span>
            </Link>
            {step !== 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)' }}>
                <ShieldCheck style={{ width: 13, height: 13, color: ACCENT_TEXT }} />
                Secure Checkout
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: step === 'success' ? '1fr' : 'auto', gap: 16 }}
            className={step !== 'success' ? 'lg:grid-cols-[1fr_340px]' : ''}>

            {/* Main panel */}
            <div 
              className="p-4 sm:p-6"
              style={{
                background: 'var(--color-calico-50)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-calico-300)',
                boxShadow: 'var(--shadow-e1)',
                opacity: visible ? 1 : 0,
                transform: visible
                  ? 'translateX(0)'
                  : direction === 'forward' ? 'translateX(40px)' : 'translateX(-40px)',
                // 380ms, and the outgoing step is already fading as the
                // incoming one starts — see goNext/goBack, where the swap
                // happens a beat into the fade rather than after it.
                transition: 'opacity var(--dur-base) var(--ease-out-expo), transform var(--dur-base) var(--ease-out-expo)',
                maxWidth: step === 'success' ? 520 : 'none',
                margin: step === 'success' ? '0 auto' : 0,
              }}
            >
              {step === 'cart'    && <CartStep onNext={goNext} />}
              {step === 'details' && <DetailsStep onBack={goBack} onSuccess={goSuccess} extras={extras} setExtras={setExtras} />}
              {step === 'success' && <SuccessStep orderId={orderId} postcode={orderPostcode} amount={orderAmount} />}
            </div>

            {/* Sidebar — hidden on success */}
            {step !== 'success' && cartItems.length > 0 && (
              <div className="hidden lg:block">
                <div style={{ position: 'sticky', top: 80 }}>
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
    </>
  )
}