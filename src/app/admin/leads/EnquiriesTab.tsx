// src/app/admin/leads/EnquiriesTab.tsx
//
// WhatsApp enquiries (admin upgrade I3, rebuilt in Run 5): every tap on a
// WhatsApp button, with the reference it carried into the chat, the product
// and page it came from, and the campaign behind the visit. A tap is not a
// submitted lead and not a sale: the only stored facts are when it happened,
// where it came from and whether an order was taken with its reference, so
// those are the only statuses offered (utils/enquiryFilters.ts).
//
// "Take this order" opens the new order form with the reference filled in,
// which is what ties the sale to the ad. Once an order was taken, the row says
// so and links to it. Counts on the chips are real counts for the current
// period and source, from the database, not from the page of rows shown.
import Link from 'next/link'
import { Inbox, Search } from 'lucide-react'
import { shortCode } from '@/app/admin/orders/OrderBits'
import { dualTimeText } from '@/utils/adminTime'
import {
  ENQUIRY_PERIODS, ENQUIRY_SOURCES, ENQUIRY_STATUSES, enquiryHref, type EnquiryFilters, type EnquiryStatus,
} from '@/utils/enquiryFilters'

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

const chip = (on: boolean) =>
  `inline-flex min-h-10 items-center gap-2 rounded-pill border px-3.5 text-sm font-semibold ${on ? 'border-ink-900 bg-ink-900 text-white' : 'border-calico-300 bg-white text-ink-700 hover:bg-calico-50'}`

export default function EnquiriesTab({ enquiries, filters, counts, page, lastPage, total, ageNow }: {
  enquiries: Enquiry[]
  filters: EnquiryFilters
  /** Real counts for the current period and source. */
  counts: Record<EnquiryStatus, number | null>
  page: number
  lastPage: number
  total: number
  /** Server clock, so "New" is decided once per render. */
  ageNow: number
}) {
  const href = (change: Parameters<typeof enquiryHref>[1]) => enquiryHref(filters, change)
  const filtered = filters.q !== '' || filters.source !== 'all' || filters.status !== 'open' || filters.period !== '7d'
  return (
    <div className="space-y-4">
      <form action="/admin/leads" method="get" role="search" className="flex gap-2">
        <input type="hidden" name="tab" value="enquiries" />
        <input type="hidden" name="status" value={filters.status} />
        <input type="hidden" name="period" value={filters.period} />
        <input type="hidden" name="source" value={filters.source} />
        <label htmlFor="enquiry-search" className="sr-only">Search by reference or product</label>
        <input
          id="enquiry-search"
          name="q"
          type="search"
          defaultValue={filters.q}
          maxLength={40}
          autoComplete="off"
          placeholder="Reference (UKSS-WA-…) or product, e.g. Roma"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-calico-300 bg-white px-3 py-2.5 text-base text-ink-900 focus:border-ink-900 focus:outline-none"
        />
        <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-ink-900 px-4 text-sm font-bold text-white hover:bg-ink-700">
          <Search className="h-4 w-4" aria-hidden="true" /> Search
        </button>
      </form>

      <div className="space-y-2 rounded-lg border border-calico-300 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Status">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Status</span>
          {ENQUIRY_STATUSES.map(s => (
            <Link key={s.key} href={href({ status: s.key, page: null })} aria-current={filters.status === s.key ? 'true' : undefined} className={chip(filters.status === s.key)}>
              {s.label} <span className="tabular-nums opacity-70">{counts[s.key] ?? '–'}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Taps in</span>
          {ENQUIRY_PERIODS.map(p => (
            <Link key={p.key} href={href({ period: p.key, page: null })} aria-current={filters.period === p.key ? 'true' : undefined} className={chip(filters.period === p.key)}>{p.label}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Source">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Source</span>
          {ENQUIRY_SOURCES.map(s => (
            <Link key={s.key} href={href({ source: s.key, page: null })} aria-current={filters.source === s.key ? 'true' : undefined} className={chip(filters.source === s.key)}>{s.label}</Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-ink-700" role="status">
          {total.toLocaleString('en-GB')} {total === 1 ? 'tap matches' : 'taps match'}{filters.q ? ` “${filters.q}”` : ''}. A tap is a visitor pressing a WhatsApp button; it is not a confirmed sale.
        </p>
        {filtered && (
          <Link href="/admin/leads?tab=enquiries" className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline">Reset filters</Link>
        )}
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-xl border border-calico-300 bg-white px-4 py-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-calico-300" aria-hidden="true" />
          <p className="m-0 font-semibold text-ink-700">No items match these filters</p>
          <p className="m-0 mt-1 text-sm text-ink-500">Try a longer period or another status, or reset the filters.</p>
          <Link href="/admin/leads?tab=enquiries" className="mt-3 inline-flex min-h-11 items-center rounded-md border border-calico-300 px-4 text-sm font-semibold text-ink-900 hover:bg-calico-50">Reset filters</Link>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-calico-300 overflow-hidden rounded-lg border border-calico-300 bg-white p-0 shadow-sm">
          {enquiries.map(e => {
            const path = pagePath(e.page_url)
            const isNew = !e.converted_order_id && ageNow - Date.parse(e.created_at) < 24 * 3600e3
            return (
              <li key={e.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="select-all font-mono text-sm font-bold text-ink-900">{e.reference}</span>
                    {isNew && <span className="rounded-pill border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">New</span>}
                  </span>
                  {e.converted_order_id ? (
                    <Link href={`/admin/orders/${e.converted_order_id}`} className="inline-flex min-h-11 items-center rounded-pill border border-sage-300 bg-sage-50 px-3 text-xs font-bold uppercase tracking-wider text-sage-700">
                      Ordered #{shortCode(e.converted_order_id)}
                    </Link>
                  ) : (
                    <Link href={`/admin/orders?ref=${encodeURIComponent(e.reference)}`} className="inline-flex min-h-11 items-center rounded-md bg-[#128C7E] px-4 text-sm font-bold text-white hover:bg-[#0e7469]">
                      Take this order
                    </Link>
                  )}
                </div>
                <p className="m-0 mt-1 text-xs text-ink-500">{dualTimeText(e.created_at)}</p>
                <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                  {e.product_name && <><dt className="text-ink-500">Product</dt><dd className="m-0 text-ink-900">{e.product_name}</dd></>}
                  {path && <><dt className="text-ink-500">Page</dt><dd className="m-0 break-all text-ink-900">{path}{e.page_context ? <span className="text-ink-500"> · {e.page_context}</span> : null}</dd></>}
                  <dt className="text-ink-500">From</dt><dd className="m-0 break-words text-ink-900">{cameFrom(e)}</dd>
                </dl>
              </li>
            )
          })}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-4">
          {page > 1 ? <Link href={href({ page: page - 1 > 1 ? page - 1 : null })} className="inline-flex min-h-11 items-center rounded-md border border-calico-300 bg-white px-4 text-xs font-bold text-ink-700">← Newer</Link> : <span />}
          <span className="text-xs font-medium text-ink-500">Page {page} of {lastPage}</span>
          {page < lastPage ? <Link href={href({ page: page + 1 })} className="inline-flex min-h-11 items-center rounded-md border border-calico-300 bg-white px-4 text-xs font-bold text-ink-700">Older →</Link> : <span />}
        </div>
      )}
    </div>
  )
}
