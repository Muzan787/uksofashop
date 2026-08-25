'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingBag, Trash2, Plus, Minus, ArrowRight,
  ArrowLeft, Truck, Wallet, ShieldCheck, CheckCircle,
  Loader2, Package, User, Mail, Phone,
  MapPin, FileText, ChevronRight, Gem, Copy, Check, Search,
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'cart' | 'details' | 'success'

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
const ACCENT = '#d4871a'

function inputStyle(focused: boolean, error: boolean) {
  return {
    width: '100%',
    padding: '11px 14px 11px 38px',
    fontSize: 13,
    border: `1.5px solid ${error ? '#ef4444' : focused ? ACCENT : '#e7e5e4'}`,
    borderRadius: 8,
    outline: 'none',
    background: '#fff',
    color: '#1c1917',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current }: { current: Step }) {
  const steps = [
    { id: 'cart',    label: 'Cart'     },
    { id: 'details', label: 'Delivery' },
    { id: 'success', label: 'Confirmed'},
  ]
  const idx = steps.findIndex(s => s.id === current)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const done    = i < idx
        const active  = i === idx
        const future  = i > idx
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: done ? ACCENT : active ? ACCENT : '#f5f5f4',
                border: `2px solid ${done || active ? ACCENT : '#e7e5e4'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}>
                {done
                  ? <Check style={{ width: 13, height: 13, color: '#fff' }} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#a8a29e' }}>{i + 1}</span>
                }
              </div>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: done || active ? ACCENT : '#a8a29e',
                transition: 'color 0.3s ease',
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-6 sm:w-16" style={{
                height: 1.5, margin: '0 6px', marginBottom: 18,
                background: done ? ACCENT : '#e7e5e4',
                transition: 'background 0.4s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({
  icon: Icon, label, name, type = 'text', required = true,
  placeholder, textarea, value, onChange, error, hint,
}: {
  icon: React.ElementType; label: string; name: string; type?: string
  required?: boolean; placeholder: string; textarea?: boolean
  value: string; onChange: (v: string) => void; error?: string; hint?: string
}) {
  const [focused, setFocused] = useState(false)
  const hasErr = !!error

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 10, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        {label} {required && <span style={{ color: ACCENT }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon style={{ position: 'absolute', left: 12, top: textarea ? 13 : '50%', transform: textarea ? 'none' : 'translateY(-50%)', width: 14, height: 14, color: focused ? ACCENT : '#a8a29e', transition: 'color 0.2s', zIndex: 1, pointerEvents: 'none' }} />
        {textarea ? (
          <textarea
            name={name} required={required} placeholder={placeholder}
            rows={3} value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ ...inputStyle(focused, hasErr), paddingLeft: 38, resize: 'vertical' }}
          />
        ) : (
          <input
            type={type} name={name} required={required} placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={inputStyle(focused, hasErr)}
          />
        )}
      </div>
      {error && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 10, color: '#a8a29e', marginTop: 4 }}>{hint}</p>}
    </div>
  )
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
      border: `1.5px solid ${checked ? ACCENT : '#e7e5e4'}`,
      borderRadius: 10,
      background: checked ? `${ACCENT}08` : '#fff',
      padding: '12px 14px',
      transition: 'border-color 0.2s ease, background 0.2s ease',
    }}>
      <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onToggle(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: ACCENT, cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
        />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>{title}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT, flexShrink: 0 }}>
              {priceIsFrom && <span style={{ fontSize: 10, fontWeight: 600, color: '#a8a29e' }}>from </span>}
              £{price.toFixed(2)}
            </span>
          </span>
          <span style={{ display: 'block', fontSize: 11, color: '#78716c', lineHeight: 1.55, marginTop: 3 }}>
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
    <div style={{
      background: '#0c0c0b', borderRadius: 12,
      padding: compact ? '14px 16px' : '20px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {!compact && (
        <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 14 }}>
          Order Summary
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {cartItems.map((item, i) => (
          <div key={`${item.variant_id}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: '#1c1917' }}>
              <Image src={item.image_url || '/placeholder.svg'} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="46px" />
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, borderRadius: '50%',
                background: ACCENT, color: '#fff',
                fontSize: 8, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.quantity}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#e7e5e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: 10, color: '#57534e', marginTop: 2 }}>{item.color}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              £{(item.price * item.quantity).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#78716c' }}>
          <span>Subtotal</span>
          <span>£{totalAmount.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#78716c' }}>
          <span>Delivery <span style={{ color: '#57534e' }}>· UK Mainland</span></span>
          <span style={{ color: '#4ade80', fontWeight: 700 }}>FREE</span>
        </div>

        {/* Each chosen extra as its own line, so the total is never a mystery. */}
        {extraLines.map(line => (
          <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: '#78716c' }}>
            <span style={{ minWidth: 0 }}>
              {line.label}
              {line.detail && <span style={{ color: '#57534e' }}> · {line.detail}</span>}
            </span>
            <span style={{ color: '#fff', flexShrink: 0 }}>£{line.amount.toFixed(2)}</span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#fff', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4 }}>
          <span>Total due on delivery</span>
          <span style={{ color: ACCENT }}>£{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Trust strip */}
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            [Wallet,      PROMISES.payment.long],
            [ShieldCheck, PROMISES.guarantee.short],
            [Truck,       PROMISES.delivery.long],
          ].map(([Icon, text]) => (
            <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* @ts-expect-error */}
              <Icon style={{ width: 12, height: 12, color: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#57534e' }}>{text as string}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── STEP 1: Cart ─────────────────────────────────────────────────────────────
function CartStep({ onNext }: { onNext: () => void }) {
  const { cartItems, removeFromCart, updateQuantity } = useCart()
  const [removing, setRemoving] = useState<string | null>(null)

  const handleRemove = (id: string) => {
    setRemoving(id)
    setTimeout(() => { removeFromCart(id); setRemoving(null) }, 350)
  }

  if (cartItems.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <ShoppingBag style={{ width: 28, height: 28, color: '#d6d3d1' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>Your cart is empty</h2>
      <p style={{ fontSize: 13, color: '#78716c', marginBottom: 24, maxWidth: 280, margin: '0 auto 24px' }}>
        Find the perfect sofa for your home and add it to your cart.
      </p>
      <Link href="/shop/all" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: ACCENT, color: '#fff',
        padding: '12px 24px', borderRadius: 8,
        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        textDecoration: 'none',
      }}>
        Browse Collection <ArrowRight style={{ width: 14, height: 14 }} />
      </Link>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 16 }}>
        {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'} in Your Cart
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {cartItems.map((item) => (
          <div
            key={item.variant_id}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '12px', borderRadius: 10,
              background: '#fff',
              border: '1px solid #f0ede8',
              opacity: removing === item.variant_id ? 0 : 1,
              transform: removing === item.variant_id ? 'translateX(20px)' : 'translateX(0)',
              transition: 'all 0.35s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {/* Image */}
            <div style={{ position: 'relative', width: 76, height: 76, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f5f5f4' }}>
              <Image src={item.image_url || '/placeholder.svg'} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="76px" />
            </div>

            {/* Content Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 76 }}>
              
              {/* Top Row: Title + Trash */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                     {item.title}
                   </div>
                   <div style={{ fontSize: 11, color: '#78716c', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                     {item.color}
                   </div>
                </div>
                
                <button
                  onClick={() => handleRemove(item.variant_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d6d3d1', padding: 2, transition: 'color 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#d6d3d1')}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* Bottom Row: Quantity + Price (Pushed to bottom) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8 }}>
                
                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e7e5e4', borderRadius: 6, overflow: 'hidden' }}>
                  <button
                    onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                    style={{ width: 28, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}
                  >
                    <Minus style={{ width: 11, height: 11 }} />
                  </button>
                  <span style={{ width: 24, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#1c1917' }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                    style={{ width: 28, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}
                  >
                    <Plus style={{ width: 11, height: 11 }} />
                  </button>
                </div>

                <span style={{ fontSize: 14, fontWeight: 800, color: '#1c1917' }}>
                  £{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 0', borderRadius: 10, border: 'none',
          background: ACCENT, color: '#fff',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', transition: 'background 0.2s ease',
          boxShadow: `0 6px 24px ${ACCENT}44`,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#b8721a')}
        onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
      >
        Continue to Delivery
        <ArrowRight style={{ width: 14, height: 14 }} />
      </button>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <Link href="/shop/all" style={{ fontSize: 11, color: '#a8a29e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft style={{ width: 11, height: 11 }} /> Continue Shopping
        </Link>
      </div>
    </div>
  )
}

// ─── STEP 2: Delivery details ─────────────────────────────────────────────────
function DetailsStep({
  onBack, onSuccess, extras, setExtras,
}: {
  onBack: () => void
  onSuccess: (id: string, postcode: string) => void
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

  // --- REAL POSTCODE API (Homedata.co.uk) ---
  const handleFindAddress = async () => {
    // 1. Basic validation
    if (!form.postcode || form.postcode.trim().length < 5) {
      setErrors(e => ({ ...e, postcode: 'Please enter a valid postcode first.' }));
      return;
    }
    
    setSearchingPostcode(true);
    setErrors(e => { const n = { ...e }; delete n.postcode; return n; }); // Clear old errors
    setAddresses([]); // Clear old results
    
    try {
      // 2. Clean the postcode for the query parameter
      const cleanPostcode = encodeURIComponent(form.postcode.trim().toUpperCase());
      
      // ⚠️ IMPORTANT: Replace this with your actual Homedata API Key
      const apiKey = process.env.NEXT_PUBLIC_HOMEDATA_API_KEY || 'YOUR_HOMEDATA_API_KEY'; 
      
      // 3. Make the API Call to Homedata
      // Homedata requires the API key to be passed in the Authorization header
      const response = await fetch(`https://api.homedata.co.uk/api/address/find/?q=${cleanPostcode}`, {
        headers: {
          'Authorization': `Api-Key ${apiKey}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Invalid API Key.');
        if (response.status === 404) throw new Error('Postcode not found.');
        throw new Error('Could not fetch addresses. Please enter manually.');
      }

      const data = await response.json();

      // 4. Extract addresses from the Homedata response
      // Homedata returns an array inside the `suggestions` property
      const addressList = data.suggestions || data.results || [];
      
      if (addressList.length === 0) {
        throw new Error('No addresses found for this postcode.');
      }

      // 5. Map the returned address strings into our dropdown array
      const formattedAddresses = addressList.map((item: any) => item.address || item.full_address);

      // 6. Update state to show the dropdown!
      setAddresses(formattedAddresses);

    } catch (err: any) {
      // If it fails (e.g. network error, bad postcode), show the error so the 
      // customer knows to just type their address manually in the fallback field
      setErrors(e => ({ ...e, postcode: err.message || 'Lookup failed. Please type your address below.' }));
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
      onSuccess(res.orderId || '', form.postcode.toUpperCase())
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <button
        type="button" onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#78716c', marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft style={{ width: 12, height: 12 }} /> Back to Cart
      </button>

      <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
        Delivery Information
      </div>
      <p style={{ fontSize: 12, color: '#78716c', marginBottom: 20 }}>
        Delivered free to UK Mainland, ground floor. We&apos;ll call before arrival.
      </p>

      {serverError && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
          {serverError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        
        {/* Basic Info Fields */}
        <Field icon={User} label="Full Name" name="customerName" placeholder="Jane Smith" value={form.customerName} onChange={set('customerName')} error={errors.customerName} />
        <Field icon={Mail} label="Email Address" type="email" name="customerEmail" placeholder="jane@example.com" hint="Your order confirmation will be sent here" value={form.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail} />
        <Field icon={Phone} label="Mobile Number" type="tel" name="customerPhone" placeholder="07700 900123" hint="A UK mobile — our driver calls before delivery, and we message you on WhatsApp" value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} />
        
        {/* NEW: Postcode Lookup Section */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 10, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
             Postcode <span style={{ color: ACCENT }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
               <MapPin style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#a8a29e', zIndex: 1 }} />
               <input
                  type="text"
                  placeholder="e.g. SW1A 1AA"
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
                 padding: '0 20px', background: '#1c1917', color: '#fff', borderRadius: 8, 
                 fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', 
                 display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s',
                 opacity: searchingPostcode || form.postcode.length < 5 ? 0.6 : 1
               }}
            >
               {searchingPostcode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
               Find
            </button>
          </div>
          {errors.postcode && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{errors.postcode}</p>}
        </div>

        {/* Custom Address Dropdown */}
        {addresses.length > 0 && (
          <div style={{ position: 'relative', animation: 'fadeIn 0.3s ease' }}>
            {/* The Trigger Button */}
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: `1.5px solid ${ACCENT}`,
                outline: 'none',
                fontSize: 13,
                background: '#fafaf9',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: form.shippingAddress ? '#1c1917' : '#78716c',
                textAlign: 'left'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>
                {form.shippingAddress || "Select your address..."}
              </span>
              <ChevronDown 
                style={{ 
                  width: 16, height: 16, color: ACCENT, flexShrink: 0, 
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
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
                  marginTop: 6,
                  background: '#fff',
                  border: '1px solid #e7e5e4',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
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
                      padding: '12px 14px',
                      background: form.shippingAddress === addr ? `${ACCENT}15` : 'transparent',
                      border: 'none',
                      borderBottom: i < addresses.length - 1 ? '1px solid #f5f5f4' : 'none',
                      textAlign: 'left',
                      fontSize: 12,
                      color: form.shippingAddress === addr ? '#1c1917' : '#57534e',
                      fontWeight: form.shippingAddress === addr ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
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
        <Field icon={MapPin} label="Full Address" name="shippingAddress" textarea placeholder="12 Baker St, London..." value={form.shippingAddress} onChange={set('shippingAddress')} error={errors.shippingAddress} />
        
        <Field icon={FileText} label="Special Instructions" name="specialInstructions" required={false} textarea placeholder="e.g. Narrow hallway, call on arrival…" value={form.specialInstructions} onChange={set('specialInstructions')} />
      </div>

      {/* ── Optional delivery extras ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
          Delivery Options
        </div>
        <p style={{ fontSize: 12, color: '#78716c', marginBottom: 12, lineHeight: 1.5 }}>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#57534e', fontWeight: 600 }}>Floor</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e7e5e4', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
                  <button type="button" aria-label="Fewer floors"
                    onClick={() => setExtras({ ...extras, floor: Math.max(1, extras.floor - 1) })}
                    style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: '#78716c' }}>
                    <Minus style={{ width: 12, height: 12 }} />
                  </button>
                  <span style={{ minWidth: 30, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#1c1917' }}>{extras.floor}</span>
                  <button type="button" aria-label="More floors"
                    onClick={() => setExtras({ ...extras, floor: Math.min(20, extras.floor + 1) })}
                    style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: '#78716c' }}>
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <span style={{ fontSize: 11, color: '#a8a29e' }}>{floorName(extras.floor)}</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: '#57534e' }}>
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

        <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 12, lineHeight: 1.6 }}>
          {DELIVERY_AREA_NOTE}
        </p>
      </div>

      {/* ── How you pay ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>
          How You Pay
        </div>
        <p style={{ fontSize: 12, color: '#78716c', marginBottom: 12, lineHeight: 1.5 }}>
          Nothing is taken now. You pay once your sofa has arrived and you&apos;re happy with it —
          choose either method on the day, there&apos;s nothing to decide here.
        </p>

        {/* Tailwind only - an inline gridTemplateColumns would beat the
            sm: breakpoint and pin this to one column at every width. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div style={{ border: '1px solid #e7e5e4', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Wallet style={{ width: 15, height: 15, color: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>Cash</span>
            </div>
            <p style={{ fontSize: 11, color: '#78716c', lineHeight: 1.55, margin: 0 }}>
              Hand the full amount to our driver when your sofa is delivered.
            </p>
          </div>

          <div style={{ border: '1px solid #e7e5e4', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Landmark style={{ width: 15, height: 15, color: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>Bank transfer</span>
            </div>
            <p style={{ fontSize: 11, color: '#78716c', lineHeight: 1.55, margin: 0 }}>
              Transfer <strong style={{ color: '#57534e' }}>at the door</strong>, not in advance. Our
              driver gives you the account details and waits for the payment to show.
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '13px 14px', borderRadius: 10, marginTop: 10,
          background: `${ACCENT}10`, border: `1px solid ${ACCENT}22`,
        }}>
          <ShieldCheck style={{ width: 17, height: 17, color: ACCENT, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#78716c', lineHeight: 1.55 }}>
            Your total due on delivery is <strong style={{ color: '#1c1917' }}>£{grandTotal.toFixed(2)}</strong>
            {extrasTotal > 0 && (
              <span style={{ color: '#a8a29e' }}> (£{totalAmount.toFixed(2)} for your order plus £{extrasTotal.toFixed(2)} of delivery extras)</span>
            )}.
            <span style={{ display: 'block', marginTop: 3, color: '#a8a29e', fontSize: 11 }}>
              We don&apos;t accept card payments of any kind.
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit" disabled={pending}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 0', borderRadius: 10, border: 'none',
          background: pending ? '#a8a29e' : ACCENT, color: '#fff',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: pending ? 'wait' : 'pointer',
          boxShadow: pending ? 'none' : `0 6px 24px ${ACCENT}44`,
          transition: 'all 0.2s ease',
        }}
      >
        {pending
          ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} /> Placing Order…</>
          : <><ShoppingBag style={{ width: 15, height: 15 }} /> Place Order</>
        }
      </button>

      <p style={{ fontSize: 10, color: '#a8a29e', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
        By placing this order you agree to pay on delivery. We&apos;ll send a confirmation email with a tracking link.
      </p>
    </form>
  )
}

// ─── STEP 3: Success ──────────────────────────────────────────────────────────
function SuccessStep({ orderId, postcode }: { orderId: string, postcode: string }) {
  const [copied, setCopied] = useState(false)
  const [entered, setEntered] = useState(false)
  
  // Generate a clean, short Order Number from the UUID
  const shortOrderNumber = `#${orderId.split('-')[0].toUpperCase()}`

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80)
    return () => clearTimeout(t)
  }, [])

  const copy = () => {
    navigator.clipboard.writeText(shortOrderNumber).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      textAlign: 'center',
      opacity: entered ? 1 : 0,
      transform: entered ? 'scale(1)' : 'scale(0.97)',
      transition: 'all 0.5s cubic-bezier(.16,1,.3,1)',
    }}>
      {/* Animated check */}
      <div style={{
        width: 70, height: 70, borderRadius: '50%',
        background: `${ACCENT}15`, border: `2px solid ${ACCENT}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        animation: entered ? `pulseRing 2s ease infinite` : 'none',
      }}>
        <CheckCircle style={{ width: 36, height: 36, color: ACCENT }} />
      </div>

      <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>
        Order Received
      </div>
      <h2 className="font-playfair" style={{ fontSize: 28, fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>
        Thank You!
      </h2>
      <p style={{ fontSize: 13, color: '#78716c', lineHeight: 1.65, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
        We&apos;ve received your order and sent a confirmation email. Our team will be in touch to arrange delivery.
      </p>

      {/* Order ref (Now showing the SHORT ID) */}
      <div style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        background: '#0c0c0b', borderRadius: 10, padding: '16px 24px',
        marginBottom: 24, border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontSize: 9, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8 }}>Order Number</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>{shortOrderNumber}</span>
          <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ade80' : '#57534e', transition: 'color 0.2s' }}>
            {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
          </button>
        </div>
        <span style={{ fontSize: 10, color: '#888', marginTop: 6 }}>Save this and your postcode to track your order</span>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Tracking link now passes the POSTCODE and SHORT ID */}
        <Link href={`/track-order?ref=${encodeURIComponent(shortOrderNumber.replace('#', ''))}&postcode=${encodeURIComponent(postcode)}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px 0', borderRadius: 9, background: ACCENT, color: '#fff',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          textDecoration: 'none', transition: 'background 0.2s',
        }}>
          <Package style={{ width: 14, height: 14 }} /> Track My Order
        </Link>
        <Link href="/shop/all" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '12px 0', borderRadius: 9, border: '1px solid #e7e5e4',
          fontSize: 12, fontWeight: 600, color: '#57534e',
          textDecoration: 'none', transition: 'border-color 0.2s',
        }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CheckoutClient() {
  const [step, setStep] = useState<Step>('cart')
  const [orderId, setOrderId] = useState('')
  const [orderPostcode, setOrderPostcode] = useState('')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(true)
  // Held here rather than in DetailsStep so the order summary - which renders in
  // the sidebar and again in the mobile drawer - reflects every tick live.
  const [extras, setExtras] = useState<DeliveryOptions>(NO_EXTRAS)
  const { cartItems, totalAmount } = useCart()

  const transition = useCallback((nextStep: Step, dir: 'forward' | 'back') => {
    setDirection(dir)
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
    }, 250)
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
  const goSuccess = (id: string, postcode: string) => { 
    setOrderId(id); 
    setOrderPostcode(postcode); 
    transition('success', 'forward') 
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseRing { 0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(212,135,26,0.3); } 70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(212,135,26,0); } 100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(212,135,26,0); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8f6f2', paddingBottom: 60 }}>

        {/* Header strip */}
        <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span className="font-playfair" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                UK Sofa <span style={{ color: ACCENT }}>Shop</span>
              </span>
            </Link>
            {step !== 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#57534e' }}>
                <ShieldCheck style={{ width: 13, height: 13, color: ACCENT }} />
                Secure Checkout
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

          {/* Steps indicator */}
          {step !== 'success' && <Steps current={step} />}

          <div style={{ display: 'grid', gridTemplateColumns: step === 'success' ? '1fr' : 'auto', gap: 20 }}
            className={step !== 'success' ? 'lg:grid-cols-[1fr_340px]' : ''}>

            {/* Main panel */}
            <div 
              className="p-4 sm:p-6"
              style={{
                background: '#fff', borderRadius: 14,
                border: '1px solid #f0ede8',
                boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                opacity: visible ? 1 : 0,
                transform: visible
                  ? 'translateX(0)'
                  : direction === 'forward' ? 'translateX(20px)' : 'translateX(-20px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                maxWidth: step === 'success' ? 520 : 'none',
                margin: step === 'success' ? '0 auto' : 0,
              }}
            >
              {step === 'cart'    && <CartStep onNext={goNext} />}
              {step === 'details' && <DetailsStep onBack={goBack} onSuccess={goSuccess} extras={extras} setExtras={setExtras} />}
              {step === 'success' && <SuccessStep orderId={orderId} postcode={orderPostcode} />}
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

          {/* Mobile order summary (Cart + Details steps) */}
          {step !== 'success' && cartItems.length > 0 && (
            <div className="lg:hidden" style={{ marginTop: 16 }}>
              <details>
                <summary style={{
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  color: ACCENT, listStyle: 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 0',
                }}>
                  <ChevronRight style={{ width: 13, height: 13 }} />
                  Show order summary
                </summary>
                <div style={{ marginTop: 10 }}>
                  <OrderSummary extras={extras} />
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </>
  )
}