import assert from 'node:assert/strict'
import { isDeterministicCheckoutWhatsAppMatch } from './src/utils/attribution/checkoutLinkage'

const NOW = Date.parse('2026-09-07T14:00:00Z')
const MAX = 30 * 24 * 60 * 60
const base = {
  reference: 'UKSS-WA-260907-ABC123',
  created_at: '2026-09-07T13:30:00Z',
  visitor_id: '11111111-1111-4111-8111-111111111111',
  product_id: '22222222-2222-4222-8222-222222222222',
  variant_id: '33333333-3333-4333-8333-333333333333',
  converted_order_id: null,
}

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: base.visitor_id,
  cartVariantIds: [base.variant_id],
  enquiry: base,
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), true, 'same visitor + exact variant should link')

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: '99999999-9999-4999-8999-999999999999',
  cartVariantIds: [base.variant_id],
  enquiry: base,
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), false, 'cross-browser/cross-device visitor must not auto-link')

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: base.visitor_id,
  cartVariantIds: ['44444444-4444-4444-8444-444444444444'],
  enquiry: base,
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), false, 'wrong variant must not auto-link')

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: base.visitor_id,
  cartVariantIds: [base.variant_id],
  enquiry: { ...base, converted_order_id: '55555555-5555-4555-8555-555555555555' },
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), false, 'claimed enquiry must not link twice')

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: base.visitor_id,
  cartVariantIds: [base.variant_id],
  enquiry: { ...base, created_at: '2026-07-01T00:00:00Z' },
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), false, 'stale reference must not auto-link')

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: base.visitor_id,
  cartVariantIds: [],
  enquiry: { ...base, product_id: null, variant_id: null },
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), true, 'generic acquisition enquiry may link by exact reference + same visitor')

assert.equal(isDeterministicCheckoutWhatsAppMatch({
  visitorId: base.visitor_id,
  cartVariantIds: [],
  enquiry: { ...base, variant_id: null },
  maxAgeSeconds: MAX,
  nowMs: NOW,
}), false, 'product-only enquiry without exact variant is too ambiguous')

console.log('Tracking V2.1 deterministic linkage tests PASS')
