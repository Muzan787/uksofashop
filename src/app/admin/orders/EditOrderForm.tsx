'use client'
// src/app/admin/orders/EditOrderForm.tsx
//
// Correcting an order that already exists.
//
// A "Edit order" button on the card opens this in place of the card's
// details, filled in with what the order holds now: who, where, notes, the
// agreed delivery day and charge, and each line's sofa, quantity, price and
// fabric. Lines can be added or taken away. Save recomputes the totals in
// the database and the card re-renders; nothing else happens - no email, no
// status change, no signal to an ad platform. That is the brief (2026-09-20).
//
// The sofa and fabric pickers are the same lists the WhatsApp order form
// uses. A line on an old order may name a product since withdrawn, which the
// picker no longer lists; that line keeps a single option of its own so it
// can still be corrected rather than being blanked.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Pencil, Plus, X } from 'lucide-react'
import { updateOrderDetails } from '@/app/actions/orders'
import type { AdminOrderDisplay } from '@/types/adminOrders'
import { splitAddress } from './CopyOrderButton'
import type { PickerFabric, PickerVariant } from './NewWhatsAppOrder'
import { describeFinish } from '@/utils/orderFinish'

interface Line {
  itemId: string | null
  variantId: string
  /** What the picker cannot name - a withdrawn product - as it was on the order. */
  fallbackLabel: string
  quantity: number
  price: string
  fabricId: string
}

const label = 'block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5'
const field =
  'w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ' +
  'focus:border-stone-900 focus:outline-none focus:ring-0'

function linesFrom(order: AdminOrderDisplay): Line[] {
  return (order.order_items ?? []).map(item => ({
    itemId: item.id ?? null,
    variantId: item.variant_id ?? '',
    fallbackLabel: [
      item.product_variants?.products?.title,
      describeFinish({ ...item, color: item.product_variants?.color }).label,
    ]
      .filter(Boolean)
      .join(' · ') || 'Item',
    quantity: Number(item.quantity) || 1,
    price: Number(item.price_at_time_of_purchase).toFixed(2),
    fabricId: item.fabric_id ?? '',
  }))
}

