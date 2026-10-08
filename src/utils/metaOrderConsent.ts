import 'server-only'
import { createUntypedAdminClient } from '@/utils/supabase/admin'

type OrderIdentity = {
  visitor_id: string | null
  session_id: string | null
  arrival_id: string | null
  created_at: string | null
}

type AdvertisingChoice = {
  captured_at: string
  ad_storage: string
  ad_user_data: string
  ad_personalization: string
  policy_version: string
  surface: string
}

const permitsAdvertising = (r: AdvertisingChoice) =>
  r.ad_storage === 'granted' && r.ad_user_data === 'granted' && r.ad_personalization === 'granted'

/**
 * The existing banner's Accept all / Essential only choice covers advertising
 * and analytics. Its receipts happen to live in Google-named tables. Meta does
 * not inherit Google's launch cutoff, analytics requirement or attachment RPC.
 * Resolve the actual recorded choice against the original order identity, so
 * a missing Google order-receipt association cannot discard a genuine grant.
 * No customer identity, source, enquiry or historical receipt is rewritten.
 */
export async function orderAdvertisingConsent(order: OrderIdentity): Promise<{
  allowed: boolean
  reason: 'recorded_grant' | 'missing_identity' | 'missing_choice' | 'denied_or_withdrawn' | 'unavailable'
}> {
  if (!order.created_at || !order.visitor_id || !order.session_id || !order.arrival_id) {
    return { allowed: false, reason: 'missing_identity' }
  }
  try {
    const db = createUntypedAdminClient()
    const columns = 'captured_at,ad_storage,ad_user_data,ad_personalization,policy_version,surface'
    const { data: original, error } = await db.from('google_consent_receipts')
      .select(columns).eq('visitor_id', order.visitor_id)
      .eq('session_id', order.session_id).eq('arrival_id', order.arrival_id)
      .lte('captured_at', order.created_at).order('captured_at', { ascending: false }).limit(2)
    if (error) return { allowed: false, reason: 'unavailable' }
    const choices = (original ?? []) as AdvertisingChoice[]
    const choice = choices[0]
    if (!choice || choice.policy_version !== 'ukss-google-2026-09-27-v1' || choice.surface !== 'cookie_banner') {
      return { allowed: false, reason: 'missing_choice' }
    }
    // Conflicting simultaneous choices must not arbitrarily favour a grant.
    if (!permitsAdvertising(choice) || choices.some(r => r.captured_at === choice.captured_at && !permitsAdvertising(r))) {
      return { allowed: false, reason: 'denied_or_withdrawn' }
    }
    // Withdrawal belongs to the visitor, including a subsequent visit/session.
    // A later grant does not erase an intervening withdrawal for this old order.
    const { data: later, error: laterError } = await db.from('google_consent_receipts')
      .select('ad_storage,ad_user_data,ad_personalization')
      .eq('visitor_id', order.visitor_id).gt('captured_at', choice.captured_at)
      .or('ad_storage.neq.granted,ad_user_data.neq.granted,ad_personalization.neq.granted').limit(1)
    if (laterError) return { allowed: false, reason: 'unavailable' }
    return later?.length
      ? { allowed: false, reason: 'denied_or_withdrawn' }
      : { allowed: true, reason: 'recorded_grant' }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}
