// src/utils/schema.ts
//
// Structured data builders. Kept in one place so the shipping and returns
// details in a Product Offer can't drift from what the site actually promises -
// Google cross-checks this markup against Merchant Centre, and a mismatch gets
// items disapproved rather than ignored.
//
// Sources of truth these mirror:
//   delivery  -> src/constants/delivery.ts and /delivery-returns
//   returns   -> 14 days statutory, customer pays return carriage
//   made-to-order -> exempt from the 14-day right (Consumer Contracts Regs)

// Imported and re-exported so existing `import { SITE_URL } from
// '@/utils/schema'` call sites keep working, while the definition lives in one
// place. A bare `export { X } from` would not give this file a local binding,
// and everything below uses SITE_URL directly.
import { SITE_URL } from '@/constants/site'
export { SITE_URL }

import {
  PHONE_E164,
  SUPPORT_EMAIL,
  ADDRESS,
  OPENING_HOURS,
  SOCIAL_SAME_AS,
} from '@/constants/contact'

export const ORGANISATION_NAME = 'UK Sofa Shop'

/** The one PostalAddress, shared by the Organization and the FurnitureStore. */
function postalAddress() {
  return {
    '@type': 'PostalAddress',
    streetAddress: ADDRESS.street,
    addressLocality: ADDRESS.locality,
    postalCode: ADDRESS.postcode,
    addressCountry: ADDRESS.country,
  }
}

/** Serialise for dangerouslySetInnerHTML without letting a "<" break out. */
export function jsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

function abs(path: string): string {
  return path.startsWith('http') ? path : `${SITE_URL}${path}`
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

export interface Crumb { name: string; path: string }

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  }
}

// ─── Organisation and site search ────────────────────────────────────────────

/**
 * The trader, as opposed to localBusinessSchema() which describes the shop at
 * the Blackburn address.
 *
 * logo and sameAs were both missing, and they are the two properties this node
 * exists to carry. The FurnitureStore node had them all along, but that is not
 * the node Google reads for a knowledge panel or a logo rich result, and it is
 * not the one an answer engine resolves "UK Sofa Shop" against - both of those
 * follow @id to #organization, which is also what every Article, WebPage and
 * Offer on the site points its publisher, author and seller at.
 *
 * So the site had one well-described entity that nothing referenced, and one
 * heavily referenced entity with no logo and no verified profiles attached.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: ORGANISATION_NAME,
    url: SITE_URL,
    // Google wants at least 112x112 for the logo rich result; this is 512.
    logo: `${SITE_URL}/icon-512x512.png`,
    image: `${SITE_URL}/og-image.jpg`,
    telephone: PHONE_E164,
    address: postalAddress(),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE_E164,
      email: SUPPORT_EMAIL,
      contactType: 'customer service',
      areaServed: 'GB',
      availableLanguage: 'English',
    },
    // Only real, verified profiles. SOCIAL_SAME_AS already filters out the
    // TikTok placeholder, so this is empty rather than wrong when there is
    // nothing to point at - attaching an unverified handle to the business
    // entity is worse than attaching none.
    ...(SOCIAL_SAME_AS.length ? { sameAs: SOCIAL_SAME_AS } : {}),
  }
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: ORGANISATION_NAME,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// ─── Product ─────────────────────────────────────────────────────────────────

/**
 * Free to UK Mainland, ground floor, 2-4 working days. The paid extras
 * (upstairs, assembly, old sofa removal) are deliberately not modelled here:
 * they're optional services chosen at checkout, not a shipping rate, and
 * putting them in shippingRate would misstate the delivery price.
 */
function shippingDetails() {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'GBP' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4, unitCode: 'DAY' },
    },
  }
}

/**
 * 14 days from delivery, customer arranges and pays return carriage.
 *
 * Made-to-order items are exempt from that right under the Consumer Contracts
 * Regulations because they're built to the customer's own specification, so
 * they're marked as not permitted rather than claiming a window we don't offer.
 * Faulty goods are a separate matter and aren't covered by this property.
 *
 * returnShippingFeesAmount is omitted on purpose: the customer arranges their
 * own carriage, so there is no fixed figure to state.
 */
function returnPolicy(customMade: boolean) {
  if (customMade) {
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'GB',
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    }
  }
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'GB',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnShippingFees',
  }
}

export interface ProductSchemaInput {
  productId?: string
  title: string
  description?: string | null
  canonicalPath: string
  images: string[]
  /** Per-variant final prices. One entry means a single Offer. */
  prices: number[]
  skus: string[]
  origin?: string | null
  customMade?: boolean | null
  /**
   * Centimetres, already parsed. The catalogue stores dimensions as free
   * text in specifications.dimensions ("L:198cm H:97cm D:99cm"), so the
   * parsing lives in components/Product/dimensions.ts where the diagram
   * already needed it, and this takes the numbers it produced. Any of the
   * three may be absent: a measurement the record does not give is left out
   * rather than guessed at.
   */
  width?: number
  depth?: number
  height?: number
  /** Distinct fabric names across the variants, e.g. ["Chenille", "Plush Velvet"]. */
  materials?: string[]
  /** Distinct colour names across the variants. */
  colors?: string[]
  reviews: { rating: number; comment?: string | null; customer_name?: string | null; created_at?: string | null }[]
}

