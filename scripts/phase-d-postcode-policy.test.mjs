import assert from 'node:assert/strict'
import { classifyDeliveryPostcode, normalisePostcode } from '../src/utils/postcode.ts'

function zone(postcode, addresses = []) {
  const result = classifyDeliveryPostcode(postcode, addresses)
  if (result.kind !== 'classified') return result.kind
  return result.zone
}

function expectMainland(postcode, addresses = []) {
  assert.equal(zone(postcode, addresses), 'MAINLAND_STANDARD', `${postcode} should be mainland standard`)
}

function expectQuote(postcode, addresses = []) {
  assert.equal(zone(postcode, addresses), 'CUSTOM_QUOTE', `${postcode} should require a custom quote`)
}

function expectInvalid(postcode) {
  const result = classifyDeliveryPostcode(postcode)
  assert.equal(result.kind, 'invalid', `${postcode} should be invalid in the UK-only postcode form`)
}

// England, Wales and clearly mainland Scotland.
expectMainland('BB6 7LS')
expectMainland('SW1A 1AA')
expectMainland('CF10 1EP')
expectMainland('EH1 1YZ')
expectMainland('PA35 1JE') // old PA20-78 blanket must not block mainland Taynuilt area
expectMainland('PA80 5XT') // Morvern mainland, not an island postcode
expectMainland('IV52 8TL') // Plockton mainland
expectMainland('IV53 8...'.replace('...', 'TR')) // Strome Ferry mainland regression shape
expectMainland('IV54 8XN') // Applecross/Strathcarron mainland

// Northern Ireland, Crown Dependencies and England offshore islands.
expectQuote('BT1 5GS')
expectQuote('IM1 1AA')
expectQuote('JE2 3AA')
expectQuote('GY1 1AA')
expectQuote('PO30 1UD')
expectQuote('TR21 0LL')

// Scottish island-only areas/districts.
expectQuote('HS1 2XX')
expectQuote('ZE1 0AA')
expectQuote('KW15 1AA')
expectQuote('KA27 8AA')
expectQuote('PH42 4RL')
expectQuote('PA20 0AA')
expectQuote('PA41 7AA')
expectQuote('PA75 6QA')
expectQuote('IV51 9AA') // Skye regression: old implementation incorrectly fell through mainland
expectQuote('IV55 8AA')

// Mixed geography districts: without trusted lookup evidence they fail closed.
assert.equal(classifyDeliveryPostcode('IV40 8AE').kind, 'ambiguous')
expectMainland('IV40 8AE', ['Kyle Medical Practice, Station Road, Kyle of Lochalsh, IV40 8AE'])
expectQuote('IV40 8PB') // exact Raasay unit, no customer-entered address needed
assert.equal(classifyDeliveryPostcode('PA34 5AB').kind, 'ambiguous')
expectMainland('PA34 5AB', ['54 Esplanade, Oban, Argyll, PA34 5AB'])
expectQuote('PA34 4UB', ['Cullipool, Isle of Luing, Oban, PA34 4UB'])
expectQuote('PA34 4TB', ['Easdale Island, Oban, PA34 4TB'])

// Special/non-geographic/overseas Royal-Mail-style formats must never inherit mainland.
expectQuote('ASCN 1ZZ')
expectQuote('STHL 1ZZ')
expectQuote('FIQQ 1ZZ')
expectQuote('PCRN 1ZZ')
expectQuote('GX11 1AA')
expectQuote('BF1 0AA')
expectQuote('BX1 1LT')

// Republic of Ireland uses Eircodes and is outside this UK-only checkout.
expectInvalid('D02 X285')
expectInvalid('ABC 123')

assert.equal(normalisePostcode('bb67ls'), 'BB6 7LS')

console.log('Offer Phase D postcode policy matrix: PASS')
