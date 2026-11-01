'use client'

// src/app/admin/orders/FindVisit.tsx
//
// "Find the website visit": for a WhatsApp or phone order whose customer
// brought no UKSS-WA-… or UKSS-LD-… reference.
//
// Staff give roughly when the customer was on the site (or when they rang or
// messaged), how sure they are of it, and if they know it the sofa they asked
// about. Every visit active then is listed with where it came from, the
// device, and the pages it opened in order - product names, not addresses -
// so the right one is recognisable rather than guessed. Picking it puts that
// visit's reference and ad click on the order (actions/visit-match.ts), and
// the order's Meta Purchase then goes through the same checks as any other.
//
// Used two ways: inside the new-order form, where the pick waits until the
// order is saved, and on an existing order's page, where it saves at once.

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Check, MapPin, Smartphone, Monitor, Tablet, X } from 'lucide-react'
import SearchSelect from '@/components/Admin/SearchSelect'
import { dualTime } from '@/utils/adminTime'
import { utcToWallClock, type WallClockZone } from '@/utils/wallClock'
import {
  findWebsiteVisits, matchOrderToVisit,
  type PhoneHit, type VisitCandidate, type VisitPage, type VisitSpan,
} from '@/app/actions/visit-match'

export type VisitChannel = 'whatsapp' | 'call' | 'swatches' | 'any'

const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-stone-500'
const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 focus:border-stone-900 focus:outline-none sm:text-sm'
const chip = 'inline-flex items-center rounded-pill border px-2 py-0.5 text-[11px] font-semibold'

const SPANS: [VisitSpan, string][] = [['15', '± 15 min'], ['30', '± 30 min'], ['60', '± 1 hour'], ['180', '± 3 hours'], ['720', '± 12 hours']]
const CHANNELS: [VisitChannel, string][] = [['whatsapp', 'WhatsApp'], ['call', 'Phone call'], ['swatches', 'Swatches'], ['any', 'Not sure']]

/** Where the visit came from, in words. */
export function visitSource(v: VisitCandidate): { text: string; tone: 'meta' | 'google' | 'plain' } {
  const a = v.arrival
  const source = a?.source?.toLowerCase() ?? ''
  if (a?.meta_click) return { text: 'Facebook / Instagram ad', tone: 'meta' }
  if (a?.google_click) return { text: 'Google ad', tone: 'google' }
  if (['facebook', 'instagram', 'meta', 'fb', 'ig'].includes(source)) return { text: 'Facebook / Instagram (no ad click)', tone: 'plain' }
  if (source === 'google') return { text: 'Google search', tone: 'plain' }
  if (source) return { text: a!.source!, tone: 'plain' }
  if (a?.referrer) {
    try { return { text: `From ${new URL(a.referrer).hostname.replace(/^www\./, '')}`, tone: 'plain' } } catch { /* fall through */ }
  }
  return { text: 'Came straight in', tone: 'plain' }
}

