// src/constants/trustpilot.ts
//
// Trustpilot, in one place. The profile was claimed on 2026-09-18 with
// enquiries@uksofashop.co.uk on the Free plan.
//
// Two kinds of value here. The public ones - the business unit id, the profile
// and review URLs, the TrustBox template ids - are visible in the page source
// of every site that shows a Trustpilot widget, so they are constants. The
// private ones - the invitation BCC address, the tokenised invitation link -
// are environment variables, because anyone holding the BCC address could
// send invitations in the shop's name.
//
// THREE SWITCHES, EACH OFF BY DEFAULT.
//
//   TRUSTPILOT_INVITE_BCC       Set it and the "delivered" email is copied to
//                               Trustpilot's Automatic Feedback Service, which
//                               sends the customer an invitation on its own
//                               schedule (Trustpilot dashboard -> Invitations ->
//                               settings). The site's own review-request email
//                               then stands down for that order, so one
//                               customer is asked once.
//
//   TRUSTPILOT_INVITE_LINK      Optional. The shareable invitation link from
//                               the dashboard. Reviews through it are marked
//                               as invited; through the plain review URL they
//                               are organic. Used in the admin WhatsApp
//                               button for customers with no email, which is
//                               most of them. Falls back to the review URL.
//
//   NEXT_PUBLIC_TRUSTPILOT_WIDGETS
//                               Set to "1" to show the TrustBoxes on the site.
//                               Off until there are enough reviews for a
//                               rating to mean something - "5.0 from 2
//                               reviews" is weaker than no badge. The "Review
//                               us on Trustpilot" links do not depend on it.

/** Trustpilot's id for this business. Public: it is in every TrustBox embed. */
export const TRUSTPILOT_BUSINESS_UNIT_ID = '6aad5fc120d98657b6af39aa'

/** The public profile. Goes in the footer and in the business's sameAs. */
export const TRUSTPILOT_PROFILE_URL = 'https://uk.trustpilot.com/review/uksofashop.co.uk'

/**
 * Where anyone can write a review. Reviews left here are "organic" rather
 * than "invited"; TRUSTPILOT_INVITE_LINK, when set, is the one to send.
 */
export const TRUSTPILOT_REVIEW_URL = 'https://uk.trustpilot.com/evaluate/uksofashop.co.uk'

/** The link to hand a customer who is being asked for a review. */
export function trustpilotInviteLink(): string {
  return process.env.TRUSTPILOT_INVITE_LINK?.trim() || TRUSTPILOT_REVIEW_URL
}

/** The Automatic Feedback Service BCC address, or null when invitations are off. */
export function trustpilotInviteBcc(): string | null {
  const value = process.env.TRUSTPILOT_INVITE_BCC?.trim()
  return value && value.includes('@') ? value : null
}

/**
 * Whether the TrustBoxes render. NEXT_PUBLIC_ so the client bundle can read
 * it; inlined at build time, so flipping it needs a deploy.
 */
export const TRUSTPILOT_WIDGETS_ENABLED = process.env.NEXT_PUBLIC_TRUSTPILOT_WIDGETS === '1'

/**
 * TrustBox templates, by Trustpilot's own ids. The height is what Trustpilot
 * documents for each; the iframe is sized to it before it loads so the page
 * does not shift when it arrives.
 */
export const TRUSTBOX = {
  /** Stars, TrustScore and review count on one 20px line. */
  microCombo: { templateId: '5419b6ffb0d04a076446a9af', height: '20px' },
  /** A row of recent reviews with the score beside them. */
  carousel: { templateId: '53aa8912dec7e10d38f59f36', height: '140px' },
} as const

export type TrustBoxKind = keyof typeof TRUSTBOX
