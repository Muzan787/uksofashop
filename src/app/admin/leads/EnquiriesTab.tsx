// src/app/admin/leads/EnquiriesTab.tsx
//
// WhatsApp enquiries (admin upgrade I3): every tap on a WhatsApp button, with
// the reference it carried into the chat, the product and page it came from,
// and the campaign behind the visit. When a customer quotes the reference -
// or it is in the chat - search for it here, then "Take this order" opens the
// new order form with it filled in, which is what ties the sale to the ad.
// Once an order was taken with it, the enquiry says so and links to it.
//
// Opens on the last 24 hours; Show all lists every one, 50 at a time.
import Link from 'next/link'
import { Inbox, Search } from 'lucide-react'
import { shortCode } from '@/app/admin/orders/OrderBits'
import { dualTimeText } from '@/utils/adminTime'
import { leadsHref } from '@/utils/leadsTabs'

export interface Enquiry {
  id: string
  reference: string
  created_at: string
  page_url: string | null
  page_context: string | null
  product_name: string | null
  utm_source: string | null
  utm_campaign: string | null
  fbclid: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  converted_order_id: string | null
}

/** Where the visit came from, in words. */
function cameFrom(e: Enquiry): string {
  const campaign = e.utm_campaign?.trim()
  if (e.fbclid || /^(meta|facebook|fb|instagram|ig)$/i.test(e.utm_source ?? '')) return campaign ? `Meta ad: ${campaign}` : 'Meta ad'
  if (e.gclid || e.gbraid || e.wbraid || /^google$/i.test(e.utm_source ?? '')) return campaign ? `Google ad: ${campaign}` : 'Google ad'
  if (e.utm_source) return campaign ? `${e.utm_source}: ${campaign}` : e.utm_source
  return 'No campaign'
}

/** "/shop/sofas/verona" from the full address, without the tracking query. */
function pagePath(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).pathname
  } catch {
    return url.split('?')[0]
  }
}

export default function EnquiriesTab({ enquiries, showAll, q, page, lastPage, total }: {
  enquiries: Enquiry[]
  showAll: boolean
  q: string
  page: number
  lastPage: number
  total: number
}) {
  const href = (p: number) => leadsHref('enquiries', { show: showAll ? 'all' : null, q: q || null, page: p > 1 ? p : null })
  return (
    <div className="space-y-4">
      <form action="/admin/leads" method="get" role="search" className="flex gap-2">
        <input type="hidden" name="tab" value="enquiries" />
        <label htmlFor="enquiry-search" className="sr-only">Search by reference</label>
        <input
          id="enquiry-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Reference, e.g. UKSS-WA-…"
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 focus:border-stone-900 focus:outline-none"
        />
        <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-700">
          <Search className="h-4 w-4" aria-hidden="true" /> Search
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-stone-600">
          {q
            ? `${total} ${total === 1 ? 'enquiry matches' : 'enquiries match'} “${q}”.`
            : showAll ? `Every WhatsApp tap, newest first (${total}).` : 'WhatsApp taps in the last 24 hours.'}
        </p>
        <Link href={q ? leadsHref('enquiries') : leadsHref('enquiries', { show: showAll ? null : 'all' })} className="inline-flex min-h-11 items-center text-sm font-semibold text-stone-900 underline">
          {q ? 'Clear search' : showAll ? 'Last 24 hours' : 'Show all'}
        </Link>
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="m-0 font-semibold text-stone-700">{q ? 'No enquiry with that reference' : 'No WhatsApp taps here'}</p>
          <p className="m-0 mt-1 text-sm text-stone-500">{q ? 'Check the reference in the chat, or try Show all.' : 'Each tap on a WhatsApp button on the site appears here.'}</p>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-stone-100 overflow-hidden rounded-md border border-stone-200 bg-white p-0 shadow-sm">
          {enquiries.map(e => {
            const path = pagePath(e.page_url)
            return (
              <li key={e.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="select-all font-mono text-sm font-bold text-stone-900">{e.reference}</span>
                  {e.converted_order_id ? (
                    <Link href={`/admin/orders/${e.converted_order_id}`} className="inline-flex min-h-11 items-center rounded-pill border border-green-200 bg-green-50 px-3 text-xs font-bold uppercase tracking-wider text-green-800">
                      Ordered #{shortCode(e.converted_order_id)}
                    </Link>
                  ) : (
                    <Link href={`/admin/orders?ref=${encodeURIComponent(e.reference)}`} className="inline-flex min-h-11 items-center rounded-sm bg-[#128C7E] px-4 text-sm font-bold text-white hover:bg-[#0e7469]">
                      Take this order
                    </Link>
                  )}
                </div>
                <p className="m-0 mt-1 text-xs text-stone-500">{dualTimeText(e.created_at)}</p>
                <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                  {e.product_name && <><dt className="text-stone-500">Product</dt><dd className="m-0 text-stone-900">{e.product_name}</dd></>}
                  {path && <><dt className="text-stone-500">Page</dt><dd className="m-0 break-all text-stone-900">{path}{e.page_context ? <span className="text-stone-500"> · {e.page_context}</span> : null}</dd></>}
                  <dt className="text-stone-500">From</dt><dd className="m-0 break-words text-stone-900">{cameFrom(e)}</dd>
                </dl>
              </li>
            )
          })}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-4">
          {page > 1 ? <Link href={href(page - 1)} className="inline-flex min-h-11 items-center rounded-sm border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700">← Newer</Link> : <span />}
          <span className="text-xs font-medium text-stone-500">Page {page} of {lastPage}</span>
          {page < lastPage ? <Link href={href(page + 1)} className="inline-flex min-h-11 items-center rounded-sm border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700">Older →</Link> : <span />}
        </div>
      )}
    </div>
  )
}
