// src/utils/workstation.ts
//
// The Workstation (Run 8): every open job as ONE line per real record, from
// the same facts the Today queue counts (utils/adminTaskData.ts), so the two
// can never disagree. Each line says what to do, by when, and opens the exact
// record where the existing, guarded action lives (the order page's Meta send
// button, status buttons and source form; the Leads reminders tab; the Google
// and Status pages). Nothing here sends, confirms or edits anything: there is
// no second sender and no shortcut around consent, the 7-day limit or the
// one-send rule. "Completed" lists only things the records say happened.
//
// Customer names, phones and emails are never part of a line: the order's
// short code is enough to find it, and the order page shows the rest to staff.
import 'server-only'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { orderAdvertisingConsent } from '@/utils/metaOrderConsent'
import { META_EVENT_MAX_AGE_MS, classifyMetaEvent, type ConsentReason } from '@/utils/metaQueue'
import { META_SIGNAL_COLUMNS, type MetaSignalOrder } from '@/utils/metaSignals'
import type { ConversionAttempt } from '@/utils/metaReply'
import { reviewReason, type ReviewOrder } from '@/utils/sourceReview'
import { classifyWork, type WorkItem } from '@/utils/workstationRules'

const DAY = 86400000
const OPEN_STATUSES = ['pending_cod', 'confirmed', 'on_hold', 'processing', 'shipped']
const code = (id: string) => id.slice(0, 8).toUpperCase()

type SignalRow = MetaSignalOrder & { id: string; created_at: string | null; visitor_id: string | null; session_id: string | null; arrival_id: string | null }

export interface WorkstationData {
  items: WorkItem[]
  /** Facts that could not be read, named, so the page can say so instead of showing zero. */
  failed: string[]
  leadsWaiting: number | null
  googleUnverified: number | null
  failedEmails: number | null
}

