import type { OfferSource } from '@/utils/offers/constants'

/** Safe storefront state. The opaque bearer token never crosses this boundary. */
export interface PublicOfferEntitlement {
  active: boolean
  source: OfferSource | null
  startedAt: string | null
  expiresAt: string | null
  offerAvailable: boolean
  /**
   * Set only when this visitor's one-time window has ENDED (Run 8): when it
   * ended, so the product page can say so honestly instead of silently
   * showing nothing. It never reopens the window.
   */
  endedAt?: string | null
}

export const INACTIVE_OFFER_ENTITLEMENT: PublicOfferEntitlement = {
  active: false,
  source: null,
  startedAt: null,
  expiresAt: null,
  offerAvailable: false,
}
