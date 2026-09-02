import type { Metadata } from 'next'
// src/app/admin/swatches/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Inbox, Mail, MapPin, Package, Phone, User } from 'lucide-react'
import { setSwatchStatus } from '@/app/actions/swatch-admin'
import { whatsAppLink } from '@/utils/phone'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Swatch requests' }

const FILTERS = [
  { key: 'pending',   label: 'To post' },
  { key: 'posted',    label: 'Posted' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all',       label: 'All' },
] as const

type SearchParams = Promise<{ status?: string }>

interface Item {
  id: string
  fabric_code: string
  fabric_name: string
  fabric_collection: string
}

interface Request {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  postcode: string
  shipping_address: string
  status: string
  created_at: string
  posted_at: string | null
  swatch_request_items: Item[]
}

/**
 * The number, as a WhatsApp link where it can be one.
 *
 * whatsAppLink returns null for anything that is not a dialable UK mobile, and
 * a phone number on this screen is worth showing whether or not we can link it
 * — the alternative is an <a href={null}>, which React renders as a dead link
 * that looks exactly like a live one.
 */
function PhoneLine({ phone }: { phone: string }) {
  const href = whatsAppLink(phone)

  return (
    <p className="m-0 flex items-center gap-2 text-stone-700">
      <Phone className="h-4 w-4 shrink-0 text-stone-400" />
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600">
          {phone}
        </a>
      ) : (
        phone
      )}
    </p>
  )
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

/**
 * The swatch queue.
 *
 * Built around the one thing this screen exists to produce: a line of supplier
 * codes you can read while standing at the shelf. Everything else - who asked,
 * where it goes, when - is below it, because none of it is needed until the
 * samples are already in your hand.
 *
 * Defaults to what still needs doing, the same rule the orders list follows.
 */
export default async function AdminSwatchesPage(props: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const sp = await props.searchParams
  const status = FILTERS.some(f => f.key === sp.status) ? sp.status! : 'pending'

  let query = supabase
    .from('swatch_requests')
    .select(`
      id, customer_name, customer_email, customer_phone,
      postcode, shipping_address, status, created_at, posted_at,
      swatch_request_items ( id, fabric_code, fabric_name, fabric_collection )
    `)

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100)

  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>

  const requests = (data ?? []) as unknown as Request[]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Package className="h-6 w-6 text-stone-700" />
        <h1 className="text-2xl font-bold text-stone-900">Swatch requests</h1>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(f => (
          <Link
            key={f.key}
            href={`/admin/swatches?status=${f.key}`}
            className={`shrink-0 rounded-pill border px-4 py-2 text-sm font-semibold no-underline ${
              status === f.key
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-200 bg-white text-stone-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="m-0 font-semibold text-stone-700">
            {status === 'pending' ? 'Nothing waiting to be posted' : 'Nothing here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
              {/* The picking list. Big, monospaced, and first. */}
              <div className="rounded-lg bg-stone-900 px-4 py-3 text-center">
                <p className="m-0 text-[10px] font-bold uppercase tracking-[2px] text-stone-400">
                  Pull these
                </p>
                <p className="m-0 mt-1 font-mono text-xl tracking-[2px] text-white sm:text-2xl">
                  {r.swatch_request_items.map(i => i.fabric_code).join('  ')}
                </p>
              </div>

              <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                {r.swatch_request_items.map(i => (
                  <li
                    key={i.id}
                    className="rounded-pill border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600"
                  >
                    {i.fabric_collection} {i.fabric_name}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-2 border-t border-stone-100 pt-4 text-sm sm:grid-cols-2">
                <p className="m-0 flex items-center gap-2 text-stone-700">
                  <User className="h-4 w-4 shrink-0 text-stone-400" />
                  {r.customer_name}
                </p>
                <p className="m-0 flex items-center gap-2 text-stone-700">
                  <Mail className="h-4 w-4 shrink-0 text-stone-400" />
                  <a href={`mailto:${r.customer_email}`} className="text-blue-600">
                    {r.customer_email}
                  </a>
                </p>
                {r.customer_phone && <PhoneLine phone={r.customer_phone} />}
                <p className="m-0 flex items-start gap-2 text-stone-700 sm:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                  {r.shipping_address}, <strong>{r.postcode}</strong>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                <p className="m-0 text-xs text-stone-400">
                  Asked {when(r.created_at)}
                  {r.posted_at && ` · posted ${when(r.posted_at)}`}
                </p>

                <div className="flex gap-2">
                  {r.status !== 'posted' && (
                    <form action={setSwatchStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="posted" />
                      <button
                        type="submit"
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        Mark posted
                      </button>
                    </form>
                  )}
                  {r.status === 'pending' && (
                    <form action={setSwatchStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <button
                        type="submit"
                        className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-500"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {r.status === 'posted' && (
                    <span className="rounded-pill border border-green-200 bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                      Posted
                    </span>
                  )}
                  {r.status === 'cancelled' && (
                    <span className="rounded-pill border border-red-200 bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
