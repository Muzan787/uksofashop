// src/utils/attribution/lead.ts
//
// The reference on a checkout-recovery lead.
//
// WHAT IT IS FOR. A shopper who reaches checkout, asks to be reminded, and
// then finishes the sale in a WhatsApp conversation used to be unlinkable:
// the order was taken by hand, so it carried no _fbp, no _fbc, no ga_client_id
// and no click id, and the conversion went to Meta and Google as an anonymous
// chat sale with nothing to tie it to the ad that earned it. The reference is
// the join - paste it into the manual order form and place_manual_order copies
// the lead's attribution onto the order, exactly as UKSS-WA-… already does for
// a WhatsApp enquiry.
//
// WHY THERE IS NO GENERATOR HERE, unlike utils/attribution/whatsapp.ts. A lead
// reference is minted by a column default in Postgres. The opt-in endpoint
// upserts on session_id, so a shopper who ticks the box, changes their mind
// and ticks it again writes the row twice - and an application-supplied value
// would be regenerated on the second write, while the first reference was
// already sitting in a reminder email. A default is evaluated on insert only.
// See supabase/migrations/20261008200911_lead_reference.sql.

/**
 * Matches the database check constraint, not merely the shape we expect.
 * UKSS-LD-YYMMDD-XXXXXX, deliberately one letter different from UKSS-WA- so
 * the two are distinguishable at a glance in the admin panel - and so a
 * reference pasted into the wrong box fails here rather than silently
 * matching nothing.
 */
const LEAD_REFERENCE_PATTERN = /^UKSS-LD-\d{6}-[A-Z0-9]{6}$/

export function isValidLeadReference(value: string): boolean {
  return LEAD_REFERENCE_PATTERN.test(value.trim().toUpperCase())
}

/**
 * The reference as the database stores it, or null when the input is not one.
 *
 * Null rather than throwing: a typo in an optional field must not cost the
 * admin the order they are halfway through taking. The database function
 * treats an unmatched reference as a no-op, so this only avoids sending it a
 * value that could never have matched.
 */
export function normaliseLeadReference(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = value.trim().toUpperCase()
  return isValidLeadReference(clean) ? clean : null
}