export function productSchema(p: ProductSchemaInput) {
  const prices = p.prices.length ? p.prices : [0]
  const low = Math.min(...prices)
  const high = Math.max(...prices)

  // Google reports an Offer without this as a non-critical issue on every
  // product in the report. Nothing here is a timed promotion - the price is
  // what it is until we change it - so a rolling year is the honest answer to
  // "when does this stop being true". It is computed per request rather than
  // at build time, and the product page is dynamic, so it never goes stale.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const offerBase = {
    priceCurrency: 'GBP',
    priceValidUntil,
    // The page 404s for an inactive product and everything is made to order,
    // so anything reachable here is available. Stock counts aren't tracked.
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    url: abs(p.canonicalPath),
    seller: { '@id': `${SITE_URL}/#organization` },
    // Cash or bank transfer on delivery only.
    acceptedPaymentMethod: [
      { '@type': 'PaymentMethod', name: 'Cash on Delivery' },
      { '@type': 'PaymentMethod', name: 'Bank Transfer on Delivery' },
    ],
    shippingDetails: shippingDetails(),
    hasMerchantReturnPolicy: returnPolicy(!!p.customMade),
  }

  const offers =
    low === high
      ? { '@type': 'Offer', price: low, ...offerBase }
      : {
          '@type': 'AggregateOffer',
          lowPrice: low,
          highPrice: high,
          offerCount: prices.length,
          ...offerBase,
        }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    url: abs(p.canonicalPath),
    brand: { '@type': 'Brand', name: ORGANISATION_NAME },
    offers,
  }

  if (p.description) schema.description = p.description
  if (p.images.length) schema.image = p.images.map(abs)
  // A SKU identifies one purchasable item. With several variants sharing this
  // page, claiming one of their SKUs for the whole product would be wrong, so
  // only set it when there is exactly one.
  if (p.skus.length === 1) {
    schema.sku = p.skus[0]
    schema.mpn = p.skus[0]
  }
  if (p.productId) schema.productID = p.productId
  if (p.origin === 'uk') schema.countryOfOrigin = 'GB'

  // Physical size, as three properties rather than a sentence in the
  // description. This is the whole reason the parser exists: "will it fit"
  // is the question this catalogue gets asked most, and a doorway is a number
  // being compared against another number. A crawler cannot do that
  // comparison against "L:198cm H:97cm D:99cm" in prose.
  //
  // CMT is the UN/CEFACT code for centimetre, which is what unitCode wants.
  // A corner sofa also records a second arm length; schema.org has no property
  // for it, so it stays on the diagram and out of here rather than being
  // squeezed into one of these three where it would be wrong.
  const cm = (value: number) => ({
    '@type': 'QuantitativeValue',
    value,
    unitCode: 'CMT',
  })
  if (p.width) schema.width = cm(p.width)
  if (p.depth) schema.depth = cm(p.depth)
  if (p.height) schema.height = cm(p.height)

  // One value where there is one, the array where there are several. Google
  // accepts both, and collapsing a single-fabric product to a bare string
  // reads better in the report than a one-item list.
  const one = (values?: string[]) =>
    !values || values.length === 0 ? undefined : values.length === 1 ? values[0] : values
  const material = one(p.materials)
  const color = one(p.colors)
  if (material) schema.material = material
  if (color) schema.color = color

  // Only where genuine approved reviews exist. Emitting a zero rating - or any
  // rating at all without real reviews behind it - is a manual-action risk.
  if (p.reviews.length > 0) {
    const sum = p.reviews.reduce((t, r) => t + r.rating, 0)
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number((sum / p.reviews.length).toFixed(2)),
      reviewCount: p.reviews.length,
      bestRating: 5,
      worstRating: 1,
    }
    schema.review = p.reviews.map(r => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      author: { '@type': 'Person', name: r.customer_name || 'Verified Buyer' },
      ...(r.comment ? { reviewBody: r.comment } : {}),
      ...(r.created_at ? { datePublished: r.created_at.slice(0, 10) } : {}),
    }))
  }

  return schema
}

// ─── Editorial and information pages ────────────────────────────────────────

/**
  * The guide pages carried no page-level markup at all.
  *
  * /fabrics is 4,598 words, /delivery-returns 3,582, /care-guide 2,812 and
  * /size-guide 2,470 - and every one of them shipped with nothing but the
  * site-wide FurnitureStore node from the root layout. No type, no author, no
  * date, and no BreadcrumbList behind a breadcrumb that has been rendered on
  * screen the whole time. The category pages had exactly this problem and it
  * was fixed there; these never got the same treatment.
  *
  * It matters most for the answer engines. A long page with no declared type
  * is a wall of text a crawler has to infer everything about; the same page
  * declared as an Article, authored by a named Organization and dated, is a
  * source something can quote with attribution.
  */
