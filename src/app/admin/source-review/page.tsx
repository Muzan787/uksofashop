// src/app/admin/source-review/page.tsx
//
// Admin -> Source review (Run 4, 14 Nov 2026): the real orders whose
// advertising source genuinely needs a person - and only those. See
// utils/sourceReview.ts for the rules and why a blank manual override is not,
// by itself, a reason to review.
//
// Reviewing happens on the order page ("Where it really came from"), which
// records the decision, the note, who made it and when in the order's history
// (orders_history trigger). It changes only the internal source: raw click ids
// and tags stay as recorded, and nothing is sent to Meta or Google.
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { dualTimeText } from '@/utils/adminTime'
import { contactChannelOf } from '@/utils/orderEvidence'
import { REVIEW_HELP, REVIEW_LABEL, automaticSource, reviewReason, type ReviewOrder, type ReviewReason } from '@/utils/sourceReview'
import { PageHeader, Panel, Pill } from '@/components/Admin/ui/AdminUi'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Source review' }

type Row = ReviewOrder & { id: string; created_at: string; total_amount: number | null; channel: string | null; source: string | null; manual_acquisition_at: string | null; manual_acquisition_note: string | null }
const REASONS: ReviewReason[] = ['conflict', 'tag_only', 'no_evidence']

export default async function SourceReviewPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin()
  const { show } = await searchParams
  const includeCancelled = show === 'all'
  const { data, error } = await createUntypedAdminClient().from('orders')
    .select('id,status,is_test,manual_acquisition_source,manual_acquisition_at,manual_acquisition_note,utm_source,gclid,gbraid,wbraid,fbclid,meta_fbc,visitor_id,whatsapp_reference,created_at,total_amount,channel,source')
    .eq('is_test', false).order('created_at', { ascending: false }).limit(5000)
  const rows = (data ?? []) as unknown as Row[]
  const queue = rows.filter(o => reviewReason(o) && (includeCancelled || o.status !== 'cancelled'))
  const reviewed = rows.filter(o => o.manual_acquisition_source).slice(0, 20)
  const automatic = rows.length - rows.filter(o => reviewReason(o)).length - rows.filter(o => o.manual_acquisition_source).length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Source review"
        lead="Orders whose advert source is missing or contradictory. The other orders already carry an ad click, a tagged visit or a WhatsApp reference and need nothing."
      />
      {error && <p role="alert" className="rounded-md border border-ember-500 bg-calico-100 p-4 text-sm">Orders could not be loaded just now. This list may be incomplete.</p>}
      <p className="m-0 text-sm text-ink-700">
        <strong>{queue.length}</strong> to review{includeCancelled ? '' : ' (cancelled orders hidden)'} · {automatic} have their own evidence · {rows.filter(o => o.manual_acquisition_source).length} already reviewed · {rows.length} real orders in all.{' '}
        <Link href={includeCancelled ? '/admin/source-review' : '/admin/source-review?show=all'} className="font-semibold text-indigo-700 underline">{includeCancelled ? 'Hide cancelled' : 'Include cancelled'}</Link>
      </p>

      <Panel title="How to review one">
        <ol className="m-0 list-decimal space-y-1 pl-5 text-sm text-ink-700">
          <li>Open the order and read its <strong>Evidence trail</strong>.</li>
          <li>If you know the answer (the customer told you, or the evidence clearly points one way), set <strong>Where it really came from</strong> and write why in the note.</li>
          <li>Save. Your name, the time and the note go into the order&apos;s history. Click ids are not changed and nothing is sent to Meta or Google.</li>
          <li>If you cannot tell, leave it. &ldquo;Unknown&rdquo; is an honest answer.</li>
        </ol>
      </Panel>

      {REASONS.map(reason => {
        const list = queue.filter(o => reviewReason(o) === reason)
        return (
          <Panel key={reason} title={`${REVIEW_LABEL[reason]} · ${list.length}`}>
            <p className="m-0 mb-3 text-xs text-ink-500">{REVIEW_HELP[reason]}</p>
            {list.length === 0 ? <p className="m-0 text-sm text-ink-500">None.</p> : (
              <ul className="m-0 list-none divide-y divide-calico-300 p-0">
                {list.map(o => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}#evidence-heading`} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5 hover:bg-calico-50">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold">#{o.id.slice(0, 8).toUpperCase()}</span>
                        <Pill tone="quiet">{o.status ?? 'pending_cod'}</Pill>
                        <span className="text-sm text-ink-700">via {contactChannelOf(o)}</span>
                        <span className="text-sm text-ink-500">· {automaticSource(o)}</span>
                      </span>
                      <span className="text-xs text-ink-500">{dualTimeText(o.created_at)} · Review →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )
      })}

      <Panel title="Recently reviewed">
        {reviewed.length === 0 ? <p className="m-0 text-sm text-ink-500">None yet.</p> : (
          <ul className="m-0 list-none divide-y divide-calico-300 p-0 text-sm">
            {reviewed.map(o => (
              <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <Link href={`/admin/orders/${o.id}`} className="font-mono font-bold text-indigo-700 underline">#{o.id.slice(0, 8).toUpperCase()}</Link>
                <span className="min-w-0 flex-1 text-ink-700">{o.manual_acquisition_source}{o.manual_acquisition_note ? ` - ${o.manual_acquisition_note}` : ''}</span>
                <span className="text-xs text-ink-500">{o.manual_acquisition_at ? dualTimeText(o.manual_acquisition_at) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
