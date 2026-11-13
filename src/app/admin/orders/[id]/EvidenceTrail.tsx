// src/app/admin/orders/[id]/EvidenceTrail.tsx
//
// "Evidence trail" on the order page: where the order came from, how sure we
// are, and exactly why each ad platform has or has not been told about it.
// Reads records only; it writes nothing and rewrites no raw source data.
//
// The rules live in utils/orderEvidence.ts (tested) and utils/metaQueue.ts
// (the same classifier Admin -> Meta uses), so the card can never say "ready"
// for something the sender would refuse.
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { orderAdvertisingConsent } from '@/utils/metaOrderConsent'
import { classifyMetaEvent, type ConsentReason } from '@/utils/metaQueue'
import type { ConversionAttempt } from '@/utils/metaReply'
import {
  INTERNAL_LOOKBACK_MS, buildEvidence, formatLag,
  type EvidenceEnquiry, type EvidenceOrder, type EvidenceSession,
} from '@/utils/orderEvidence'
import { dualTimeText } from '@/utils/adminTime'
import type { OrderWithLines } from '../orderData'

const TONE: Record<string, string> = {
  high: 'bg-sage-50 text-sage-700 border-sage-300',
  medium: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  low: 'bg-calico-100 text-ember-700 border-ember-500',
  none: 'bg-calico-100 text-ink-500 border-calico-300',
}
const STATE_TONE: Record<string, string> = {
  eligible: 'bg-sage-50 text-sage-700 border-sage-300',
  accepted: 'bg-sage-50 text-sage-700 border-sage-300',
  too_old: 'bg-calico-100 text-ink-500 border-calico-300',
  held: 'bg-calico-100 text-ember-700 border-ember-500',
  google_origin: 'bg-indigo-50 text-indigo-700 border-indigo-300',
}
const pill = 'inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider'
const PLATFORM: Record<string, string> = {
  meta: 'Meta', google: 'Google', both_clicks: 'Meta + Google', other_tagged: 'Other', unattributed: 'None',
}

