import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import type { PaidOfferSource } from './constants'

const issueSchema = z.object({
  token: z.string().uuid(),
  source: z.enum(['google_ads', 'meta_ads', 'meta_catalog']),
  started_at: z.string(),
  expires_at: z.string(),
})

export type IssuedOfferEntitlement = z.infer<typeof issueSchema>

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

