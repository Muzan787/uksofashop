import type { PaidOfferSource } from '@/utils/offers/constants'

/** Safe storefront state. The opaque bearer token never crosses this boundary. */
export interface PublicOfferEntitlement {
  active: boolean
  source: PaidOfferSource | null
  startedAt: string | null
  expiresAt: string | null
  offerAvailable: boolean
}

export const INACTIVE_OFFER_ENTITLEMENT: PublicOfferEntitlement = {
  active: false,
  source: null,
  startedAt: null,
  expiresAt: null,
  offerAvailable: false,
}
