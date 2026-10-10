import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import type { PaidOfferSource } from './constants'

const issueSchema = z.object({
  token: z.string().uuid(),
  source: z.enum(['google_ads', 'meta_ads', 'meta_catalog']),
  started_at: z.string(),
  expires_at: z.string(),
  // Present from the 48-hour migration on. A missing value reads as "not
  // revoked", which is what every row issued before it was.
  revoked: z.boolean().optional(),
})

type IssuedOfferEntitlement = z.infer<typeof issueSchema>

export async function issueOfferEntitlement(
  visitorId: string,
  source: PaidOfferSource,
  arrivalId: string | null,
): Promise<IssuedOfferEntitlement> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('issue_paid_offer_entitlement', {
    p_visitor_id: visitorId,
    p_source: source,
    p_arrival_id: arrivalId,
  })

  const issued = issueSchema.safeParse(data)
  if (error || !issued.success) {
    throw error ?? issued.error
  }
  return issued.data
}

/**
 * Whole seconds left on an issued window, or 0 if it has ended.
 *
 * The database never reissues or extends a window once it has ended - a
 * visitor whose 48 hours are up gets their old row back, unchanged - so the
 * routes that call issueOfferEntitlement have to look at the answer rather
 * than assume it is a fresh grant. 0 means: answer "inactive" and do not set
 * the cookie. Otherwise the cookie lives exactly as long as the window.
 */
export function secondsLeft(issued: IssuedOfferEntitlement, now = Date.now()): number {
  if (issued.revoked) return 0
  const ends = Date.parse(issued.expires_at)
  if (!Number.isFinite(ends)) return 0
  return Math.max(0, Math.floor((ends - now) / 1000))
}
