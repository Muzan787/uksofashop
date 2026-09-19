export const OFFER_ENTITLEMENT_COOKIE = 'uksofashop_offer'
export const OFFER_ENTITLEMENT_MAX_AGE_S = 7 * 24 * 60 * 60
export const OFFER_PUBLIC_CODE = 'SOFAEXTRA'

export type PaidOfferSource = 'google_ads' | 'meta_ads' | 'meta_catalog'

/**
 * What each tier is worth, in pounds, FOR DISPLAY ONLY.
 *
 * The database function calculate_order_offer is the authority and prices
 * every order itself; these numbers exist so the product page can say
 * "£30 off this sofa" rather than "extra savings on selected sofas". If the
 * two ever disagree the strip shows the wrong figure and the checkout charges
 * the right one - so keep them in step with the migration that sets them.
 */
export const OFFER_TIER_AMOUNTS: Record<'ELECTRIC' | 'ROMA' | 'STANDARD' | 'EXCLUDED', number> = {
  ELECTRIC: 50,
  ROMA: 30,
  STANDARD: 20,
  EXCLUDED: 0,
}

/**
 * Dispatched on window to open the offer sheet (components/Offer/OfferPrompt).
 * The sheet no longer opens itself on arrival - see the note there - so this
 * is how the product page's strip, or anything else, asks for it.
 */
export const OFFER_OPEN_EVENT = 'uksofashop:offer-open'
