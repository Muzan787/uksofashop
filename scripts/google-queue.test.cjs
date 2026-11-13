// Google row states (utils/googleQueue.ts): "in the Sheet" is never "accepted".
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const file = 'src/utils/googleQueue.ts'
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module_ = { exports: {} }
vm.runInNewContext(js, { module: module_, exports: module_.exports, Boolean }, { filename: file })
const { googleRowState } = module_.exports
const click = { gclid: 'g', gbraid: null, wbraid: null }
const row = (over = {}) => ({ status: 'sheet_synced', google_import_status: 'not_verified', sheet_synced_at: '2026-10-29T00:00:00Z', acquisition: click, ...over })

test('a row in the Sheet but unchecked in Google Ads is not verified', () => {
  assert.equal(googleRowState(row(), false), 'in_sheet')
})
test('an older internal accepted flag is shown as internal, not as Google acceptance', () => {
  assert.equal(googleRowState(row({ google_import_status: 'accepted' }), false), 'internal_flag')
})
test('only an explicit verification says verified', () => {
  assert.equal(googleRowState(row({ google_import_status: 'verified' }), false), 'verified')
})
test('a row with no Google click id is staged only and never expected in Google Ads', () => {
  assert.equal(googleRowState(row({ acquisition: { gclid: null, gbraid: null, wbraid: null }, status: 'pending', sheet_synced_at: null }), false), 'no_click')
  assert.equal(googleRowState(row({ acquisition: null }), false), 'no_click')
})
test('a click id not yet in the Sheet is waiting', () => {
  assert.equal(googleRowState(row({ status: 'pending', sheet_synced_at: null }), false), 'waiting')
})
test('holds and cancelled orders block; a withdrawn import needs a retraction', () => {
  assert.equal(googleRowState(row(), true), 'blocked')
  assert.equal(googleRowState(row({ status: 'held' }), false), 'blocked')
  assert.equal(googleRowState(row({ status: 'withdrawn', google_import_status: 'adjustment_required' }), false), 'adjustment')
})
