// src/utils/adminTaskData.ts
//
// Loads the facts Home's "Needs doing" queue is built from (utils/adminTasks.ts).
// Each fact fails alone: if one query cannot be answered, that fact is null
// and the queue says so, rather than showing a reassuring zero.
import 'server-only'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { orderAdvertisingConsent } from '@/utils/metaOrderConsent'
import { META_EVENT_MAX_AGE_MS, classifyMetaEvent, type ConsentReason } from '@/utils/metaQueue'
import { META_SIGNAL_COLUMNS, type MetaSignalOrder } from '@/utils/metaSignals'
import type { ConversionAttempt } from '@/utils/metaReply'
import type { TaskInput } from '@/utils/adminTasks'

const DAY = 86400 * 1000
const OPEN_STATUSES = ['pending_cod', 'confirmed', 'on_hold', 'processing', 'shipped']

type SignalRow = MetaSignalOrder & {
  id: string; created_at: string | null; visitor_id: string | null; session_id: string | null; arrival_id: string | null
}

async function metaFacts(): Promise<Pick<TaskInput, 'metaEligible' | 'metaSoonestHours'>> {
  const db = createUntypedAdminClient()
  const now = Date.now()
  const cutoff = new Date(now - META_EVENT_MAX_AGE_MS).toISOString()
  // Only sales still inside Meta's 7-day limit can be eligible, so only they are read.
  const { data, error } = await db.from('orders')
    .select(`id, created_at, visitor_id, session_id, arrival_id, ${META_SIGNAL_COLUMNS}`)
    .eq('is_test', false).neq('status', 'cancelled')
    .or(`and(confirmed_at.gte.${cutoff},purchase_event_sent_at.is.null),and(status.eq.delivered,delivered_at.gte.${cutoff},delivered_event_sent_at.is.null)`)
    .limit(200)
  if (error) return { metaEligible: null, metaSoonestHours: null }
  const rows = (data ?? []) as unknown as SignalRow[]
  let eligible = 0
  let soonest: number | null = null
  for (const row of rows) {
    const consent = await orderAdvertisingConsent(row)
    const attempts: ConversionAttempt[] = []
    for (const kind of ['purchase', 'delivered'] as const) {
      const item = classifyMetaEvent(row, kind, consent.reason as ConsentReason, attempts, now)
      if (item.state !== 'eligible' || !item.sendBy) continue
      eligible += 1
      const hours = (Date.parse(item.sendBy) - now) / 3600000
      soonest = soonest === null ? hours : Math.min(soonest, hours)
    }
  }
  return { metaEligible: eligible, metaSoonestHours: soonest }
}

async function orderFacts(): Promise<Pick<TaskInput, 'waitingToConfirm' | 'oldestWaitingDays' | 'overdueDeliveries'>> {
  const db = createUntypedAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const [waiting, overdue] = await Promise.all([
    db.from('orders').select('created_at').eq('is_test', false).eq('status', 'pending_cod').order('created_at', { ascending: true }).limit(500),
    // The customer's own date has passed and the order is still open.
    db.from('orders').select('id', { count: 'exact', head: true }).eq('is_test', false).in('status', OPEN_STATUSES).lt('preferred_delivery_date', today),
  ])
  const rows = waiting.data ?? []
  const oldest = rows[0]?.created_at ? Math.floor((Date.now() - Date.parse(rows[0].created_at)) / DAY) : null
  return {
    waitingToConfirm: waiting.error ? null : rows.length,
    oldestWaitingDays: waiting.error ? null : oldest,
    overdueDeliveries: overdue.error ? null : overdue.count ?? 0,
  }
}

async function googleFacts(): Promise<Pick<TaskInput, 'googleUnverified'>> {
  const db = createUntypedAdminClient()
  // Only rows carrying a real Google click id are import candidates: the rest
  // are staged for internal use and never expected in Google Ads.
  const { data, error } = await db.from('google_conversion_outbox')
    .select('acquisition, google_import_status').eq('status', 'sheet_synced').limit(500)
  if (error) return { googleUnverified: null }
  const unverified = (data ?? []).filter((r: { acquisition: Record<string, string | null> | null; google_import_status: string }) => {
    const a = r.acquisition ?? {}
    return Boolean(a.gclid || a.gbraid || a.wbraid) && r.google_import_status !== 'verified'
  })
  return { googleUnverified: unverified.length }
}

async function emailFacts(): Promise<Pick<TaskInput, 'failedEmails'>> {
  const db = createUntypedAdminClient()
  const since = new Date(Date.now() - 7 * DAY).toISOString()
  const { count, error } = await db.from('email_log').select('id', { count: 'exact', head: true }).gte('created_at', since).neq('status', 'sent')
  return { failedEmails: error ? null : count ?? 0 }
}

/** All the facts for Home's queue. Never throws: a failed fact is null. */
export async function loadTaskInput(leadsWaiting: number | null): Promise<TaskInput> {
  await requireAdmin()
  const safe = async <T,>(run: () => Promise<T>, fallback: T): Promise<T> => { try { return await run() } catch { return fallback } }
  const [meta, orders, google, email] = await Promise.all([
    safe(metaFacts, { metaEligible: null, metaSoonestHours: null } as Awaited<ReturnType<typeof metaFacts>>),
    safe(orderFacts, { waitingToConfirm: null, oldestWaitingDays: null, overdueDeliveries: null } as Awaited<ReturnType<typeof orderFacts>>),
    safe(googleFacts, { googleUnverified: null }),
    safe(emailFacts, { failedEmails: null }),
  ])
  return { ...meta, ...orders, ...google, ...email, leadsWaiting }
}