export default function EditOrderForm({
  order, variants, fabrics,
}: {
  order: AdminOrderDisplay
  variants: PickerVariant[]
  fabrics: PickerFabric[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const split = useMemo(() => splitAddress(order.shipping_address), [order.shipping_address])
  const [name, setName] = useState(order.customer_name)
  const [phone, setPhone] = useState(order.customer_phone)
  const [email, setEmail] = useState(order.customer_email ?? '')
  const [address, setAddress] = useState(split.address)
  const [postcode, setPostcode] = useState(split.postcode ?? '')
  const [notes, setNotes] = useState(order.special_instructions ?? '')
  const [deliveryDate, setDeliveryDate] = useState(order.preferred_delivery_date ?? '')
  const [delivery, setDelivery] = useState(Number(order.delivery_total ?? 0).toFixed(2))
  const [lines, setLines] = useState<Line[]>(() => linesFrom(order))

  const known = useMemo(() => new Set(variants.map(v => v.id)), [variants])
  const priceOf = useMemo(() => {
    const m = new Map(variants.map(v => [v.id, v.price]))
    return (id: string) => m.get(id) ?? 0
  }, [variants])

  const total = useMemo(() => {
    const items = lines.reduce((sum, l) => {
      const unit = Number(l.price)
      return sum + (Number.isFinite(unit) ? Math.max(unit, 0) : 0) * l.quantity
    }, 0)
    const d = Number(delivery)
    const discount = Number(order.discount_amount ?? 0)
    return Math.max(0, items - discount) + (Number.isFinite(d) ? Math.max(d, 0) : 0)
  }, [lines, delivery, order.discount_amount])

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines(ls => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)))

  const reset = () => {
    setName(order.customer_name); setPhone(order.customer_phone); setEmail(order.customer_email ?? '')
    setAddress(split.address); setPostcode(split.postcode ?? ''); setNotes(order.special_instructions ?? '')
    setDeliveryDate(order.preferred_delivery_date ?? ''); setDelivery(Number(order.delivery_total ?? 0).toFixed(2))
    setLines(linesFrom(order)); setError('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const items = lines.filter(l => l.variantId)
    if (items.length === 0) { setError('An order needs at least one sofa.'); return }
    if (items.some(l => !Number.isFinite(Number(l.price)))) { setError('One of those prices is not a number.'); return }
    if (!Number.isFinite(Number(delivery))) { setError('The delivery charge is not a number.'); return }

    startTransition(async () => {
      const res = await updateOrderDetails({
        orderId: order.id,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: address,
        postcode,
        specialInstructions: notes,
        preferredDeliveryDate: deliveryDate,
        deliveryTotal: Number(delivery),
        items: items.map(l => ({
          item_id: l.itemId,
          variant_id: l.variantId,
          quantity: l.quantity,
          unit_price: Number(l.price),
          fabric_id: l.fabricId || null,
        })),
      })
      if ('error' in res) { setError(res.error); return }
      setSaved(true)
      setOpen(false)
      router.refresh()
      window.setTimeout(() => setSaved(false), 2500)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { reset(); setOpen(true) }}
        className="flex items-center justify-center gap-2 rounded-sm bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200 active:scale-95"
        title="Edit this order"
        aria-label="Edit order"
      >
        {saved ? <Check className="h-5 w-5 text-green-600" /> : <Pencil className="h-5 w-5" />}
      </button>
    )
  }

  return (
    // basis-full: the quick-actions row wraps, so the open form takes a full
    // line of its own beneath the buttons rather than squeezing between them.
    <form onSubmit={submit} noValidate className="mt-2 w-full basis-full space-y-4 rounded-sm border border-stone-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-bold text-stone-900">Edit order #{order.id.substring(0, 8).toUpperCase()}</p>
          <p className="m-0 mt-0.5 text-xs text-stone-500">
            Changes the record only. No email goes out and the status stays as it is.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-sm p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`edit-name-${order.id}`}>Name</label>
          <input id={`edit-name-${order.id}`} className={field} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className={label} htmlFor={`edit-phone-${order.id}`}>Mobile</label>
          <input id={`edit-phone-${order.id}`} className={field} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="off" />
        </div>
        <div>
          <label className={label} htmlFor={`edit-email-${order.id}`}>Email <span className="font-normal normal-case tracking-normal text-stone-400">(optional)</span></label>
          <input id={`edit-email-${order.id}`} className={field} value={email} onChange={e => setEmail(e.target.value)} inputMode="email" autoComplete="off" />
        </div>
        <div>
          <label className={label} htmlFor={`edit-postcode-${order.id}`}>Postcode</label>
          <input id={`edit-postcode-${order.id}`} className={field} value={postcode} onChange={e => setPostcode(e.target.value.toUpperCase())} autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`edit-address-${order.id}`}>Delivery address</label>
          <input id={`edit-address-${order.id}`} className={field} value={address} onChange={e => setAddress(e.target.value)} autoComplete="off" />
        </div>
      </div>

      <div>
        <p className={label}>Lines</p>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={line.itemId ?? `new-${i}`} className="rounded-sm border border-stone-200 bg-stone-50/60 p-3">
              <div className="flex gap-2">
                <select
                  className={`${field} flex-1`}
                  value={line.variantId}
                  onChange={e => setLine(i, { variantId: e.target.value })}
                  aria-label="Sofa"
                >
                  <option value="">Choose a sofa…</option>
                  {line.variantId && !known.has(line.variantId) && (
                    <option value={line.variantId}>{line.fallbackLabel} (no longer listed)</option>
                  )}
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
                  aria-label="Price each"
                  placeholder={line.variantId && known.has(line.variantId) ? `£${priceOf(line.variantId).toFixed(2)} list` : 'Price each'}
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
          onClick={() => setLines(ls => [...ls, { itemId: null, variantId: '', fallbackLabel: '', quantity: 1, price: '', fabricId: '' }])}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 transition hover:text-stone-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Another sofa
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor={`edit-delivery-${order.id}`}>Delivery charge</label>
          <input
            id={`edit-delivery-${order.id}`}
            className={field}
            inputMode="decimal"
            value={delivery}
            onChange={e => setDelivery(e.target.value)}
          />
          {(Number(order.fee_upstairs ?? 0) + Number(order.fee_assembly ?? 0) + Number(order.fee_sofa_removal ?? 0)) > 0 && (
            <p className="m-0 mt-1 text-[11px] leading-snug text-stone-500">
              Currently itemised (upstairs, assembly, removal). Changing the figure replaces that with one agreed charge.
            </p>
          )}
        </div>
        <div>
          <label className={label} htmlFor={`edit-date-${order.id}`}>Delivery day</label>
          <input id={`edit-date-${order.id}`} type="date" className={field} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor={`edit-notes-${order.id}`}>Notes</label>
          <input id={`edit-notes-${order.id}`} className={field} value={notes} onChange={e => setNotes(e.target.value)} autoComplete="off" />
        </div>
      </div>

      {error && (
        <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-2 border-t border-stone-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm text-stone-700">
          New total <span className="font-mono font-bold text-stone-900">£{total.toFixed(2)}</span>
          {Number(order.discount_amount ?? 0) > 0 && (
            <span className="text-stone-500"> (after the £{Number(order.discount_amount).toFixed(2)} offer already on the order)</span>
          )}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-sm border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-sm bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </form>
  )
}