export default async function EvidenceTrail({ order }: { order: OrderWithLines }) {
  await requireAdmin()
  const db = createUntypedAdminClient()
  const o = order as unknown as EvidenceOrder & Record<string, string | boolean | null>
  const since = o.created_at ? new Date(Date.parse(o.created_at) - INTERNAL_LOOKBACK_MS).toISOString() : null

  const [enqByRef, enqByOrder, sessionsRes, attemptsRes, outboxRes, holdRes, consent] = await Promise.all([
    o.whatsapp_reference
      ? db.from('whatsapp_enquiries').select('reference,created_at,visitor_id,fbclid,gclid,gbraid,wbraid,utm_source,utm_campaign,product_name').eq('reference', o.whatsapp_reference).limit(1)
      : Promise.resolve({ data: [] as EvidenceEnquiry[], error: null }),
    db.from('whatsapp_enquiries').select('reference,created_at,visitor_id,fbclid,gclid,gbraid,wbraid,utm_source,utm_campaign,product_name').eq('converted_order_id', o.id).limit(1),
    o.visitor_id && since
      ? db.from('attribution_sessions').select('created_at,visitor_id,first_touch_source,first_touch_campaign,last_touch_source,last_touch_campaign,gclid,gbraid,wbraid,fbclid')
          .eq('visitor_id', o.visitor_id).gte('created_at', since).lte('created_at', o.created_at as string)
          .order('created_at', { ascending: true }).limit(200)
      : Promise.resolve({ data: [] as EvidenceSession[], error: null }),
    db.from('conversion_events').select('order_id,event_name,status,created_at,response_metadata').eq('order_id', o.id).eq('platform', 'meta'),
    db.from('google_conversion_outbox').select('stage,status,conversion_time,sheet_synced_at,google_import_status').eq('order_id', o.id).order('conversion_time', { ascending: true }),
    db.from('meta_signal_holds').select('state').eq('order_id', o.id).limit(1),
    orderAdvertisingConsent({
      visitor_id: (o.visitor_id as string | null) ?? null, session_id: (o.session_id as string | null) ?? null,
      arrival_id: (o.arrival_id as string | null) ?? null, created_at: (o.created_at as string | null) ?? null,
    }),
  ])

  const enquiry = ((enqByRef.data ?? [])[0] ?? (enqByOrder.data ?? [])[0] ?? null) as EvidenceEnquiry | null
  const sessions = (sessionsRes.data ?? []) as EvidenceSession[]
  const evidence = buildEvidence(o, enquiry, sessions)
  const attempts = (attemptsRes.data ?? []) as ConversionAttempt[]
  const hold = (holdRes.data ?? [])[0] as { state: string } | undefined
  const queueOrder = { ...(order as unknown as Parameters<typeof classifyMetaEvent>[0]), meta_signal_holds: hold ? { state: hold.state } : null }
  const purchase = classifyMetaEvent(queueOrder, 'purchase', consent.reason as ConsentReason,
    attempts.filter(a => a.event_name === 'Purchase'))
  const delivered = classifyMetaEvent(queueOrder, 'delivered', consent.reason as ConsentReason,
    attempts.filter(a => a.event_name === 'OrderDelivered'))
  const outbox = (outboxRes.data ?? []) as { stage: string; status: string; conversion_time: string; sheet_synced_at: string | null; google_import_status: string }[]
  const loadFailed = [enqByRef, enqByOrder, sessionsRes, attemptsRes, outboxRes, holdRes].some(r => r.error)
  const channelLabel = { whatsapp: 'WhatsApp', phone: 'Phone', website: 'Website' }[evidence.contactChannel]

  return (
    <section className="rounded-md border border-calico-300 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="evidence-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="evidence-heading" className="m-0 text-xs font-bold uppercase tracking-wider text-ink-500">Evidence trail</h2>
        <span className={`${pill} ${TONE[evidence.confidence]}`}>{evidence.confidence === 'none' ? 'No confidence' : `${evidence.confidence} confidence`}</span>
      </div>
      <p className="m-0 mt-2 text-base font-bold text-ink-900">{evidence.headline}</p>
      <p className="m-0 mt-1 text-xs text-ink-500">
        Contact channel is how they got in touch ({channelLabel}). Acquisition source is which advert, if any, brought them: {PLATFORM[evidence.platform]},{' '}
        {{ staff_override: 'set by staff', click_id: 'from a recorded ad click', campaign_tag_only: 'from a campaign tag only', none: 'nothing recorded' }[evidence.basis]}.
      </p>

      {loadFailed && (
        <p role="alert" className="mt-3 rounded-sm border border-ember-500 bg-calico-100 p-3 text-sm text-ink-900">
          Some evidence could not be loaded just now. Missing rows below are not proof that nothing happened.
        </p>
      )}

      {evidence.whatsapp && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-ink-500">WhatsApp tap</dt>
          <dd className="m-0 text-ink-900">{dualTimeText(evidence.whatsapp.tappedAt)} · ref <span className="font-mono font-semibold">{evidence.whatsapp.reference}</span></dd>
          <dt className="text-ink-500">Order followed</dt>
          <dd className="m-0 text-ink-900">
            {evidence.whatsapp.lagMinutes >= 0 ? `${formatLag(evidence.whatsapp.lagMinutes)} later` : 'before the tap (check)'}
            {' · '}{evidence.whatsapp.withinLinkWindow ? 'inside the 30-minute link window' : 'outside the 30-minute link window'}
          </dd>
          {evidence.whatsapp.product && <><dt className="text-ink-500">Asked about</dt><dd className="m-0 text-ink-900">{evidence.whatsapp.product}</dd></>}
          {evidence.whatsapp.sameVisitor !== null && (
            <><dt className="text-ink-500">Same visitor</dt><dd className="m-0 text-ink-900">{evidence.whatsapp.sameVisitor ? 'Yes, the tap and the order share a visitor id' : 'No, different visitor ids'}</dd></>
          )}
        </dl>
      )}

      <div className="mt-4">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-ink-500">Advertising touches (this visitor only, 30-day internal lookback)</h3>
        {evidence.touches.length === 0 ? (
          <p className="m-0 mt-1 text-sm text-ink-500">None recorded.</p>
        ) : (
          <ol className="m-0 mt-2 list-none space-y-1.5 p-0">
            {evidence.touches.map((t, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-900">
                <span className={`${pill} border-calico-300 bg-calico-100 text-ink-700`}>{t.role === 'only' ? 'Only touch' : `${t.role} touch`}</span>
                <span className="font-semibold">{PLATFORM[t.platform]}</span>
                <span className="text-ink-500">{t.proof}{t.campaign ? ` · ${t.campaign}` : ''} · {dualTimeText(t.at)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm border border-calico-300 bg-calico-50 p-3">
          <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-ink-500">Meta</h3>
          <p className="m-0 mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-900">
            <span className="text-ink-500">Purchase</span>
            <span className={`${pill} ${STATE_TONE[purchase.state] ?? TONE.none}`}>{purchase.label}</span>
          </p>
          <p className="m-0 mt-1 text-xs text-ink-500">{purchase.note}</p>
          <p className="m-0 mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-900">
            <span className="text-ink-500">Delivered</span>
            <span className={`${pill} ${STATE_TONE[delivered.state] ?? TONE.none}`}>{delivered.label}</span>
          </p>
          <p className="m-0 mt-1 text-xs text-ink-500">{delivered.note}</p>
        </div>
        <div className="rounded-sm border border-calico-300 bg-calico-50 p-3">
          <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-ink-500">Google</h3>
          {outbox.length === 0 ? (
            <p className="m-0 mt-2 text-sm text-ink-500">No Google import rows for this order.</p>
          ) : (
            <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm text-ink-900">
              {outbox.map(r => (
                <li key={r.stage}>
                  <span className="font-semibold capitalize">{r.stage}</span>: {r.status.replaceAll('_', ' ')}
                  <span className="block text-xs text-ink-500">
                    {r.sheet_synced_at ? `In import Sheet ${dualTimeText(r.sheet_synced_at)}` : 'Not in the import Sheet'} · Google Ads: {r.google_import_status.replaceAll('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 mt-2 text-xs text-ink-500">
            Rows without a Google click id are only staged for internal use. “In Sheet” never means Google Ads accepted it.
          </p>
        </div>
      </div>

      {evidence.gaps.length > 0 && (
        <div className="mt-4">
          <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-ember-700">Known gaps</h3>
          <ul className="m-0 mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
            {evidence.gaps.map(g => <li key={g}>{g}</li>)}
          </ul>
        </div>
      )}
      <p className="m-0 mt-4 border-t border-calico-300 pt-3 text-xs text-ink-500">
        Raw click ids and UTM tags are never overwritten. To correct the source, use “Where it really came from” above. Internal attribution does not depend on ad consent;
        only sending to Meta or Google does.
      </p>
    </section>
  )
}
