// src/utils/metaQueue.ts
//
// Why each order's Purchase / OrderDelivered is, or is not, ready to send to
// Meta - in the same words staff use, and by the same rules the sender applies
// (utils/orderConversions.ts). Pure: the caller supplies the consent result
// from utils/metaOrderConsent.ts and the order's recorded attempts, so the
// queue can never show "Eligible" for an event the sender would then skip.
//
// Purchase belongs to confirmation (confirmed_at); OrderDelivered to the real
// delivery time (delivered_at). Meta refuses events more than 7 days after
// they happened, and an expired event is never re-dated.

import { holdState, isGoogleOnlyAcquisition, isQa, type MetaSignalOrder } from './metaSignals'
import type { ConversionAttempt } from './metaReply'

export type QueueState =
  | 'eligible'
  | 'accepted'
  | 'sent_unconfirmed'
  | 'awaiting_evidence'
  | 'consent_unavailable'
  | 'too_old'
  | 'held'
  | 'google_origin'
  | 'not_ready'
  | 'blocked'

export type ConsentReason =
  | 'recorded_grant'
  | 'missing_identity'
  | 'missing_choice'
  | 'denied_or_withdrawn'
  | 'unavailable'

export interface QueueItem {
  state: QueueState
  label: string
  note: string
  /** For eligible items: the last moment Meta will still accept the event. */
  sendBy: string | null
}

export const META_EVENT_MAX_AGE_MS = 7 * 86400 * 1000

export const QUEUE_LABEL: Record<QueueState, string> = {
  // Run 4 (14 Nov 2026): named by what staff can do, not by the system state.
  eligible: 'Ready to send',
  accepted: 'Sent & accepted',
  sent_unconfirmed: 'Sent, reply unclear',
  awaiting_evidence: 'Needs a visit match',
  consent_unavailable: 'Cannot send: no ad consent',
  too_old: 'Cannot send: too old',
  held: 'Held',
  google_origin: 'Cannot send: Google order',
  not_ready: 'Not ready yet',
  blocked: 'Blocked',
}

/** The states staff can filter the queue by, in the order they are shown. */
export const QUEUE_FILTERS: QueueState[] = [
  'eligible', 'accepted', 'awaiting_evidence', 'consent_unavailable', 'too_old', 'held', 'google_origin',
]

function latestAttempt(attempts: ConversionAttempt[]): ConversionAttempt | null {
  if (!attempts.length) return null
  return [...attempts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

/**
 * Classify one event for one order.
 *
 * `consent` is required only when the event is unsent and otherwise
 * sendable; pass null when it was not looked up.
 */
export function classifyMetaEvent(
  order: MetaSignalOrder,
  kind: 'purchase' | 'delivered',
  consent: ConsentReason | null,
  attempts: ConversionAttempt[],
  now: number = Date.now(),
): QueueItem {
  const item = (state: QueueState, note: string, sendBy: string | null = null): QueueItem =>
    ({ state, label: QUEUE_LABEL[state], note, sendBy })
  const sentAt = kind === 'purchase' ? order.purchase_event_sent_at : order.delivered_event_sent_at

  if (sentAt) {
    const outcome = latestAttempt(attempts)?.response_metadata?.outcome
    return outcome === 'accepted'
      ? item('accepted', 'Meta accepted it.')
      : item('sent_unconfirmed', outcome === 'rejected' ? 'Meta refused it - see the reply.' : 'Sent before Meta’s replies were recorded, or the reply was unclear.')
  }
  if (isGoogleOnlyAcquisition(order)) return item('google_origin', 'Google ad origin: reported to Google, never sent to Meta.')
  const hold = holdState(order)
  if (hold) return item('held', hold === 'hold' ? 'On hold until released.' : 'Marked Don’t send.')
  if (isQa(order)) return item('blocked', 'QA / test order.')
  if (order.status === 'cancelled') return item('blocked', 'Cancelled order.')

  const eventAt = kind === 'purchase' ? order.confirmed_at : order.delivered_at
  const ready = kind === 'purchase'
    ? Boolean(order.confirmed_at)
    : order.status === 'delivered' && Boolean(order.delivered_at)
  if (!ready || !eventAt) {
    return item('not_ready', kind === 'purchase' ? 'Confirm the order first.' : 'Mark the order Delivered first.')
  }

  const expiresAt = Date.parse(eventAt) + META_EVENT_MAX_AGE_MS
  if (!Number.isFinite(expiresAt) || now > expiresAt) {
    return item('too_old', 'More than 7 days after the sale - Meta refuses it. Kept for internal attribution only.')
  }

  if (consent === 'missing_identity') {
    return item('awaiting_evidence', 'No website visit is linked yet. Match the visit in Orders if the customer came from an ad.')
  }
  if (consent === 'missing_choice' || consent === 'unavailable') {
    return item('consent_unavailable', consent === 'unavailable'
      ? 'Ad consent could not be checked just now - try again.'
      : 'The customer never answered the cookie banner.')
  }
  if (consent === 'denied_or_withdrawn') {
    return item('consent_unavailable', 'The customer declined or withdrew ad cookies. Not sent; internal attribution only.')
  }
  if (consent === 'recorded_grant') {
    return item('eligible', 'Consent recorded and within Meta’s 7-day limit.', new Date(expiresAt).toISOString())
  }
  // Consent not looked up: treat as not yet known rather than eligible.
  return item('consent_unavailable', 'Ad consent has not been checked.')
}
