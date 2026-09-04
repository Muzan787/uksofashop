'use client'

// src/app/admin/orders/NewWhatsAppOrder.tsx
//
// Taking down an order while the conversation is still open.
//
// Shaped around that: it is one screen, every field is optional to tab past
// except the three you cannot deliver without, and the price boxes start EMPTY
// rather than pre-filled with the catalogue figure. Empty means "list price" -
// so the common case is no typing at all, and a number in the box is always a
// deliberate discount rather than something that was already there.
//
// Collapsed by default. This page is read far more often than it is written to,
// and the orders that need doing today should not be pushed below the fold by a
// form.

import { useMemo, useState } from 'react'
import { MessageCircle, Plus, X, Loader2, Check } from 'lucide-react'
import { createWhatsAppOrder } from '@/app/actions/manual-order'

export interface PickerVariant {
  id: string
  label: string
  /** Catalogue price, used for the placeholder and the running total. */
  price: number
}

export interface PickerFabric {
  id: string
  label: string
}

interface Line {
  variantId: string
  quantity: number
  /** Held as text, because empty is a meaningful value here and 0 is not. */
  price: string
  fabricId: string
}

const BLANK: Line = { variantId: '', quantity: 1, price: '', fabricId: '' }

const label = 'block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5'
const field =
  'w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ' +
  'focus:border-stone-900 focus:outline-none focus:ring-0'

export default function NewWhatsAppOrder({
  variants,
  fabrics,
}: {
  variants: PickerVariant[]
  fabrics: PickerFabric[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ reference: string; total: number } | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [postcode, setPostcode] = useState('')
  const [notes, setNotes] = useState('')
  const [delivery, setDelivery] = useState('')
  const [lines, setLines] = useState<Line[]>([{ ...BLANK }])

  const priceOf = useMemo(() => {
    const m = new Map(variants.map(v => [v.id, v.price]))
    return (id: string) => m.get(id) ?? 0
  }, [variants])

  /** What the customer has agreed to, as the form currently stands. */
  const total = useMemo(() => {
    const items = lines.reduce((sum, l) => {
      if (!l.variantId) return sum
      const unit = l.price.trim() === '' ? priceOf(l.variantId) : Number(l.price)
      return sum + (Number.isFinite(unit) ? Math.max(unit, 0) : 0) * l.quantity
    }, 0)
    const d = delivery.trim() === '' ? 0 : Number(delivery)
    return items + (Number.isFinite(d) ? Math.max(d, 0) : 0)
  }, [lines, delivery, priceOf])

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines(ls => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)))

  const reset = () => {
    setName(''); setPhone(''); setEmail(''); setAddress(''); setPostcode('')
    setNotes(''); setDelivery(''); setLines([{ ...BLANK }]); setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const items = lines
      .filter(l => l.variantId)
      .map(l => ({
        variant_id: l.variantId,
        quantity: l.quantity,
        // Blank stays blank all the way to the database, which reads it as
        // "charge the catalogue price".
        unit_price: l.price.trim() === '' ? null : Number(l.price),
        fabric_id: l.fabricId || null,
      }))

    if (items.length === 0) {
      setError('Add at least one sofa.')
      return
    }
    if (items.some(i => i.unit_price !== null && !Number.isFinite(i.unit_price))) {
      setError('One of those prices is not a number.')
      return
    }

    setPending(true)
    const res = await createWhatsAppOrder({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      shippingAddress: address,
      postcode,
      specialInstructions: notes,
      deliveryCharge: delivery.trim() === '' ? 0 : Number(delivery),
      items,
    })
    setPending(false)

    // Discriminating on `success` rather than on `error`: it is the literal
    // that narrows the union, and it is the field the action promises.
    if (!res.success) { setError(res.error); return }
    setDone({ reference: res.orderId, total: res.total })
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setDone(null) }}
        className="inline-flex items-center gap-2 rounded-sm bg-stone-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-stone-700"
      >
        <MessageCircle className="h-4 w-4" />
        Take a WhatsApp order
      </button>
    )
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-stone-900">
            <MessageCircle className="h-4 w-4" />
            WhatsApp order
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Saves as <strong>pending</strong>, like a website order. Mark it confirmed
            once they have agreed, and that is what reports the sale to Meta against
            their number.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-sm p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {done && (
        <div className="mb-5 flex items-center gap-2 rounded-sm border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            Saved as <strong className="font-mono">#{done.reference}</strong> — £{done.total.toFixed(2)}
          </span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="wa-name">Name</label>
            <input id="wa-name" className={field} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={label} htmlFor="wa-phone">WhatsApp number</label>
            <input id="wa-phone" className={field} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="wa-email">
              Email <span className="font-normal normal-case tracking-normal text-stone-400">— optional, but it is the strongest thing Meta can match on</span>
            </label>
            <input id="wa-email" className={field} value={email} onChange={e => setEmail(e.target.value)} inputMode="email" autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="wa-address">Delivery address</label>
            <input id="wa-address" className={field} value={address} onChange={e => setAddress(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={label} htmlFor="wa-postcode">Postcode</label>
            <input
              id="wa-postcode"
              className={`${field} uppercase`}
              value={postcode}
              onChange={e => setPostcode(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          </div>
        </div>

        {/* ── Lines ─────────────────────────────────────────────────────── */}
        <div>
          <p className={label}>What they are buying</p>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="rounded-sm border border-stone-200 bg-stone-50/60 p-3">
                <div className="flex gap-2">
                  <select
                    className={`${field} flex-1`}
                    value={line.variantId}
                    onChange={e => setLine(i, { variantId: e.target.value })}
                    aria-label="Sofa"
                  >
                    <option value="">Choose a sofa…</option>
                    {variants.map(v => (
                      <option key={v.id} value={v.id}>{v.label} — £{v.price.toFixed(2)}</option>
                    ))}
                  </select>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines(ls => ls.filter((_, n) => n !== i))}
                      className="shrink-0 rounded-sm px-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
                      aria-label="Remove this line"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    className={field}
                    type="number"
                    min={1}
                    max={99}
                    value={line.quantity}
                    onChange={e => setLine(i, { quantity: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
                    aria-label="Quantity"
                  />
                  <input
                    className={field}
                    inputMode="decimal"
                    value={line.price}
                    onChange={e => setLine(i, { price: e.target.value })}
                    aria-label="Agreed price each"
                    placeholder={
                      line.variantId ? `£${priceOf(line.variantId).toFixed(2)} list` : 'Price each'
                    }
                  />
                  {fabrics.length > 0 && (
                    <select
                      className={field}
                      value={line.fabricId}
                      onChange={e => setLine(i, { fabricId: e.target.value })}
                      aria-label="Fabric"
                    >
                      <option value="">No fabric chosen</option>
                      {fabrics.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLines(ls => [...ls, { ...BLANK }])}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 transition hover:text-stone-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Another sofa
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="wa-delivery">Delivery charge agreed</label>
            <input
              id="wa-delivery"
              className={field}
              inputMode="decimal"
              value={delivery}
              onChange={e => setDelivery(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={label} htmlFor="wa-notes">Notes</label>
            <input id="wa-notes" className={field} value={notes} onChange={e => setNotes(e.target.value)} autoComplete="off" />
          </div>
        </div>

        {error && (
          <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-4">
          <p className="text-sm text-stone-600">
            Total <strong className="text-lg font-bold text-stone-900">£{total.toFixed(2)}</strong>
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm bg-stone-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </form>
    </div>
  )
}
