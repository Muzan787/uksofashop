import 'server-only'
import { createUntypedAdminClient } from '@/utils/supabase/admin'

/**
 * The shop's single cookie choice governs analytics and advertising together.
 * Reuse its production receipt/withdrawal validator; never infer consent from
 * the presence of a customer email, a click id, or a manual source label.
 */
export async function hasOrderMarketingConsent(orderId: string): Promise<boolean> {
  try {
    // Phase 2B tables/RPCs are not in the checked-in generated Database type yet.
    const admin = createUntypedAdminClient()
    const { data: attached, error } = await admin.from('google_order_consent')
      .select('receipt_id').eq('order_id', orderId).maybeSingle()
    if (error || !attached?.receipt_id) return false
    const { data: valid, error: validationError } = await admin.rpc('google_phase2b_consent_valid', {
      p_receipt_id: attached.receipt_id, p_analytics: true,
    })
    return !validationError && valid === true
  } catch {
    return false
  }
}
