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
import { useRouter } from 'next/navigation'
import { MessageCircle, Plus, X, Loader2, Check, Phone, Search } from 'lucide-react'
import { createWhatsAppOrder } from '@/app/actions/manual-order'
import { matchOrderToVisit, type VisitCandidate } from '@/app/actions/visit-match'
import SearchSelect from '@/components/Admin/SearchSelect'
import FindVisit from './FindVisit'
import { parseDepositInput } from '@/utils/orderDeposit'

export interface PickerVariant {
  id: string
  label: string
  /** Catalogue price, used for the placeholder and the running total. */
  price: number
  /** The sofa itself, for "Find the website visit": which visits opened it. */
  productId: string
  productTitle: string
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
  /**
   * What to call this one, when the catalogue has no name for it - a corner
   * cut to a room, a frame copied from a photo the customer sent. Empty on a
   * normal line, and then the chosen sofa names itself. A sofa still has to
   * be picked either way: it is what prices the line and what the reports
   * count. See utils/orderItemTitle.ts.
   */
  customTitle: string
}

const BLANK: Line = { variantId: '', quantity: 1, price: '', fabricId: '', customTitle: '' }

const label = 'block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5'
const field =
  'w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ' +
  'focus:border-stone-900 focus:outline-none focus:ring-0'

