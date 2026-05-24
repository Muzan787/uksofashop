'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingBag, Trash2, Plus, Minus, ArrowRight,
  ArrowLeft, Truck, Wallet, ShieldCheck, CheckCircle,
  Loader2, Package, RotateCcw, User, Mail, Phone,
  MapPin, FileText, ChevronRight, Gem, Copy, Check, Search,
  ChevronDown,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { placeOrder } from '@/app/actions/checkout'

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'cart' | 'details' | 'success'

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

// ─── Order summary sidebar ────────────────────────────────────────────────────
function OrderSummary({ compact = false }: { compact?: boolean }) {
  const { cartItems, totalAmount } = useCart()
  const delivery = totalAmount >= 500 ? 0 : 49

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
          <span>Delivery</span>
          <span style={{ color: delivery === 0 ? '#4ade80' : '#fff' }}>
            {delivery === 0 ? 'FREE' : `£${delivery}`}
          </span>
        </div>
        {delivery === 0 && (
          <div style={{ fontSize: 9, color: '#4ade80', letterSpacing: '0.1em' }}>✓ Free white-glove delivery applied</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#fff', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4 }}>
          <span>Total (COD)</span>
          <span style={{ color: ACCENT }}>£{(totalAmount + delivery).toFixed(2)}</span>
        </div>
      </div>

      {/* Trust strip */}
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            [Wallet,     'Pay only when your sofa arrives'],
            [ShieldCheck,'10-year structural guarantee'],
            [RotateCcw,  '30-day home trial'],
          ].map(([Icon, text]) => (
            <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* @ts-ignore */}
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
  onBack, onSuccess,
}: { onBack: () => void; onSuccess: (id: string, postcode: string) => void }) {
  const { cartItems, totalAmount, clearCart } = useCart()
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
    if (form.customerPhone.replace(/\s/g, '').length < 8) errs.customerPhone = 'Please enter a valid UK phone number'
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
    
    const items = cartItems.map(i => ({ variant_id: i.variant_id, quantity: i.quantity, price: i.price }))
    const res = await placeOrder(fd, items, totalAmount)
    
    if (res?.error) { setServerError(res.error); setPending(false) }
    else if (res?.success) { clearCart(); onSuccess(res.orderId || '', form.postcode.toUpperCase()) }
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
        Your sofa will be delivered by our white-glove team. We'll call before arrival.
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
        <Field icon={Phone} label="Phone Number(Preferable Whatsapp)" type="tel" name="customerPhone" placeholder="07700 900123" hint="Our driver will call before delivery" value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} />
        
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

      {/* COD notice */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '14px', borderRadius: 10,
        background: `${ACCENT}10`, border: `1px solid ${ACCENT}22`,
        marginBottom: 20,
      }}>
        <Wallet style={{ width: 18, height: 18, color: ACCENT, flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1917' }}>Cash on Delivery</div>
          <div style={{ fontSize: 11, color: '#78716c', lineHeight: 1.5, marginTop: 3 }}>
            You won't be charged now. Pay your driver in cash or by card when your sofa arrives. Your total due on delivery is <strong style={{ color: '#1c1917' }}>£{totalAmount.toFixed(2)}</strong>.
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
        By placing this order you agree to pay on delivery. We'll send a confirmation email with a tracking link.
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
        We've received your order and sent a confirmation email. Our team will be in touch to arrange delivery.
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
        <Link href={`/track-order?postcode=${encodeURIComponent(postcode)}&order=${shortOrderNumber.replace('#', '')}`} style={{
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
  const { cartItems } = useCart()

  const transition = useCallback((nextStep: Step, dir: 'forward' | 'back') => {
    setDirection(dir)
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
    }, 250)
  }, [])

  const goNext   = () => transition('details', 'forward')
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
                Vantage<span style={{ color: ACCENT }}>Group</span>
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
              {step === 'details' && <DetailsStep onBack={goBack} onSuccess={goSuccess} />}
              {step === 'success' && <SuccessStep orderId={orderId} postcode={orderPostcode} />}
            </div>

            {/* Sidebar — hidden on success */}
            {step !== 'success' && cartItems.length > 0 && (
              <div className="hidden lg:block">
                <div style={{ position: 'sticky', top: 80 }}>
                  <OrderSummary />
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
                  <OrderSummary />
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </>
  )
}