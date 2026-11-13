// Seasonal wording (utils/seasonal.ts): dates are real, UK-timezone based, and
// nothing in the copy invents a sale, a price, a deadline or a Christmas promise.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const file = 'src/utils/seasonal.ts'
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const m = { exports: {} }
vm.runInNewContext(js, { module: m, exports: m.exports, Intl, Date, Math }, { filename: file })
const s = m.exports
const at = iso => new Date(iso)

test('the 2026 dates are the real ones and fall on the right weekdays', () => {
  assert.equal(new Date(s.BLACK_FRIDAY + 'T12:00:00Z').getUTCDay(), 5, 'Black Friday is a Friday')
  assert.equal(new Date(s.CYBER_MONDAY + 'T12:00:00Z').getUTCDay(), 1, 'Cyber Monday is a Monday')
  assert.equal(new Date(s.CHRISTMAS_DAY + 'T12:00:00Z').getUTCDay(), 5)
  assert.equal(new Date(s.SEASON_START + 'T12:00:00Z').getUTCDay(), 6, 'the early season starts on Saturday 14 Nov')
})

test('phases follow the UK calendar day', () => {
  assert.equal(s.seasonPhase(at('2026-11-13T12:00:00Z')), 'off')
  assert.equal(s.seasonPhase(at('2026-11-14T00:30:00Z')), 'run_up')
  assert.equal(s.seasonPhase(at('2026-11-26T23:30:00Z')), 'run_up')
  assert.equal(s.seasonPhase(at('2026-11-27T00:00:00Z')), 'black_friday')
  assert.equal(s.seasonPhase(at('2026-11-30T22:00:00Z')), 'black_friday')
  assert.equal(s.seasonPhase(at('2026-12-01T00:00:00Z')), 'christmas')
  assert.equal(s.seasonPhase(at('2026-12-25T18:00:00Z')), 'christmas')
  assert.equal(s.seasonPhase(at('2026-12-26T00:00:00Z')), 'off')
})

test('UK clocks: 23:30 UTC in summer time is already the next UK day, in winter it is not', () => {
  assert.equal(s.ukDateKey(at('2026-07-01T23:30:00Z')), '2026-07-02')
  assert.equal(s.ukDateKey(at('2026-12-01T23:30:00Z')), '2026-12-01')
})

test('days until Black Friday counts calendar days', () => {
  assert.equal(s.daysUntil(s.BLACK_FRIDAY, at('2026-11-14T10:00:00Z')), 13)
  assert.equal(s.daysUntil(s.BLACK_FRIDAY, at('2026-11-27T10:00:00Z')), 0)
})

test('no seasonal sentence states a price, a discount figure, a stock level or a Christmas guarantee', () => {
  const words = []
  for (const phase of ['run_up', 'black_friday', 'christmas']) {
    words.push(s.seasonBarText(phase))
    const strip = s.seasonStrip(phase)
    words.push(strip.eyebrow, strip.headline, strip.body, strip.cta)
  }
  const all = words.join(' \n ')
  assert.doesNotMatch(all, /£\s?\d/, 'no pound figure is invented here')
  assert.doesNotMatch(all, /\d+\s?%/, 'no percentage is invented here')
  assert.doesNotMatch(all, /only \d+ left|selling fast|last chance|hurry/i, 'no scarcity or pressure wording')
  assert.doesNotMatch(all, /guaranteed? (by|before|for) christmas|order by \d/i, 'no Christmas guarantee or cut-off')
})

test('off-season there is no bar text, no strip and no link', () => {
  assert.equal(s.seasonBarText('off'), null)
  assert.equal(s.seasonStrip('off'), null)
  assert.equal(s.seasonHref('off'), null)
})

test('Monday is the one day without delivery', () => {
  assert.equal(s.isDeliveryDay('2026-11-30'), false)
  assert.equal(s.isDeliveryDay('2026-11-27'), true)
})