function words(slug: string): string {
  const s = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/** A page as staff would name it: the sofa, or what the page is. */
export function pageName(p: VisitPage): string {
  if (p.product) return p.product
  const path = p.path || '/'
  if (path === '/') return 'Home page'
  if (path.startsWith('/build')) return 'Sofa builder'
  if (path.startsWith('/checkout')) return 'Checkout'
  if (path.startsWith('/cart')) return 'Basket'
  if (path.startsWith('/swatches')) return 'Free swatches page'
  const parts = path.split('/').filter(Boolean)
  const last = words(parts[parts.length - 1] ?? '')
  return p.type === 'collection' ? `Range: ${last}` : last || path
}

function DeviceIcon({ device }: { device: string | null }) {
  const Icon = device === 'desktop' ? Monitor : device === 'tablet' ? Tablet : Smartphone
  return <Icon className="h-3.5 w-3.5" aria-hidden="true" />
}

const DEVICE: Record<string, string> = { mobile: 'Phone', desktop: 'Computer', tablet: 'Tablet' }

function ukTime(value: string): string {
  return dualTime(value)?.uk ?? ''
}

/** One visit: when, where from, what it did, and the pages in order. */
export function VisitCard({ visit, action, highlight = false }: { visit: VisitCandidate; action?: React.ReactNode; highlight?: boolean }) {
  const [allPages, setAllPages] = useState(false)
  const source = visitSource(visit)
  const last = dualTime(visit.last_at)
  const pages = allPages ? visit.pages : visit.pages.slice(0, 8)
  const signals: { text: string; strong?: boolean }[] = []
  if (visit.phone_match) signals.push({ text: 'Phone number matches', strong: true })
  if (visit.whatsapp) signals.push({ text: `Tapped WhatsApp ${visit.whatsapp.reference}${visit.whatsapp.used ? ' (already used)' : ''}`, strong: !visit.whatsapp.used })
  if (visit.lead) signals.push({ text: `Asked for a reminder ${visit.lead.reference}${visit.lead.used ? ' (already used)' : ''}` })
  if (visit.tapped_call) signals.push({ text: 'Tapped call' })
  if (visit.saw_swatches) signals.push({ text: 'Opened the swatches page' })
  if (visit.added_to_basket) signals.push({ text: 'Added to basket' })
  if (visit.reached_checkout) signals.push({ text: 'Reached checkout' })

  return (
    <li className={`rounded-sm border bg-white p-3 ${highlight ? 'border-green-400 ring-1 ring-green-300' : 'border-stone-200'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="m-0 text-sm font-bold text-stone-900">
          Last seen {last?.uk} UK <span className="font-normal text-stone-500">· {last?.pk} PK</span>
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
          <DeviceIcon device={visit.device} /> {DEVICE[visit.device ?? ''] ?? 'Device unknown'}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className={`${chip} ${source.tone === 'meta' ? 'border-blue-200 bg-blue-50 text-blue-800' : source.tone === 'google' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-stone-200 bg-stone-50 text-stone-700'}`}>
          {source.text}
        </span>
        {visit.arrival?.campaign && <span className={`${chip} border-stone-200 bg-white text-stone-600`}>Campaign: {visit.arrival.campaign}</span>}
        {visit.arrival?.content && <span className={`${chip} border-stone-200 bg-white text-stone-600`}>Ad: {visit.arrival.content}</span>}
      </div>
      {signals.length > 0 && (
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
          {signals.map(s => (
            <li key={s.text} className={`${chip} ${s.strong ? 'border-green-300 bg-green-50 text-green-800' : 'border-stone-200 bg-stone-50 text-stone-700'}`}>{s.text}</li>
          ))}
        </ul>
      )}
      {visit.pages.length > 0 ? (
        <ol className="m-0 mt-3 list-none space-y-1 border-l-2 border-stone-200 p-0 pl-3 text-sm">
          {pages.map((p, i) => (
            <li key={`${p.at}-${i}`} className="flex gap-2">
              <span className="w-12 shrink-0 tabular-nums text-xs leading-5 text-stone-400">{ukTime(p.at).split(' ').pop()}</span>
              <span className={p.product ? 'font-semibold text-stone-900' : 'text-stone-700'}>{pageName(p)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 mt-3 text-xs text-stone-500">No page list for this visit.</p>
      )}
      {visit.pages.length > 8 && (
        <button type="button" onClick={() => setAllPages(v => !v)} className="mt-1 min-h-9 text-xs font-bold text-stone-600 underline-offset-2 hover:underline">
          {allPages ? 'Show fewer pages' : `Show all ${visit.pages.length} pages`}
        </button>
      )}
      {visit.linked_order_id ? (
        <p className="m-0 mt-3 text-xs font-semibold text-stone-500">
          Already on order{' '}
          <Link href={`/admin/orders/${visit.linked_order_id}`} className="font-mono underline">#{visit.linked_order_id.slice(0, 8).toUpperCase()}</Link>
        </p>
      ) : action}
    </li>
  )
}

type Mode =
  | { kind: 'pick'; selected: VisitCandidate | null; onPick: (visit: VisitCandidate | null) => void }
  | { kind: 'attach'; orderId: string }

export default function FindVisit({
  products,
  phone = '',
  defaultProductId = '',
  defaultAt,
  defaultChannel = 'any',
  mode,
}: {
  products: { id: string; title: string }[]
  /** The order's phone: marks a visit whose reminder carries it, and finds its swatch requests. */
  phone?: string
  defaultProductId?: string
  /** Where the clock starts: the order's time, or now. */
  defaultAt?: string
  defaultChannel?: VisitChannel
  mode: Mode
}) {
  const router = useRouter()
  const [zone, setZone] = useState<WallClockZone>('Asia/Karachi')
  const start = utcToWallClock(defaultAt ?? new Date().toISOString(), 'Asia/Karachi')
  const [date, setDate] = useState(start.date)
  const [time, setTime] = useState(start.time)
  const [span, setSpan] = useState<VisitSpan>('60')
  const [channel, setChannel] = useState<VisitChannel>(defaultChannel)
  const [productId, setProductId] = useState(defaultProductId)
  const [searching, startSearch] = useTransition()
  const [saving, startSave] = useTransition()
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ visits: VisitCandidate[]; hidden: number; more: number; phoneHits: PhoneHit[]; from: string; to: string } | null>(null)
  const [chosen, setChosen] = useState<VisitCandidate | null>(null)
  const [note, setNote] = useState('')

  const productOptions = useMemo(() => products.map(p => ({ id: p.id, label: p.title })), [products])

  const search = (at?: { date: string; time: string; zone: WallClockZone }) => {
    setError('')
    setChosen(null)
    startSearch(async () => {
      const res = await findWebsiteVisits({
        date: at?.date ?? date,
        time: at?.time ?? time,
        timezone: at?.zone ?? zone,
        span,
        productId: productId || undefined,
        phone: phone || undefined,
        channel,
      })
      if (res.error !== undefined) { setResult(null); setError(res.error); return }
      setResult({ visits: res.visits, hidden: res.hiddenNoConsent, more: res.more, phoneHits: res.phoneHits, from: res.from, to: res.to })
    })
  }

  /** "Search around then" on a swatch request or reminder for this number. */
  const searchAround = (at: string) => {
    const wall = utcToWallClock(at, zone)
    setDate(wall.date)
    setTime(wall.time)
    search({ ...wall, zone })
  }

  const save = (visit: VisitCandidate | null) => {
    if (mode.kind !== 'attach') return
    setError('')
    startSave(async () => {
      const res = await matchOrderToVisit({ orderId: mode.orderId, sessionId: visit?.session_id ?? null, note: note || undefined })
      if ('error' in res) { setError(res.error); return }
      setChosen(null)
      setResult(null)
      setNote('')
      router.refresh()
    })
  }

  // In the order form, once a visit is picked the search folds away.
  if (mode.kind === 'pick' && mode.selected) {
    return (
      <div className="space-y-2">
        <p className="m-0 flex items-center gap-2 text-sm font-bold text-green-800">
          <Check className="h-4 w-4" aria-hidden="true" /> This visit goes on the order when you save it
        </p>
        <ul className="m-0 list-none p-0">
          <VisitCard visit={mode.selected} highlight />
        </ul>
        <button type="button" onClick={() => mode.onPick(null)} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900">
          <X className="h-4 w-4" aria-hidden="true" /> Choose a different visit
        </button>
      </div>
    )
  }

  const range = result ? `${dualTime(result.from)?.uk} – ${ukTime(result.to).split(' ').pop()} UK` : ''

  return (
    <div className="space-y-4">
      <fieldset className="m-0 border-0 p-0">
        <legend className={label}>How they got in touch</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHANNELS.map(([value, text]) => (
            <label key={value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-2 text-sm font-semibold transition ${channel === value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>
              <input type="radio" className="sr-only" name="visit-channel" value={value} checked={channel === value} onChange={() => setChannel(value)} />
              {text}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label className={label} htmlFor="visit-date">Date</label>
          <input id="visit-date" type="date" className={field} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="visit-time">Time</label>
          <input id="visit-time" type="time" className={field} value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="visit-zone">Clock shown in</label>
          <select id="visit-zone" className={field} value={zone} onChange={e => setZone(e.target.value as WallClockZone)}>
            <option value="Asia/Karachi">Pakistan</option>
            <option value="Europe/London">UK</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={label} htmlFor="visit-span">How sure of the time</label>
          <select id="visit-span" className={field} value={span} onChange={e => setSpan(e.target.value as VisitSpan)}>
            {SPANS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </div>
      </div>

      <div>
        <span className={label}>Sofa they asked about <span className="font-normal normal-case tracking-normal text-stone-400">— optional, narrows the list</span></span>
        <SearchSelect options={productOptions} value={productId} onChange={setProductId} ariaLabel="Sofa they asked about" placeholder="Any sofa" emptyOptionLabel="Any sofa" />
      </div>

      <button
        type="button"
        onClick={() => search()}
        disabled={searching || !date || !time}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
        {searching ? 'Looking…' : 'Find visits'}
      </button>

      {error && <p role="alert" className="m-0 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

      {result && result.phoneHits.length > 0 && (
        <div className="rounded-sm border border-green-200 bg-green-50 p-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-green-800">This phone number on the website</p>
          <ul className="m-0 mt-2 list-none space-y-2 p-0">
            {result.phoneHits.map(h => (
              <li key={`${h.kind}-${h.at}`} className="flex flex-wrap items-center justify-between gap-2 text-sm text-green-900">
                <span>
                  <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  {h.kind === 'swatches' ? 'Swatch request' : 'Checkout reminder'}: {h.label} · {ukTime(h.at)} UK
                </span>
                <button type="button" onClick={() => searchAround(h.at)} className="min-h-11 rounded-sm border border-green-300 bg-white px-3 text-xs font-bold text-green-800 hover:border-green-500">
                  Search around then
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="m-0 text-sm text-stone-700">
            {result.visits.length === 0
              ? `No visits we can use between ${range}.`
              : `${result.visits.length}${result.more ? ` of ${result.visits.length + result.more}` : ''} visit${result.visits.length === 1 ? '' : 's'} between ${range}, closest first.`}
            {result.more > 0 && ' Narrow the time or pick the sofa to see the rest.'}
          </p>
          {result.hidden > 0 && (
            <p className="m-0 text-xs text-stone-500">
              {result.hidden} more visit{result.hidden === 1 ? '' : 's'} in that time can&apos;t be used: they didn&apos;t allow advertising cookies.
            </p>
          )}
          <p className="m-0 text-xs text-stone-500">Only pick one you are sure of: the pages should be what the customer talked about.</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {result.visits.map(v => {
              const isChosen = chosen?.session_id === v.session_id
              const action = mode.kind === 'pick' ? (
                <button type="button" onClick={() => mode.onPick(v)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-700">
                  <Check className="h-4 w-4" aria-hidden="true" /> This is them
                </button>
              ) : isChosen ? (
                <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                  <label className={label} htmlFor={`visit-note-${v.session_id}`}>Why you are sure <span className="font-normal normal-case tracking-normal text-stone-400">— optional, kept on the order</span></label>
                  <input id={`visit-note-${v.session_id}`} className={field} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. asked about the grey Hannah, rang at 2pm" />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={saving} onClick={() => save(v)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-green-700 px-4 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                      Put this visit on the order
                    </button>
                    <button type="button" disabled={saving} onClick={() => setChosen(null)} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setChosen(v); setNote('') }} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-700">
                  <Check className="h-4 w-4" aria-hidden="true" /> This is them
                </button>
              )
              return <VisitCard key={v.session_id} visit={v} action={action} highlight={isChosen} />
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** On an order already matched by hand: take the match off. */
export function RemoveVisitMatch({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const [error, setError] = useState('')
  return (
    <div>
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          if (!window.confirm('Take this visit off the order? Its ad click goes with it.')) return
          setError('')
          startSave(async () => {
            const res = await matchOrderToVisit({ orderId, sessionId: null })
            if ('error' in res) setError(res.error)
            else router.refresh()
          })
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:border-stone-500 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        It wasn&apos;t them: remove this match
      </button>
      {error && <p role="alert" className="m-0 mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
