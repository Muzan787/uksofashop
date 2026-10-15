// src/utils/adLinks.ts
//
// Admin -> Ad links (admin upgrade O1-O5), the parts that are rules rather
// than layout: the URL parameters to paste into every ad, the profile links,
// the test ad link's marker, and why an item is left out of the Meta
// catalogue feed. The feed itself is utils/catalog/productFeed.ts; the rules
// here mirror the ones it applies and a test keeps them in step.

import { TEST_LINK_PARAM } from './trackingEnv'

export const SITE = 'https://www.uksofashop.co.uk'

/** The Meta catalogue feed's address. */
export const META_FEED_URL = `${SITE}/feeds/meta-catalog.xml`

/**
 * Meta's URL parameters for every ad (O2). Meta fills the {{...}} in itself.
 * {{site_source_name}} arrives as fb, ig, msg or an, which the site reads as
 * Meta (utils/offers/paidTraffic.ts) - the October 2026 ads already use it.
 * The campaign, ad set and ad names land in utm_campaign, utm_term and
 * utm_content, which the weekly digest groups sales by.
 */
export const AD_URL_PARAMETERS =
  'utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}'

/**
 * Links for the Instagram bio, the Facebook page and the WhatsApp Business
 * profile (O4). Not ads, so medium "social": they never carry the ad offer or
 * count as an ad visit.
 */
export const PROFILE_LINKS: { key: string; label: string; where: string; url: string }[] = [
  { key: 'instagram', label: 'Instagram', where: 'Instagram → Edit profile → Links', url: `${SITE}/?utm_source=instagram&utm_medium=social&utm_campaign=profile` },
  { key: 'facebook', label: 'Facebook', where: 'Facebook page → Edit details → Website', url: `${SITE}/?utm_source=facebook&utm_medium=social&utm_campaign=profile` },
  { key: 'whatsapp', label: 'WhatsApp', where: 'WhatsApp Business → Settings → Business tools → Profile → Website', url: `${SITE}/?utm_source=whatsapp&utm_medium=social&utm_campaign=profile` },
]

/**
 * What the test ad link adds to an offer-entry link (O5): it arrives as a
 * Meta ad visit (and gets the ad offer, exactly like one), in the offer-test
 * campaign that is never reported, with the marker that keeps the whole
 * visit out of every count.
 */
export const TEST_LINK_QUERY =
  `utm_source=meta&utm_medium=paid_social&utm_campaign=offer-test&utm_content=test-link&${TEST_LINK_PARAM}=1`

// ── O1: what the Meta feed leaves out ───────────────────────────────────────

export interface FeedProduct {
  id: string
  title: string
  is_active: boolean
  gallery_images: string[] | null
  product_variants: { id: string; color: string | null; is_active: boolean; image_url: string | null }[] | null
}

export interface LeftOut {
  title: string
  reason: string
}

/**
 * Every product or colourway not in the Meta feed, and why - the same rules
 * buildProductFeed('meta') applies: shown products only, shown colourways
 * only, a colourway needs a photo (its own or the product's first), and a
 * product needs at least one shown colourway.
 */
export function feedLeftOut(products: FeedProduct[]): { items: number; leftOut: LeftOut[] } {
  const leftOut: LeftOut[] = []
  let items = 0
  for (const p of products) {
    if (!p.is_active) {
      leftOut.push({ title: p.title, reason: 'Hidden in the shop' })
      continue
    }
    const shown = (p.product_variants ?? []).filter(v => v.is_active)
    const hidden = (p.product_variants ?? []).length - shown.length
    if (shown.length === 0) {
      leftOut.push({ title: p.title, reason: hidden > 0 ? 'Every colourway is hidden' : 'No colourways' })
      continue
    }
    for (const v of shown) {
      if ((v.image_url || p.gallery_images?.[0] || '').trim()) items += 1
      else leftOut.push({ title: `${p.title}${v.color ? ` - ${v.color}` : ''}`, reason: 'No photo' })
    }
    if (hidden > 0) leftOut.push({ title: p.title, reason: hidden === 1 ? '1 colourway hidden' : `${hidden} colourways hidden` })
  }
  return { items, leftOut }
}
