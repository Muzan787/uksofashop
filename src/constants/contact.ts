// src/constants/contact.ts
//
// Name, address and phone - the "NAP" trio that local search uses to decide
// whether two mentions of a business are the same business. Google compares
// what your site says against your Google Business Profile and every
// directory listing, and inconsistent formatting weakens the match.
//
// These were previously written out by hand in a dozen components, which is
// how the site ended up displaying "07476 616022" in the footer, header,
// contact and FAQ pages, "0747 661 6022" on printed delivery notes, and
// "tel:447476616022" (a number no phone can dial) on the product page.

/** E.164. The only format structured data and Google Business Profile want. */
export const PHONE_E164 = '+447476616022'

/** How the number is written for a human to read. UK national format. */
export const PHONE_DISPLAY = '07476 616022'

/**
 * href for a click-to-call link. Always E.164 with the leading "+": a bare
 * "tel:447476616022" is dialled as a domestic number and fails.
 */
export const PHONE_HREF = `tel:${PHONE_E164}`

/** wa.me wants the international number with no "+" and no spaces. */
const WHATSAPP_NUMBER = '447476616022'

/** A wa.me link, optionally pre-filled with a message. */
export function whatsAppHref(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * Where a customer writes to us, and where every automated email tells them to
 * reply. A real mailbox on our own domain (Hostinger Mail). It replaced the
 * old @gmail.com address on 2026-09-16: mail branded as uksofashop.co.uk but
 * sent from a free Gmail account fails sender authentication and was landing
 * in spam.
 */
export const SUPPORT_EMAIL = 'enquiries@uksofashop.co.uk'

/**
 * The address automated emails are sent FROM - order confirmations, status
 * updates, review requests. An alias of the mailbox above, so a reply to it
 * still reaches the same inbox. Kept separate so a customer can tell at a
 * glance which messages are from a person and which are from the shop.
 */
export const ORDERS_EMAIL = 'orders@uksofashop.co.uk'

// OWNER_GMAIL used to live here, and the comment beside it said "not
// published anywhere on the site" — which stopped being true the moment it
// was in this file. Every constant in here is imported by client components
// (the footer, the contact page, the product page), so the whole module is
// compiled into the JavaScript bundle: the address was sitting in three
// public chunks in plain text, readable by anyone who opened devtools or any
// scraper that reads .js files.
//
// It is only ever used to BCC the owner on mail the server sends, so it now
// lives in src/utils/email.ts, which cannot reach the browser — it imports
// nodemailer.

/**
 * The legal entity behind the shop.
 *
 * ── NOT YET CONFIRMED — FILL THIS IN ──────────────────────────────────────
 *
 * The Electronic Commerce Regulations 2002 (reg 6) and Schedule 2 of the
 * Consumer Contracts Regulations 2013 both require a trader to identify
 * itself, not just to publish an address. The address, phone number and email
 * above are all on the site already; who you actually are is not, anywhere.
 *
 * Set `legalName` to the name you trade under legally:
 *   · a limited company -> the registered name, plus `companyNumber`
 *   · a sole trader     -> your own name; leave `companyNumber` null
 *
 * `vatNumber` stays null while the business is not VAT registered. The terms
 * page used to say "all prices include VAT at the current rate", which was a
 * claim with nothing behind it; that sentence has been removed. If you
 * register later, put the number here and add the VAT line back.
 *
 * Every surface that prints these renders NOTHING while legalName is null,
 * rather than a placeholder. That is deliberate: a half-filled identity
 * block is worse than an absent one, and an empty one is easy to spot.
 */
export const TRADER: {
  legalName: string | null
  companyNumber: string | null
  vatNumber: string | null
} = {
  legalName: null,
  companyNumber: null,
  vatNumber: null,
}

/**
 * The Royal Mail address, in full.
 *
 * It used to read "Unit 04, Waverledge Street, Blackburn, BB6 7LS", which is
 * three things short of the real one: the unit is 4 rather than 04, the
 * business park was missing, and so was Great Harwood — the town the unit is
 * actually in. BB6 is Hyndburn; Blackburn is only the post town, which is why
 * it stays on the `locality` line.
 *
 * Google matches a Business Profile against the whole address, and local
 * directories need the same string character for character, so a short
 * version is a weaker match everywhere at once. Great Harwood is also a term
 * worth having: far less competed than Blackburn, and where the showroom is.
 *
 * `locality` is deliberately unchanged — Blackburn is correct for the post
 * town and is what all the storefront copy says. Great Harwood sits in
 * `street`, which is where a dependent locality goes when PostalAddress has
 * no field for one.
 */
export const ADDRESS = {
  street: 'Unit 4, Waverledge Business Park, Waverledge Street, Great Harwood',
  locality: 'Blackburn',
  region: 'Lancashire',
  postcode: 'BB6 7LS',
  country: 'GB',
} as const

/** One line, for print templates and email footers. */
export const ADDRESS_LINE = `${ADDRESS.street}, ${ADDRESS.locality}, ${ADDRESS.postcode}`

/**
 * The trader identity sentence, or null while TRADER is unfilled. Callers
 * render it only when it is a string, so an unconfirmed entity shows nothing
 * rather than a placeholder.
 */
export function traderIdentityLine(): string | null {
  if (!TRADER.legalName) return null
  const parts = [`UK Sofa Shop is a trading name of ${TRADER.legalName}`]
  if (TRADER.companyNumber) {
    parts.push(`registered in England and Wales, company number ${TRADER.companyNumber}`)
  }
  parts.push(`of ${ADDRESS_LINE}`)
  if (TRADER.vatNumber) parts.push(`VAT registration number ${TRADER.vatNumber}`)
  return parts.join(', ') + '.'
}

/**
 * Showroom appointment hours. One definition behind both the human-readable
 * table on /showroom and the openingHoursSpecification in structured data, so
 * the two can never disagree - a mismatch between your site's stated hours and
 * your Google Business Profile is a local ranking signal.
 */
export const OPENING_HOURS = [
  { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], label: 'Monday – Friday', opens: '09:00', closes: '18:00', display: '9am – 6pm' },
  { days: ['Saturday'], label: 'Saturday', opens: '10:00', closes: '16:00', display: '10am – 4pm' },
] as const