export async function loadWorkstation(now = Date.now()): Promise<WorkstationData> {
  await requireAdmin()
  const db = createUntypedAdminClient()
  const items: WorkItem[] = []
  const failed: string[] = []

  // Meta events eligible right now (the same rule as Admin -> Meta).
  try {
    const cutoff = new Date(now - META_EVENT_MAX_AGE_MS).toISOString()
    const { data, error } = await db.from('orders')
      .select(`id, created_at, visitor_id, session_id, arrival_id, ${META_SIGNAL_COLUMNS}`)
      .eq('is_test', false).neq('status', 'cancelled')
      .or(`and(confirmed_at.gte.${cutoff},purchase_event_sent_at.is.null),and(status.eq.delivered,delivered_at.gte.${cutoff},delivered_event_sent_at.is.null)`)
      .limit(200)
    if (error) throw error
    for (const row of (data ?? []) as unknown as SignalRow[]) {
      const consent = await orderAdvertisingConsent(row)
      const attempts: ConversionAttempt[] = []
      for (const kind of ['purchase', 'delivered'] as const) {
        const item = classifyMetaEvent(row, kind, consent.reason as ConsentReason, attempts, now)
        if (item.state !== 'eligible' || !item.sendBy) continue
        items.push(classifyWork({
          type: 'meta_send', id: `${row.id}:${kind}`, code: code(row.id), href: `/admin/orders/${row.id}`,
          what: `Send the ${kind === 'purchase' ? 'Purchase' : 'Delivered'} event to Meta`,
          why: 'Eligible: consent given, inside Meta’s 7-day limit, not sent before.',
          action: `Open order ${code(row.id)} and press Send (once)`, deadline: item.sendBy, source: 'meta',
        }, now))
      }
    }
  } catch { failed.push('Meta events') }

  // Orders: waiting for the customer to confirm, and past the customer's own date.
  try {
    const today = new Date(now).toISOString().slice(0, 10)
    const [waiting, overdue] = await Promise.all([
      db.from('orders').select('id, created_at').eq('is_test', false).eq('status', 'pending_cod').order('created_at', { ascending: true }).limit(200),
      db.from('orders').select('id, status, preferred_delivery_date').eq('is_test', false).in('status', OPEN_STATUSES).lt('preferred_delivery_date', today).limit(200),
    ])
    if (waiting.error || overdue.error) throw waiting.error ?? overdue.error
    for (const o of waiting.data ?? []) {
      const days = Math.floor((now - Date.parse(o.created_at)) / DAY)
      items.push(classifyWork({
        type: 'confirm_order', id: `${o.id}:confirm`, code: code(o.id), href: `/admin/orders/${o.id}`,
        what: 'Confirm the order with the customer',
        why: `Placed ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}, not confirmed yet.`,
        action: `Open order ${code(o.id)}, call or WhatsApp, then set Confirmed`, deadline: null, ageDays: days, source: 'order',
      }, now))
    }
    for (const o of overdue.data ?? []) {
      items.push(classifyWork({
        type: 'overdue_delivery', id: `${o.id}:overdue`, code: code(o.id), href: `/admin/orders/${o.id}`,
        what: 'Delivery is past the customer’s requested date',
        why: `Requested ${o.preferred_delivery_date}; status is still ${String(o.status).replace('_', ' ')}.`,
        action: `Open order ${code(o.id)}, update the status or agree a new date`, deadline: `${o.preferred_delivery_date}T23:59:59Z`, source: 'order',
      }, now))
    }
  } catch { failed.push('Orders') }

  // Orders whose advert source needs a person to look at the evidence.
  try {
    const { data, error } = await db.from('orders')
      .select('id,status,is_test,manual_acquisition_source,utm_source,gclid,gbraid,wbraid,fbclid,meta_fbc,visitor_id,whatsapp_reference')
      .eq('is_test', false).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(1000)
    if (error) throw error
    for (const o of (data ?? []) as (ReviewOrder & { id: string })[]) {
      const reason = reviewReason(o)
      if (!reason) continue
      items.push(classifyWork({
        type: 'source_review', id: `${o.id}:source`, code: code(o.id), href: `/admin/orders/${o.id}`,
        what: 'Check where this order came from',
        why: String(reason).replace(/_/g, ' '),
        action: `Open order ${code(o.id)} and record the source from the evidence (never invent a click id)`, deadline: null, source: 'order',
      }, now))
    }
  } catch { failed.push('Source review') }

  // Completed in the last 7 days, from the records themselves.
  try {
    const since = new Date(now - 7 * DAY).toISOString()
    const [sent, delivered] = await Promise.all([
      db.from('orders').select('id, purchase_event_sent_at').gte('purchase_event_sent_at', since).limit(100),
      db.from('orders').select('id, delivered_at').eq('status', 'delivered').gte('delivered_at', since).limit(100),
    ])
    if (sent.error || delivered.error) throw sent.error ?? delivered.error
    for (const o of sent.data ?? []) items.push({ type: 'meta_send', group: 'completed', id: `${o.id}:sent`, code: code(o.id), href: `/admin/orders/${o.id}`, what: 'Purchase sent to Meta', why: 'Recorded on the order.', action: 'Nothing to do', deadline: null, doneAt: o.purchase_event_sent_at, source: 'meta' })
    for (const o of delivered.data ?? []) items.push({ type: 'overdue_delivery', group: 'completed', id: `${o.id}:delivered`, code: code(o.id), href: `/admin/orders/${o.id}`, what: 'Delivered', why: 'Order status is Delivered.', action: 'Nothing to do', deadline: null, doneAt: o.delivered_at, source: 'order' })
  } catch { failed.push('Completed') }

  // Counts that live on their own pages.
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => { const r = await q; return r.error ? null : r.count ?? 0 }
  const [leadsWaiting, failedEmails] = await Promise.all([
    count(db.from('checkout_recovery_leads').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('data_class', 'production_real')).catch(() => null),
    count(db.from('email_log').select('id', { count: 'exact', head: true }).gte('created_at', new Date(now - 7 * DAY).toISOString()).neq('status', 'sent')).catch(() => null),
  ])
  let googleUnverified: number | null = null
  try {
    const { data, error } = await db.from('google_conversion_outbox').select('acquisition, google_import_status').eq('status', 'sheet_synced').limit(500)
    if (!error) googleUnverified = (data ?? []).filter((r: { acquisition: Record<string, string | null> | null; google_import_status: string }) => {
      const a = r.acquisition ?? {}
      return Boolean(a.gclid || a.gbraid || a.wbraid) && r.google_import_status !== 'verified'
    }).length
  } catch { /* stays unknown */ }

  return { items, failed, leadsWaiting, googleUnverified, failedEmails }
}
