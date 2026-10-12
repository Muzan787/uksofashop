// src/constants/promises.ts
//
// Single source of truth for every promise the storefront makes to a customer.
//
// These used to be hardcoded separately in the header, footer, homepage,
// checkout, product page, FAQ, terms, delivery page and page metadata, which is
// how the site ended up advertising a £500 free-delivery threshold, a 30-day
// home trial and a "lifetime" frame guarantee - none of which are real - while
// simultaneously claiming a 1-year guarantee elsewhere.
//
// Change a promise here and it changes everywhere. Do not re-inline these.
//
// Text only, no icons: each surface picks its own icon, so the copy stays
// framework-agnostic and can also be used in metadata and email.

export const PROMISES = {
  // Free to most of the UK since 2026-10-12, not to every mainland address:
  // Devon, Cornwall and the north of Scotland pay by distance from
  // Blackburn (DELIVERY_CHARGE_NOTE, utils/deliveryFee). Muaz wanted the free
  // delivery promise kept everywhere, and it is - worded "most of the UK" so
  // it stays true for the customers who now pay.
  delivery: {
    label: 'Free Delivery',
    sub: 'Most of the UK, ground floor',
    short: 'Free delivery to most of the UK',
    long: 'Free delivery to most of the UK, brought to the ground floor or a ground-floor room of your choice.',
    timingShort: 'Most UK Mainland: 2–4 working days',
    /**
     * The timing clause as it reads inside a meta description, where
     * timingLong does not fit: four category descriptions interpolated it and
     * came out at 232-244 characters, so Google cut them off mid-clause and
     * the delivery promise was the part that got dropped. Short enough to
     * survive, and still the only place the figure is written.
     */
    timingMeta: 'most orders in 2–4 working days',
    timingException: 'Some Wales and Scotland postcodes take 5–7 working days.',
    timingLong: 'Most UK Mainland orders arrive in 2–4 working days. Some Wales and Scotland postcodes take 5–7 working days.',
  },
  guarantee: {
    label: '1-Year Guarantee',
    sub: 'Structural frame',
    short: '1-year frame guarantee',
    long: 'Every sofa carries a 1-year guarantee covering structural faults in the frame and springs.',
  },
  payment: {
    label: 'Cash on Delivery',
    sub: 'Pay when it arrives',
    short: 'Cash on delivery available',
    long: 'Pay cash or by bank transfer when your furniture arrives - nothing upfront.',
  },
  returns: {
    label: '14-Day Returns',
    sub: 'Change your mind',
    short: '14 days to change your mind',
    long: 'You have 14 days from delivery to change your mind, under the Consumer Contracts Regulations. The exemption is for sofas personalised to your own choice of fabric, size or layout, because we cannot resell one built to your specification.',
  },
  custom: {
    label: 'Made to Order',
    sub: 'Your fabric and size',
    short: 'Fabric sofas made to order',
    long: 'Our fabric sofas are made to order in the colour, material and size you choose.',
  },
  customGlobal: {
    label: 'Custom Options',
    sub: 'Fabric & size options available',
    short: 'Custom fabric & size options available',
    long: 'Custom fabric and size options are available on selected sofas.',
  },
} as const

/**
 * Where delivery is not free, in one sentence. Shown wherever "free delivery
 * to most of the UK" is said with room for the detail - before a postcode is
 * known - so the charge is never a surprise at the end of checkout. The
 * figures are delivery_distance_fees'; keep the two in step.
 */
export const DELIVERY_CHARGE_NOTE =
  'Devon and the Aberdeen area £40; Cornwall and the Scottish Highlands £80; the far north of Scotland £100 - shown when you enter your postcode.'

/** Rotating strip at the very top of the site. */
export const ANNOUNCEMENTS = [
  'Free Delivery to Most of the UK',
  'Fabric Sofas Made to Your Own Size and Colour',
  'Pay Cash or by Bank Transfer on Delivery',
  'Most UK Mainland Orders: 2-4 Working Days',
] as const

/**
 * The three-up trust row used by the footer, homepage and product page.
 * Ordered by what actually persuades a UK sofa buyer: price, then payment,
 * then reassurance.
 */
export const TRUST_POINTS = [
  PROMISES.delivery,
  PROMISES.payment,
  PROMISES.customGlobal,
  PROMISES.guarantee,
] as const

/**
 * The cancellation notice, written once.
 *
 * Shown wherever a customer is about to commit to a personalised sofa, and
 * nowhere else. The test for "personalised" lives in
 * src/utils/cancellationRights.ts; this is only the wording.
 *
 * `warning` is the point-of-sale wording, used both at the checkout and on a
 * made-to-order product page. Both describe an order that genuinely IS
 * personalised: "Add to cart" on a made-to-order sofa opens the fabric
 * picker and will not proceed without a choice — see handleAdd in
 * ProductPageClient.tsx — so there is no way to buy one of these without
 * specifying it, and the exemption really does attach to every one.
 *
 * `test` is for the legal pages, which have to say where the line falls
 * across the whole catalogue. The stocked ranges keep the full 14 days.
 */
export const CANCELLATION = {
  warning:
    'Because this is built to the fabric you chose, it is made to your specification, and the 14-day right to change your mind does not apply — that is the standard exemption under the Consumer Contracts Regulations. Faulty or damaged items are covered exactly as normal.',
  /** For the legal pages, where the test itself has to be stated. */
  test:
    'The exemption covers sofas personalised to your own choice — the fabric you pick from the library, a size or layout we change for you, or anything else built to your specification. Our stocked ranges, sold in set sizes and finishes, carry the full 14-day right.',
} as const

/** Shared meta description, used by the root layout and the manifest. */
export const META_DESCRIPTION =
  'Luxury sofas with free delivery to most of the UK and cash on delivery available. 1-year frame guarantee. Shop corner sofas, fabric sofas, recliners and more.'
