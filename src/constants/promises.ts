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
  delivery: {
    label: 'Free Delivery',
    sub: 'UK Mainland, ground floor',
    short: 'Free UK Mainland delivery',
    long: 'Free delivery to UK Mainland addresses, brought to the ground floor or a ground-floor room of your choice.',
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
    long: 'You have 14 days from delivery to change your mind, under the Consumer Contracts Regulations. Made-to-measure sofas are the standard exemption, because we cannot resell a sofa built to your specification.',
  },
  custom: {
    label: 'Made to Order',
    sub: 'Your fabric and size',
    short: 'Fabric sofas made to order',
    long: 'Our fabric sofas are made to order in the colour, material and size you choose.',
  },
} as const

/** Rotating strip at the very top of the site. */
export const ANNOUNCEMENTS = [
  'Free Delivery to UK Mainland',
  'Fabric Sofas Made to Your Own Size and Colour',
  'Cash on Delivery Available Nationwide',
  'Delivered in 2-4 Working Days',
] as const

/**
 * The three-up trust row used by the footer, homepage and product page.
 * Ordered by what actually persuades a UK sofa buyer: price, then payment,
 * then reassurance.
 */
export const TRUST_POINTS = [
  PROMISES.delivery,
  PROMISES.payment,
  PROMISES.custom,
  PROMISES.guarantee,
] as const

/** Shared meta description, used by the root layout and the manifest. */
export const META_DESCRIPTION =
  'Luxury sofas with free delivery across UK Mainland and cash on delivery available. 1-year frame guarantee. Shop corner sofas, fabric sofas, recliners and more.'
