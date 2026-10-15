// src/app/admin/leads/SamplesTab.tsx
//
// Samples (admin upgrade I1): the swatch queue that used to be its own page,
// /admin/swatches, which now opens this tab.
//
// Built around the one thing this screen exists to produce: a line of supplier
// codes you can read while standing at the shelf. Everything else - who asked,
// where it goes, when - is below it, because none of it is needed until the
// samples are already in your hand.
//
// Defaults to what still needs doing, the same rule the orders list follows.
import Link from 'next/link'
import { Inbox, Mail, MapPin, Phone, User } from 'lucide-react'
import { setSwatchStatus } from '@/app/actions/swatch-admin'
import ConfirmSubmit from '@/components/Admin/ConfirmSubmit'
import { whatsAppLink } from '@/utils/phone'
import { SAMPLE_FEE } from '@/constants/swatches'
import { dualTimeText } from '@/utils/adminTime'
import { leadsHref } from '@/utils/leadsTabs'
import SwatchActions from './SwatchActions'

export const SAMPLE_FILTERS = [
  { key: 'pending', label: 'To post' },
  { key: 'posted', label: 'Posted' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'Show all' },
] as const

export interface SampleRequest {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  postcode: string
  shipping_address: string
  status: string
  created_at: string
  posted_at: string | null
  swatch_request_items: { id: string; fabric_code: string; fabric_name: string; fabric_collection: string }[]
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
      <Phone className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-blue-600">{phone}</a> : phone}
    </p>
  )
}

/** UK and Pakistan time together. */
const when = (iso: string | null) => dualTimeText(iso) ?? ''

function StatusForm({ id, status, children, question, className }: {
  id: string; status: 'pending' | 'posted' | 'cancelled'; children: React.ReactNode; question?: string; className: string
}) {
  return (
    <form action={setSwatchStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <ConfirmSubmit question={question} className={className}>{children}</ConfirmSubmit>
    </form>
  )
}

const green = 'inline-flex min-h-11 items-center rounded-lg bg-green-600 px-4 text-sm font-bold text-white disabled:opacity-60'
const plain = 'inline-flex min-h-11 items-center rounded-lg border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 disabled:opacity-60'

export default function SamplesTab({ requests, status }: { requests: SampleRequest[]; status: string }) {
  return (
    <div className="space-y-4">
      <p className="m-0 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Ring or WhatsApp to take the fee, post them, then mark them posted.
      </p>

      <nav aria-label="Filter samples" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
        {SAMPLE_FILTERS.map(f => (
          <Link
            key={f.key}
            href={leadsHref('samples', { status: f.key === 'pending' ? null : f.key })}
            aria-current={status === f.key ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-sm font-semibold no-underline ${
              status === f.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="m-0 font-semibold text-stone-700">{status === 'pending' ? 'Nothing waiting to be posted' : 'Nothing here'}</p>
          <p className="m-0 mt-1 text-sm text-stone-500">New sample requests from the shop appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
              {/* The picking list. Big, monospaced, and first. */}
              <div className="rounded-lg bg-stone-900 px-4 py-3 text-center">
                <p className="m-0 text-[10px] font-bold uppercase tracking-[2px] text-stone-400">Pull these</p>
                <p className="m-0 mt-1 break-words font-mono text-xl tracking-[2px] text-white sm:text-2xl">
                  {r.swatch_request_items.map(i => i.fabric_code).join('  ')}
                </p>
              </div>

              {/* The money, next to the picking list: taking it is the step
                  between reading the codes and posting them. */}
              {r.status === 'pending' && (
                <p className="m-0 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <strong className="font-bold">{SAMPLE_FEE} to collect</strong> on the call.
                  Refunded against their order if they buy — nothing goes in the post until it is paid.
                </p>
              )}

              <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                {r.swatch_request_items.map(i => (
                  <li key={i.id} className="rounded-pill border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                    {i.fabric_collection} {i.fabric_name}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-2 border-t border-stone-100 pt-4 text-sm sm:grid-cols-2">
                <p className="m-0 flex items-center gap-2 text-stone-700">
                  <User className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                  {r.customer_name}
                </p>
                <p className="m-0 flex min-w-0 items-center gap-2 text-stone-700">
                  <Mail className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                  <a href={`mailto:${r.customer_email}`} className="inline-flex min-h-11 min-w-0 items-center text-blue-600"><span className="truncate">{r.customer_email}</span></a>
                </p>
                {r.customer_phone && <PhoneLine phone={r.customer_phone} />}
                <p className="m-0 flex items-start gap-2 text-stone-700 sm:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                  <span>{r.shipping_address}, <strong>{r.postcode}</strong></span>
                </p>
              </div>

              {/* Chase and copy, apart from the buttons that change the record,
                  so a Cancel is never pressed by mistake. */}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <SwatchActions
                  request={{
                    customerName: r.customer_name,
                    customerEmail: r.customer_email,
                    customerPhone: r.customer_phone,
                    postcode: r.postcode,
                    shippingAddress: r.shipping_address,
                    createdAt: r.created_at,
                    items: r.swatch_request_items.map(i => ({ code: i.fabric_code, name: i.fabric_name, collection: i.fabric_collection })),
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                <p className="m-0 text-xs text-stone-400">
                  Asked {when(r.created_at)}
                  {r.posted_at && ` · posted ${when(r.posted_at)}`}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {r.status === 'posted' && (
                    <span className="rounded-pill border border-green-200 bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">Posted</span>
                  )}
                  {r.status === 'cancelled' && (
                    <span className="rounded-pill border border-red-200 bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">Cancelled</span>
                  )}
                  {r.status !== 'posted' && <StatusForm id={r.id} status="posted" className={green}>Paid and posted</StatusForm>}
                  {r.status === 'pending' && (
                    <StatusForm id={r.id} status="cancelled" question={`Cancel ${r.customer_name}'s sample request?`} className={plain}>Cancel</StatusForm>
                  )}
                  {r.status !== 'pending' && <StatusForm id={r.id} status="pending" className={plain}>Back to waiting</StatusForm>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
