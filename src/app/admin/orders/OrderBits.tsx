// src/app/admin/orders/OrderBits.tsx
//
// The small pieces the orders list and the order page share: the status
// badge, the tags that say where an order came from and what it needs, and
// the WhatsApp mark.
import { adminStatusLabel } from '@/utils/adminStatus'

const STATUS_STYLES: Record<string, string> = {
  pending_cod: 'bg-stone-100 text-stone-700 border-stone-300',
  confirmed: 'bg-amber-100 text-amber-800 border-amber-200',
  on_hold: 'bg-orange-100 text-orange-800 border-orange-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? 'pending_cod'
  return (
    <span className={`inline-flex shrink-0 items-center rounded-pill border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLES[key] ?? STATUS_STYLES.pending_cod}`}>
      {adminStatusLabel(key)}
    </span>
  )
}

const tag = 'inline-flex items-center rounded-pill border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider'

export interface TaggableOrder {
  source: string | null
  utm_source?: string | null
  manual_acquisition_source?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  fbclid?: string | null
  preferred_delivery_date?: string | null
  created_at?: string | null
  status?: string | null
  channel?: string | null
  has_made_to_order?: boolean | null
  is_test?: boolean | null
  test_reason?: string | null
}

/** Where it came from (if not the website), made to order, and Test. */
export function OrderTags({ order, long = false }: { order: TaggableOrder; long?: boolean }) {
  const channel = order.channel ?? (order.source === 'whatsapp' ? 'whatsapp' : null)
  const override = order.manual_acquisition_source?.toLowerCase()
  const google = override === 'google' || (!override && order.utm_source?.toLowerCase() === 'google' && Boolean(order.gclid || order.gbraid || order.wbraid) && !order.fbclid)
  const meta = !google && (override === 'meta' || (!override && ['fb','ig','meta','facebook','instagram'].includes((order.utm_source || '').toLowerCase())))
  const futureRequested = Boolean(order.preferred_delivery_date && order.created_at &&
    Date.parse(order.preferred_delivery_date + 'T12:00:00Z') - Date.parse(order.created_at) > 14 * 86400 * 1000 &&
    !['delivered','cancelled'].includes(order.status || ''))
  return (
    <>
      {channel === 'whatsapp' && <span className={`${tag} border-green-200 bg-green-50 text-green-800`}>WhatsApp</span>}
      {channel === 'phone' && <span className={`${tag} border-sky-200 bg-sky-50 text-sky-800`}>Phone</span>}
      {!channel && <span className={`${tag} border-stone-200 bg-stone-50 text-stone-600`}>Website</span>}
      {google && <span className={`${tag} border-sky-200 bg-sky-50 text-sky-800`}>Google attributed (click evidence)</span>}
      {meta && <span className={`${tag} border-blue-200 bg-blue-50 text-blue-800`}>Meta ad origin</span>}
      {futureRequested && <span className={`${tag} border-amber-200 bg-amber-50 text-amber-900`}>Future delivery request · reconfirm</span>}
      {order.has_made_to_order && (
        <span className={`${tag} border-amber-200 bg-amber-50 text-amber-800`}>
          {long ? 'Made to order: ring to confirm' : 'Made to order'}
        </span>
      )}
      {order.is_test && (
        <span title={order.test_reason ?? undefined} className={`${tag} border-violet-200 bg-violet-50 text-violet-800`}>
          {long && order.test_reason ? `Test: ${order.test_reason}` : 'Test'}
        </span>
      )}
    </>
  )
}

export function WhatsAppMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z" />
    </svg>
  )
}

export const money = (n: number | null | undefined) =>
  `£${Number(n ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const shortCode = (id: string) => id.substring(0, 8).toUpperCase()