type SocialPlatform = 'facebook' | 'instagram' | 'tiktok'

interface SocialProfile {
  platform: SocialPlatform
  url: string
  /**
   * A link that goes to the platform rather than to our profile on it. Renders
   * as a footer icon but is kept OUT of the schema `sameAs` array - see below.
   */
  placeholder?: boolean
}

/**
 * Public social profiles. One list behind both the footer icons and the
 * structured-data `sameAs` array.
 *
 * `sameAs` is how a search engine ties this site to a social presence and
 * confirms they are the same business, so every entry that reaches it has to
 * be a profile page for THIS business. A link to a platform's homepage
 * identifies nothing, and a handle belonging to someone else would attach
 * their account to this business entity - which is why `placeholder` entries
 * are filtered out of the markup rather than published with it.
 */
export const SOCIAL_PROFILES: SocialProfile[] = [
  // "ussofashop89" is correct - US, not UK. It was mistyped when the Page was
  // created and cannot be changed now. Confirmed by the owner; do NOT "fix" it
  // to uksofashop89, which is a different (or non-existent) Page.
  { platform: 'facebook', url: 'https://www.facebook.com/ussofashop89' },
  { platform: 'instagram', url: 'https://www.instagram.com/uksofashop.co.uk' },
  // Placeholder until the real profile URL is known. Replace the URL with
  // https://www.tiktok.com/@yourhandle and delete the placeholder flag - it
  // then starts appearing in sameAs automatically.
  { platform: 'tiktok', url: 'https://www.tiktok.com', placeholder: true },
]

/** Only the entries that genuinely identify this business. */
export const SOCIAL_SAME_AS = SOCIAL_PROFILES.filter(p => !p.placeholder).map(p => p.url)
