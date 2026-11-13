// src/utils/orderEvidence.ts
//
// What the shop can honestly say about where one order came from, built only
// from records that exist: the order itself, the WhatsApp enquiry its
// reference points at, and the website visits recorded for the SAME visitor.
// Pure, so the admin card and its tests read the same rules.
//
// Rules this file will not bend:
//   - "WhatsApp" is how the customer got in touch (contact channel), never by
//     itself the acquisition source.
//   - Touches come only from the order's own visitor. Another device or
//     another browser is another visitor; two visitors are never merged on a
//     guess.
//   - First, assisting and last touch are shown separately. An order can carry
//     a Meta assist and a Google last click; neither platform is "the" answer
//     unless a person says so (manual_acquisition_source).
//   - The 30-minute WhatsApp window is for linking a tap to the order that
//     followed it. The 30-day window is an INTERNAL lookback for the staff
//     view. Neither changes what may be sent to an ad platform: Meta's 7-day
//     event-age limit and the customer's consent still decide that.

export const WHATSAPP_LINK_WINDOW_MS = 30 * 60 * 1000
export const INTERNAL_LOOKBACK_MS = 30 * 86400 * 1000

export type ContactChannel = 'whatsapp' | 'phone' | 'website'
export type Platform = 'meta' | 'google' | 'both_clicks' | 'other_tagged' | 'unattributed'
export type Basis = 'staff_override' | 'click_id' | 'campaign_tag_only' | 'none'
export type Confidence = 'high' | 'medium' | 'low' | 'none'

export interface EvidenceOrder {
  id: string
  created_at: string | null
  source: string | null
  channel: string | null
  visitor_id: string | null
  whatsapp_reference: string | null
  utm_source: string | null
  utm_campaign: string | null
  manual_acquisition_source: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  meta_fbc: string | null
  visit_matched_at: string | null
}

export interface EvidenceEnquiry {
  reference: string
  created_at: string
  visitor_id: string | null
  fbclid: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utm_source: string | null
  utm_campaign: string | null
  product_name: string | null
}

export interface EvidenceSession {
  created_at: string
  visitor_id: string | null
  first_touch_source: string | null
  first_touch_campaign: string | null
  last_touch_source: string | null
  last_touch_campaign: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
}

export interface Touch {
  at: string
  platform: Platform
  campaign: string | null
  proof: 'fbclid' | 'gclid' | 'gbraid' | 'wbraid' | 'campaign tag'
  role: 'first' | 'assist' | 'last' | 'only'
}

export interface OrderEvidence {
  contactChannel: ContactChannel
  platform: Platform
  basis: Basis
  confidence: Confidence
  headline: string
  whatsapp: null | {
    reference: string
    tappedAt: string
    lagMinutes: number
    withinLinkWindow: boolean
    sameVisitor: boolean | null
    product: string | null
  }
  touches: Touch[]
  gaps: string[]
}

const META_SOURCES = ['fb', 'ig', 'meta', 'facebook', 'instagram']

const googleClick = (r: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null }) =>
  r.gclid ? 'gclid' : r.gbraid ? 'gbraid' : r.wbraid ? 'wbraid' : null

export function contactChannelOf(order: Pick<EvidenceOrder, 'source' | 'channel'>): ContactChannel {
  if (order.channel === 'phone') return 'phone'
  if (order.channel === 'whatsapp' || order.source === 'whatsapp') return 'whatsapp'
  return 'website'
}

function platformOfTag(source: string | null | undefined): Platform {
  const s = (source ?? '').toLowerCase()
  if (!s) return 'unattributed'
  if (META_SOURCES.includes(s)) return 'meta'
  if (s === 'google') return 'google'
  return 'other_tagged'
}

/** What a single visit proves: a click id is proof, a campaign tag alone is only a claim. */
function touchOf(s: EvidenceSession): Omit<Touch, 'role'> | null {
  if (s.fbclid) return { at: s.created_at, platform: 'meta', campaign: s.last_touch_campaign ?? s.first_touch_campaign, proof: 'fbclid' }
  const g = googleClick(s)
  if (g) return { at: s.created_at, platform: 'google', campaign: s.last_touch_campaign ?? s.first_touch_campaign, proof: g }
  const p = platformOfTag(s.last_touch_source ?? s.first_touch_source)
  if (p === 'meta' || p === 'google') {
    return { at: s.created_at, platform: p, campaign: s.last_touch_campaign ?? s.first_touch_campaign, proof: 'campaign tag' }
  }
  return null
}

