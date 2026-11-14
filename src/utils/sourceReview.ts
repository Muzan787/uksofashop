// src/utils/sourceReview.ts
//
// Which orders genuinely need a person to decide where they came from.
//
// NOT "every order whose manual override is blank". Most orders carry strong
// automatic evidence (an ad click id, or an ad campaign tag from a recorded
// visit) and need nothing. An order is listed only when the evidence conflicts
// or is missing in a way a person can resolve by asking or checking:
//
//   conflict      a Meta click and a Google click are both on the order
//   tag_only      an ad campaign tag but no click id the platform could match
//   no_evidence   no click id, no ad tag, no linked website visit and no
//                 WhatsApp reference: the source is unknown
//
// An order a person has already reviewed (manual_acquisition_source set) is
// never listed: their decision, and its note and time, are in the order's
// history. Reviewing changes ONLY the internal source. It never edits raw
// click ids or tags and never sends anything to Meta or Google: sending stays
// behind consent, the 7-day limit and the Send button.

export type ReviewReason = 'conflict' | 'tag_only' | 'no_evidence'

export interface ReviewOrder {
  status: string | null
  is_test: boolean | null
  manual_acquisition_source: string | null
  utm_source: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  meta_fbc: string | null
  visitor_id: string | null
  whatsapp_reference: string | null
}

export const REVIEW_LABEL: Record<ReviewReason, string> = {
  conflict: 'Meta and Google clicks both present',
  tag_only: 'Ad tag but no click id',
  no_evidence: 'No source evidence at all',
}

export const REVIEW_HELP: Record<ReviewReason, string> = {
  conflict: 'The customer clicked adverts on both. Decide which one really brought them, if you can tell (for example from what they said).',
  tag_only: 'The visit was tagged as coming from an advert but carries no click id, so the platform cannot match it. Confirm with the customer if it matters.',
  no_evidence: 'Nothing recorded where this customer came from. Ask them how they found us and record the answer.',
}

const META_TAGS = ['fb', 'ig', 'meta', 'facebook', 'instagram']

export function reviewReason(o: ReviewOrder): ReviewReason | null {
  if (o.is_test) return null
  if (o.manual_acquisition_source) return null
  const google = Boolean(o.gclid || o.gbraid || o.wbraid)
  const meta = Boolean(o.fbclid || o.meta_fbc)
  if (google && meta) return 'conflict'
  if (google || meta) return null
  const tag = (o.utm_source ?? '').toLowerCase()
  if (tag === 'google' || META_TAGS.includes(tag)) return 'tag_only'
  if (tag) return null // another tagged source: recorded, not ambiguous
  if (!o.visitor_id && !o.whatsapp_reference) return 'no_evidence'
  return null // a visit or a WhatsApp reference exists: see the evidence trail
}

/** How the order's source reads in a list, without any manual decision. */
export function automaticSource(o: ReviewOrder): string {
  const google = Boolean(o.gclid || o.gbraid || o.wbraid)
  const meta = Boolean(o.fbclid || o.meta_fbc)
  if (google && meta) return 'Meta + Google clicks'
  if (meta) return 'Meta click'
  if (google) return 'Google click'
  const tag = (o.utm_source ?? '').toLowerCase()
  if (META_TAGS.includes(tag)) return 'Meta tag only'
  if (tag === 'google') return 'Google tag only'
  if (tag) return `Tagged: ${tag}`
  if (o.visitor_id) return 'Website visit, no ad'
  if (o.whatsapp_reference) return 'WhatsApp reference, no ad'
  return 'Unknown'
}
