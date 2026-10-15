// src/utils/metaReply.ts
//
// Meta's reply to an order's Purchase or OrderDelivered (admin upgrade N4),
// from the conversion_events rows written at each send, as one sentence.

export interface ConversionAttempt {
  order_id: string | null
  event_name: string
  status: string
  created_at: string
  response_metadata: {
    outcome?: string
    reason?: string
    http_status?: number
    error_code?: number
    events_received?: number
  } | null
}

export interface MetaReply {
  attempts: number
  text: string
  tone: 'ok' | 'bad' | 'unclear' | 'none'
}

const SKIP_REASON: Record<string, string> = {
  not_configured: 'the Conversions API isn’t set up on the server',
  not_production: 'it wasn’t the live server',
  invalid_event_time: 'the sale’s time was missing',
  invalid_or_aged_event_time: 'it was more than 7 days after the sale, which Meta refuses',
  missing_identity: 'there was no visit to check ad consent against',
  missing_choice: 'the customer never answered the cookie banner',
  denied_or_withdrawn: 'the customer declined ad cookies',
  unavailable: 'ad consent couldn’t be checked',
}

/** The latest attempt in words, and how many attempts there were. */
export function metaReply(attempts: ConversionAttempt[]): MetaReply | null {
  if (attempts.length === 0) return null
  const latest = [...attempts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const m = latest.response_metadata ?? {}
  const n = attempts.length
  if (m.outcome === 'accepted') return { attempts: n, text: 'Meta accepted it.', tone: 'ok' }
  if (m.outcome === 'rejected') {
    const detail = [m.http_status && `HTTP ${m.http_status}`, m.error_code && `code ${m.error_code}`].filter(Boolean).join(', ')
    return { attempts: n, text: `Meta refused it${detail ? ` (${detail})` : ''}.`, tone: 'bad' }
  }
  if (m.outcome === 'ambiguous') return { attempts: n, text: 'Sent, but Meta’s answer was unclear.', tone: 'unclear' }
  if (latest.status === 'skipped' || m.outcome === 'skipped') {
    return { attempts: n, text: `Not sent: ${SKIP_REASON[m.reason ?? ''] ?? 'it was skipped'}.`, tone: 'none' }
  }
  return { attempts: n, text: 'Sent before Meta’s replies were recorded.', tone: 'unclear' }
}