export function buildEvidence(
  order: EvidenceOrder,
  enquiry: EvidenceEnquiry | null,
  sessions: EvidenceSession[],
): OrderEvidence {
  const gaps: string[] = []
  const contactChannel = contactChannelOf(order)
  const orderAt = order.created_at ? Date.parse(order.created_at) : NaN

  // 1. The platform on the order itself.
  const override = order.manual_acquisition_source?.toLowerCase() || null
  const orderG = googleClick(order)
  const orderMeta = Boolean(order.fbclid || order.meta_fbc)
  let platform: Platform
  let basis: Basis
  if (override) {
    platform = override === 'google' ? 'google' : override === 'meta' ? 'meta' : override === 'unattributed' || override === 'direct' ? 'unattributed' : 'other_tagged'
    basis = 'staff_override'
  } else if (orderMeta && orderG) {
    platform = 'both_clicks'
    basis = 'click_id'
    gaps.push('Both a Meta and a Google click are on this order. It is not credited to either automatically.')
  } else if (orderMeta) {
    platform = 'meta'
    basis = 'click_id'
  } else if (orderG) {
    platform = 'google'
    basis = 'click_id'
  } else {
    const tag = platformOfTag(order.utm_source)
    platform = tag
    basis = tag === 'unattributed' ? 'none' : 'campaign_tag_only'
    if (tag === 'meta' || tag === 'google') gaps.push('Campaign tag only: no ad click id was captured, so the ad platform cannot match it.')
  }

  // 2. The WhatsApp tap that led here, by reference first.
  let whatsapp: OrderEvidence['whatsapp'] = null
  if (enquiry && Number.isFinite(orderAt)) {
    const tapped = Date.parse(enquiry.created_at)
    const lag = Math.round((orderAt - tapped) / 60000)
    whatsapp = {
      reference: enquiry.reference,
      tappedAt: enquiry.created_at,
      lagMinutes: lag,
      withinLinkWindow: orderAt - tapped >= 0 && orderAt - tapped <= WHATSAPP_LINK_WINDOW_MS,
      sameVisitor: enquiry.visitor_id && order.visitor_id ? enquiry.visitor_id === order.visitor_id : null,
      product: enquiry.product_name,
    }
    if (!whatsapp.withinLinkWindow) {
      gaps.push(lag < 0
        ? 'The order is recorded before the WhatsApp tap it references. Check the reference.'
        : `The order came ${formatLag(lag)} after the WhatsApp tap, outside the 30-minute link window. The reference still links them, but treat the timing as weaker evidence.`)
    }
  } else if (contactChannel === 'whatsapp') {
    gaps.push(order.whatsapp_reference
      ? 'This order carries a WhatsApp reference but no matching enquiry was found.'
      : 'Taken on WhatsApp with no reference, so no website tap is linked to it.')
  }

  // 3. Touches from this visitor's own recorded visits, in the lookback.
  const touches: Touch[] = []
  if (order.visitor_id && Number.isFinite(orderAt)) {
    const own = sessions
      .filter(s => s.visitor_id === order.visitor_id)
      .filter(s => { const t = Date.parse(s.created_at); return t <= orderAt && orderAt - t <= INTERNAL_LOOKBACK_MS })
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    const found = own.map(touchOf).filter((t): t is Omit<Touch, 'role'> => t !== null)
    found.forEach((t, i) => {
      const role: Touch['role'] = found.length === 1 ? 'only' : i === 0 ? 'first' : i === found.length - 1 ? 'last' : 'assist'
      touches.push({ ...t, role })
    })
    if (!found.length) gaps.push('No advertising click is recorded for this visitor in the 30 days before the order.')
  } else if (!order.visitor_id) {
    gaps.push('No website visitor is linked to this order, so no earlier touches can be shown. Another device or browser is never assumed to be the same person.')
  }
  const platformsSeen = new Set(touches.map(t => t.platform))
  if (platformsSeen.has('meta') && platformsSeen.has('google')) {
    gaps.push('This visitor touched both a Meta and a Google ad. Neither platform is credited as sole origin unless staff set it.')
  }

  // 4. How sure are we?
  let confidence: Confidence = 'none'
  if (basis === 'staff_override') confidence = 'high'
  else if (basis === 'click_id' && platform !== 'both_clicks') {
    confidence = !whatsapp || whatsapp.withinLinkWindow ? 'high' : 'medium'
  } else if (platform === 'both_clicks') confidence = 'low'
  else if (basis === 'campaign_tag_only') confidence = 'low'
  else if (touches.some(t => t.proof !== 'campaign tag')) confidence = 'medium'

  const label: Record<Platform, string> = {
    meta: 'Meta ad', google: 'Google ad', both_clicks: 'Meta and Google clicks (unresolved)',
    other_tagged: 'Another tagged source', unattributed: 'No advertising source recorded',
  }
  const viaChannel = contactChannel === 'whatsapp' ? ', contacted on WhatsApp' : contactChannel === 'phone' ? ', contacted by phone' : ''
  const headline = `${label[platform]}${viaChannel}`

  return { contactChannel, platform, basis, confidence, headline, whatsapp, touches, gaps }
}

export function formatLag(minutes: number): string {
  const m = Math.abs(minutes)
  if (m < 90) return `${m} min`
  if (m < 48 * 60) return `${Math.round(m / 60)} h`
  return `${Math.round(m / 1440)} days`
}