export default function NewWhatsAppOrder({
  variants,
  fabrics,
  initialReference = '',
  initialOpen = false,
}: {
  variants: PickerVariant[]
  fabrics: PickerFabric[]
  /** A WhatsApp enquiry's reference (?ref= on the orders page): opens the form with it filled in. */
  initialReference?: string
  /** Opened from Home's "Take a WhatsApp or phone order" (?new=1). */
  initialOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen || Boolean(initialReference))
  const [channel, setChannel] = useState<'whatsapp' | 'phone'>('whatsapp')
  const [isTest, setIsTest] = useState(false)
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
  /** A deposit already taken on the call. Empty means none. */
  const [deposit, setDeposit] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [whatsappReference, setWhatsappReference] = useState(initialReference.toUpperCase())
  const [leadReference, setLeadReference] = useState('')
  /** No reference? The website visit staff picked instead, put on the order once it saves. */
  const [findingVisit, setFindingVisit] = useState(false)
  const [visit, setVisit] = useState<VisitCandidate | null>(null)
  const [lines, setLines] = useState<Line[]>([{ ...BLANK }])

  // The sofas, once each, for the visit finder's "sofa they asked about".
  const products = useMemo(() => {
    const seen = new Map<string, string>()
    for (const v of variants) if (!seen.has(v.productId)) seen.set(v.productId, v.productTitle)
    return [...seen].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title))
  }, [variants])
  const firstProductId = variants.find(v => v.id === lines.find(l => l.variantId)?.variantId)?.productId ?? ''

  const priceOf = useMemo(() => {
    const m = new Map(variants.map(v => [v.id, v.price]))
    return (id: string) => m.get(id) ?? 0
  }, [variants])

  // Both pickers are typed into rather than scrolled: every live colourway of
  // every sofa, and the whole fabric library, are too long to pick from a
  // wheel on a phone. See components/Admin/SearchSelect.
  const variantOptions = useMemo(
    () => variants.map(v => ({ id: v.id, label: v.label, hint: `£${v.price.toFixed(2)}` })),
    [variants],
  )
  const fabricOptions = useMemo(() => fabrics.map(f => ({ id: f.id, label: f.label })), [fabrics])

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

  const depositEntry = parseDepositInput(deposit)
  const depositAmount = depositEntry.ok ? depositEntry.value : 0
  const depositTooHigh = depositEntry.ok && depositAmount > total + 0.004

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines(ls => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)))

  const reset = () => {
    setName(''); setPhone(''); setEmail(''); setAddress(''); setPostcode('')
    setNotes(''); setDelivery(''); setDeposit(''); setWhatsappReference(''); setLeadReference('')
    setFindingVisit(false); setVisit(null); setLines([{ ...BLANK }]); setError('')
    setChannel('whatsapp'); setIsTest(false)
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
        custom_title: l.customTitle.trim() || null,
      }))

    if (items.length === 0) {
      setError('Add at least one sofa.')
      return
    }
    if (items.some(i => i.unit_price !== null && !Number.isFinite(i.unit_price))) {
      setError('One of those prices is not a number.')
      return
    }

    if (!depositEntry.ok) {
      setError('The deposit is not a valid amount. Leave it empty if none was paid.')
      return
    }
    if (depositTooHigh) {
      setError("The deposit can't be more than the order total.")
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
      depositPaid: depositAmount,
      preferredDeliveryDate: deliveryDate || undefined,
      items,
      whatsappReference: whatsappReference.trim() || undefined,
      leadReference: leadReference.trim() || undefined,
      channel,
      isTest,
    })

    // Discriminating on `success` rather than on `error`: it is the literal
    // that narrows the union, and it is the field the action promises.
    if (!res.success) { setPending(false); setError(res.error); return }

    // The visit picked in "Find the website visit" goes on now the order
    // exists. A failure leaves a perfectly good order; its page says so and
    // has the same finder to try again.
    let visitFailed = false
    if (visit && !whatsappReference.trim() && !leadReference.trim()) {
      const matched = await matchOrderToVisit({ orderId: res.fullOrderId, sessionId: visit.session_id })
      visitFailed = 'error' in matched
    }
    setPending(false)
    setDone({ reference: res.orderId, total: res.total })
    reset()
    // Straight to the new order, where the next step and its WhatsApp message are.
    router.push(`/admin/orders/${res.fullOrderId}?done=created${visitFailed ? '&visit=failed' : ''}${res.depositError ? '&deposit=failed' : ''}`)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setDone(null) }}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-stone-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-stone-700"
      >
        <MessageCircle className="h-4 w-4" />
        Take a WhatsApp or phone order
      </button>
    )
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-stone-900">
            <MessageCircle className="h-4 w-4" />
            {channel === 'phone' ? 'Phone order' : 'WhatsApp order'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Behaves exactly like a website order: saves as <strong>pending</strong>, emails
            the customer their receipt with the confirm link (if you enter an email), and
            emails you the new-order alert with the WhatsApp button that sends them the
            same link. Every status change emails from then on. Advertising stays a
            separate deliberate step: the order card gives you a button to send the
            Purchase event to Meta.
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
          <span className="leading-relaxed">
            Saved as <strong className="font-mono">#{done.reference}</strong> — £{done.total.toFixed(2)}
          </span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-5">
        {/* How it came in. Shown in the admin only - the order is saved the
            same way either way, so nothing sent to Meta or OrderFlow changes. */}
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className={label}>Taken on</legend>
          {([['whatsapp', 'WhatsApp', MessageCircle], ['phone', 'Phone', Phone]] as const).map(([value, text, Icon]) => (
            <label
              key={value}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-4 py-2 text-sm font-semibold transition ${
                channel === value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
              }`}
            >
              <input
                type="radio"
                name="wa-channel"
                value={value}
                checked={channel === value}
                onChange={() => setChannel(value)}
                className="sr-only"
              />
              <Icon className="h-4 w-4" aria-hidden="true" />
              {text}
            </label>
          ))}
          <label className="inline-flex sm:ml-auto min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={isTest} onChange={e => setIsTest(e.target.checked)} className="h-5 w-5 accent-violet-600" />
            Test order <span className="text-xs text-stone-400">(kept out of reports and ads)</span>
          </label>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="wa-name">Name</label>
            <input id="wa-name" className={field} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={label} htmlFor="wa-phone">{channel === 'phone' ? 'Phone number' : 'WhatsApp number'}</label>
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
                  <SearchSelect
                    className="flex-1"
                    options={variantOptions}
                    value={line.variantId}
                    onChange={id => setLine(i, { variantId: id })}
                    ariaLabel="Sofa"
                    placeholder="Search by name, colour or SKU…"
                  />
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

                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                  {/* Leave it empty and the sofa above names itself. Type in
                      it and that is the name on the order card, the invoice,
                      the block you forward and the customer's own pages -
                      for the bespoke pieces the catalogue cannot name. */}
                  <input
                    className={field}
                    value={line.customTitle}
                    onChange={e => setLine(i, { customTitle: e.target.value })}
                    maxLength={120}
                    aria-label="Custom name"
                    placeholder="Custom name (optional)"
                    autoComplete="off"
                  />
                  {fabrics.length > 0 && (
                    <SearchSelect
                      options={fabricOptions}
                      value={line.fabricId}
                      onChange={id => setLine(i, { fabricId: id })}
                      ariaLabel="Fabric"
                      placeholder="Search fabrics by name or code…"
                      emptyOptionLabel="No fabric chosen"
                    />
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

        <div className="rounded-sm border border-stone-200 bg-stone-50 p-4">
          <label className={label} htmlFor="wa-reference">
            WhatsApp reference <span className="font-normal normal-case tracking-normal text-stone-400">— best match when the customer sent it</span>
          </label>
          <input
            id="wa-reference"
            className={`${field} uppercase`}
            value={whatsappReference}
            onChange={e => {
              setWhatsappReference(e.target.value.toUpperCase())
              if (e.target.value.trim()) { setVisit(null); setFindingVisit(false) }
            }}
            placeholder="UKSS-WA-260906-A7F31C"
            autoComplete="off"
          />

          <div className="my-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            Or
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          {/* The other way a WhatsApp sale starts: they got as far as
              checkout, asked to be reminded, and we opened the chat. There is
              no click to match on - the enquiry came from us - so the lead
              carries its own reference instead, printed on the card in
              /admin/leads and sent in the reminder itself. */}
          <label className={label} htmlFor="lead-reference">
            Lead reference <span className="font-normal normal-case tracking-normal text-stone-400">&mdash; if they came from a checkout reminder</span>
          </label>
          <input
            id="lead-reference"
            className={`${field} uppercase`}
            value={leadReference}
            onChange={e => {
              setLeadReference(e.target.value.toUpperCase())
              if (e.target.value.trim()) { setVisit(null); setFindingVisit(false) }
            }}
            placeholder="UKSS-LD-261006-7E1E91"
            autoComplete="off"
          />
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Copy it from the lead in <strong>Leads</strong>, or from the
            &ldquo;Ref:&rdquo; line at the bottom of the reminder we sent them.
            It moves that visit&rsquo;s ad click onto this order, so the sale
            reports against the campaign that produced it. An unknown or
            already-used reference is ignored and the order still saves.
          </p>

          <div className="my-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            Or
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          {/* Everyone else - swatches, a call, a chat from a saved number:
              find their visit by when they were on the site and what they
              looked at. See FindVisit.tsx. */}
          {findingVisit || visit ? (
            <div className="rounded-sm border border-blue-100 bg-blue-50/60 p-3">
              <p className="m-0 mb-3 text-xs leading-relaxed text-stone-600">
                No reference? Find their visit by time. Lists people who were on the
                website then, with the pages they opened. Pick the one that matches what
                the customer said. Their ad click goes on the order when you save it.
              </p>
              <FindVisit
                products={products}
                phone={phone}
                defaultProductId={firstProductId}
                defaultChannel={channel === 'phone' ? 'call' : 'whatsapp'}
                mode={{ kind: 'pick', selected: visit, onPick: v => { setVisit(v); if (v) { setWhatsappReference(''); setLeadReference('') } } }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFindingVisit(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:border-stone-400"
            >
              <Search className="h-4 w-4" />
              No reference? Find the website visit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
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
            {/* The day agreed in the chat, if one was. Any day from today: the
                website's four-day lead is for customers choosing unaided, and
                this is a day the shop has already said yes to. It shows on the
                order card, in the emails and in the copy-to-WhatsApp text. */}
            <label className={label} htmlFor="wa-delivery-date">Delivery day agreed</label>
            <input
              id="wa-delivery-date"
              type="date"
              className={field}
              value={deliveryDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setDeliveryDate(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="wa-notes">Notes</label>
            <input id="wa-notes" className={field} value={notes} onChange={e => setNotes(e.target.value)} autoComplete="off" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            {/* Money already received on the call. Part of the price, not on
                top: the balance due on delivery is the total less this. It
                shows on the order, the delivery note, the receipt and the
                customer's confirmation page. */}
            <label className={label} htmlFor="wa-deposit">Deposit paid <span className="font-normal normal-case tracking-normal text-stone-400">(optional)</span></label>
            <input
              id="wa-deposit"
              className={field}
              inputMode="decimal"
              value={deposit}
              onChange={e => setDeposit(e.target.value)}
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
          {deposit.trim() !== '' && (
            <p className="m-0 self-end pb-2 text-xs leading-snug text-stone-500 sm:col-span-2">
              {!depositEntry.ok
                ? 'Not a valid amount.'
                : depositTooHigh
                  ? "More than the order total."
                  : `Taken off the total: £${Math.max(0, total - depositAmount).toFixed(2)} left to collect on delivery.`}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-4">
          <p className="text-sm text-stone-600">
            Total <strong className="text-lg font-bold text-stone-900">£{total.toFixed(2)}</strong>
            {depositEntry.ok && depositAmount > 0 && !depositTooHigh && (
              <span className="block text-xs text-stone-500">Deposit £{depositAmount.toFixed(2)} · balance £{(total - depositAmount).toFixed(2)}</span>
            )}
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
