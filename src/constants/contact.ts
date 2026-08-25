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
export const WHATSAPP_NUMBER = '447476616022'

/** A wa.me link, optionally pre-filled with a message. */
export function whatsAppHref(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

export const ADDRESS = {
  street: 'Unit 02, Waverledge Street',
  locality: 'Blackburn',
  postcode: 'BB6 7LS',
  country: 'GB',
} as const

/** One line, for print templates and email footers. */
export const ADDRESS_LINE = `${ADDRESS.street}, ${ADDRESS.locality}, ${ADDRESS.postcode}`

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

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok'

export interface SocialProfile {
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
  { platform: 'instagram', url: 'https://www.instagram.com/uk_sofashop' },
  // Placeholder until the real profile URL is known. Replace the URL with
  // https://www.tiktok.com/@yourhandle and delete the placeholder flag - it
  // then starts appearing in sameAs automatically.
  { platform: 'tiktok', url: 'https://www.tiktok.com', placeholder: true },
]

/** Only the entries that genuinely identify this business. */
export const SOCIAL_SAME_AS = SOCIAL_PROFILES.filter(p => !p.placeholder).map(p => p.url)
