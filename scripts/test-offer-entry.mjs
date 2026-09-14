import assert from 'node:assert/strict'

process.env.OFFER_ENTRY_SIGNING_SECRET = 'phase4c-test-secret-is-not-used-outside-this-process'

const { signOfferEntry, verifyOfferEntry } = await import('../src/utils/offers/entryToken.ts')

const variantId = 'ff3c0414-77ba-40ef-b6b2-bd97bff2bd17'
const catalog = signOfferEntry({
  v: 1,
  source: 'meta_catalog',
  destination: `/shop/u-shaped-sofa/bishop-u-shaped-scattered-back-sofa?variant=${variantId}`,
  variantId,
})
assert.deepEqual(verifyOfferEntry(catalog), {
  v: 1,
  source: 'meta_catalog',
  destination: `/shop/u-shaped-sofa/bishop-u-shaped-scattered-back-sofa?variant=${variantId}`,
  variantId,
})

const manual = signOfferEntry({ v: 1, source: 'meta_ads', destination: '/' })
assert.equal(verifyOfferEntry(manual)?.source, 'meta_ads')
assert.equal(verifyOfferEntry(`${manual.slice(0, -1)}x`), null)
assert.equal(verifyOfferEntry('random-token'), null)
assert.equal(verifyOfferEntry(manual.split('.')[0]), null)

assert.throws(() => signOfferEntry({
  v: 1,
  source: 'meta_catalog',
  destination: `/shop/u-shaped-sofa/bishop-u-shaped-scattered-back-sofa?variant=${variantId}`,
  variantId: '7b3d43e7-47bd-4ed1-90d2-88234a44c0ec',
}))
assert.throws(() => signOfferEntry({ v: 1, source: 'meta_ads', destination: 'https://evil.invalid/' }))

console.log('offer-entry contract: PASS')

