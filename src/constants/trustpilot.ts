// src/constants/trustpilot.ts
//
// Trustpilot, in one place. The profile was claimed on 2026-09-18 with
// enquiries@uksofashop.co.uk on the Free plan.
//
// NOTHING ON THE STOREFRONT. On 2026-10-31 Muaz asked for every trace of
// Trustpilot to come off the website: the TrustBox widgets and their switch
// (NEXT_PUBLIC_TRUSTPILOT_WIDGETS, which on the Free plan could only ever draw
// an empty box), the footer link, the profile in the Organization sameAs, and
// the "Review on Trustpilot" line on the review cards. What is left here is
// for asking customers for a review - the admin order page and the delivered
// email - none of which a visitor sees.
//
// The invitation values are environment variables, because anyone holding the
// BCC address could send invitations in the shop's name.
//
// TWO SWITCHES, EACH OFF BY DEFAULT.
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
