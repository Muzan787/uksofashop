// src/utils/digestSources.ts
//
// The Monday email's "confirmed orders, by where they came from" (admin
// upgrade Q5). Pure, so the rules are tested and the email only formats.
//
// Where an order came from, in this order:
//   1. what staff said on the order page ("where it really came from"),
//      because they asked the customer;
//   2. the ad click saved with the order: Meta (a Meta utm_source, fbclid or
//      the fbc cookie) or Google (gclid, gbraid, wbraid or a Google
//      utm_source). WhatsApp orders carry these too when the chat began on
//      the site, so an ad that led to a chat counts for the ad;
//   3. how it was taken: by phone, or on WhatsApp;
//   4. otherwise the website with no ad behind it: direct.
//
// Meta orders are also split by campaign and ad (utm_campaign, utm_content).

export type SourceKey = 'meta' | 'google' | 'whatsapp' | 'phone' | 'direct' | 'referral' | 'other'

export const SOURCE_LABELS: Record<SourceKey, string> = {
  meta: 'Meta (Facebook and Instagram)',
  google: 'Google',
  whatsapp: 'WhatsApp, no ad',
  phone: 'Phone, no ad',
  direct: 'Website, no ad',
  referral: 'Recommended by someone',
  other: 'Something else',
}

export const SOURCE_ORDER: SourceKey[] = ['meta', 'google', 'whatsapp', 'phone', 'direct', 'referral', 'other']

export interface SourceOrder {
  total_amount: number | string | null
  source: string | null
  channel: string | null
  manual_acquisition_source: string | null
  utm_source: string | null
  utm_campaign: string | null
  utm_content: string | null
  fbclid: string | null
  meta_fbc: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
}

const META_UTM = /^(meta|facebook|fb|instagram|ig)$/i
const GOOGLE_UTM = /^(google|adwords|gads)$/i

export function orderSource(o: SourceOrder): SourceKey {
  const staff = o.manual_acquisition_source
  if (staff === 'meta' || staff === 'google' || staff === 'direct' || staff === 'referral' || staff === 'other') return staff
  if (META_UTM.test(o.utm_source?.trim() ?? '') || o.fbclid || o.meta_fbc) return 'meta'
  if (GOOGLE_UTM.test(o.utm_source?.trim() ?? '') || o.gclid || o.gbraid || o.wbraid) return 'google'
  if (o.channel === 'phone') return 'phone'
  if (o.source === 'whatsapp') return 'whatsapp'
  return 'direct'
}

export interface SourceTotal { key: SourceKey; label: string; orders: number; value: number }
export interface AdTotal { campaign: string; ad: string; orders: number; value: number }

export interface ConfirmedSummary {
  orders: number
  value: number
  /** Every source, in SOURCE_ORDER, zeros included, so two weeks line up. */
  bySource: SourceTotal[]
  /** Meta orders by campaign and ad, most orders first. */
  metaAds: AdTotal[]
}

const NOT_RECORDED = 'not recorded'

export function summariseConfirmed(rows: SourceOrder[]): ConfirmedSummary {
  const totals = new Map<SourceKey, { orders: number; value: number }>(SOURCE_ORDER.map(k => [k, { orders: 0, value: 0 }]))
  const ads = new Map<string, AdTotal>()
  let value = 0

  for (const o of rows) {
    const amount = Number(o.total_amount ?? 0) || 0
    const key = orderSource(o)
    const t = totals.get(key)!
    t.orders += 1
    t.value += amount
    value += amount
    if (key === 'meta') {
      const campaign = o.utm_campaign?.trim() || NOT_RECORDED
      const ad = o.utm_content?.trim() || NOT_RECORDED
      const id = `${campaign}\u0000${ad}`
      const a = ads.get(id) ?? { campaign, ad, orders: 0, value: 0 }
      a.orders += 1
      a.value += amount
      ads.set(id, a)
    }
  }

  return {
    orders: rows.length,
    value,
    bySource: SOURCE_ORDER.map(key => ({ key, label: SOURCE_LABELS[key], ...totals.get(key)! })),
    metaAds: [...ads.values()].sort((a, b) => b.orders - a.orders || b.value - a.value || a.campaign.localeCompare(b.campaign)),
  }
}