export interface EditorialSchemaInput {
  /**
   * Article for a guide, and the more specific type where schema.org has one:
   * AboutPage, ContactPage, CollectionPage. Anything else, WebPage.
   */
  type?: 'Article' | 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage'
  headline: string
  description?: string
  path: string
  /**
   * ISO date, YYYY-MM-DD. The date the CONTENT last changed, not the date the
   * file was last touched - a typo fix or a refactor is not a revision, and a
   * date that moves every deploy tells a reader nothing except that it is
   * automated. Bump it when you change what the page says.
   */
  updated: string
  /**
   * ISO date the piece first went up. Only meaningful on an Article - a
   * policy page or a contact page was never "published" in the sense Google
   * means, and dating one implies an archive that does not exist.
   */
  published?: string
}

export function editorialSchema(e: EditorialSchemaInput) {
  const type = e.type ?? 'Article'

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: e.headline,
    url: abs(e.path),
    dateModified: e.updated,
    // Both point at the single Organization node the homepage declares, rather
    // than restating the name here. Two spellings of the same publisher read
    // as two publishers.
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  }

  // headline is the Article-specific property and Google reads it in place of
  // name; author only means something on a creative work. A ContactPage has no
  // author, and giving it one would be claiming somebody wrote the shop's
  // phone number.
  if (type === 'Article') {
    schema.headline = e.headline
    schema.author = { '@id': `${SITE_URL}/#organization` }
    // Falls back to dateModified so an Article is never dated only by its
    // last edit. A piece with a modified date and no published date reads as
    // older than it is, because that is the only date there is to read.
    schema.datePublished = e.published ?? e.updated
  }

  if (e.description) schema.description = e.description

  return schema
}

// ─── Local business (the Blackburn showroom) ────────────────────────────────

/**
 * The physical shop, as opposed to organizationSchema() which describes the
 * trader. Emitted once from the root layout so it appears on every page with
 * a single stable @id - two FurnitureStore nodes with different identifiers
 * read as two different shops.
 *
 * Visits are by appointment, so openingHoursSpecification describes when an
 * appointment can be booked for rather than a walk-in window.
 *
 * No `sameAs`: the site links to no social profiles, and pointing this at a
 * handle we have not verified would attach someone else's account to the
 * business entity. Add real profile URLs here when there are some.
 */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${SITE_URL}/#showroom`,
    name: ORGANISATION_NAME,
    url: `${SITE_URL}/showroom`,
    logo: `${SITE_URL}/icon-512x512.png`,
    image: `${SITE_URL}/og-image.jpg`,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    description:
      'Furniture retailer in Blackburn selling sofas and recliners with free UK Mainland delivery and cash on delivery. Showroom visits by appointment.',
    telephone: PHONE_E164,
    email: SUPPORT_EMAIL,
    priceRange: '££-£££',
    currenciesAccepted: 'GBP',
    // Both are taken on delivery. We do not accept cards.
    paymentAccepted: 'Cash, Bank Transfer',
    address: postalAddress(),
    geo: {
      '@type': 'GeoCoordinates',
      // APPROXIMATE - the centroid of the BB6 7LS postcode district, not the
      // unit itself. Replace both values with the exact pin from Google Maps
      // (right-click the building -> the lat/long at the top of the menu).
      latitude: '53.7860',
      longitude: '-2.4060',
    },
    // Not "United Kingdom": that includes Northern Ireland, which is outside
    // the free UK Mainland service this business advertises. The three GB
    // countries describe the standard delivery area.
    //
    // Northern Ireland, the Isle of Man and the Scottish Islands are not
    // refused - they are arranged personally, so they are not part of the
    // advertised standard area. See DELIVERY_AREA_NOTE in constants/delivery.ts.
    areaServed: [
      { '@type': 'Country', name: 'England' },
      { '@type': 'Country', name: 'Scotland' },
      { '@type': 'Country', name: 'Wales' },
    ],
    // Not a walk-in shop: these are the hours an appointment can be booked for.
    publicAccess: false,
    // Built from OPENING_HOURS so the markup and the table rendered on
    // /showroom cannot drift apart.
    openingHoursSpecification: OPENING_HOURS.map(h => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [...h.days],
      opens: h.opens,
      closes: h.closes,
    })),
    // Only present when there is something real to point at - see
    // SOCIAL_PROFILES in constants/contact.ts for why a link that doesn't
    // identify this business is worse than an absent one. Placeholder entries
    // are already filtered out of SOCIAL_SAME_AS.
    ...(SOCIAL_SAME_AS.length ? { sameAs: SOCIAL_SAME_AS } : {}),
    makesOffer: {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Cash on Delivery',
        description: 'Pay when your furniture arrives - no upfront payment needed',
      },
    },
  }
}
