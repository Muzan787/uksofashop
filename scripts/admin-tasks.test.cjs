// Admin Home "Needs doing" queue (utils/adminTasks.ts) and the sidebar groups
// (utils/adminNav.ts): every section sits in exactly one group, and the queue
// never turns an unknown into a calm zero or flags a future delivery date.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.join(__dirname, '..')
function load(file) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(js, { module, exports: module.exports, require, Math, Number }, { filename: file })
  return module.exports
}
const { buildTasks } = load('src/utils/adminTasks.ts')
const nav = load('src/utils/adminNav.ts')

const none = { waitingToConfirm: 0, oldestWaitingDays: null, metaEligible: 0, metaSoonestHours: null, overdueDeliveries: 0, googleUnverified: 0, failedEmails: 0, leadsWaiting: 0 }
const keys = tasks => JSON.stringify(tasks.map(t => t.key))

test('nothing waiting means an empty queue', () => {
  assert.equal(buildTasks(none).length, 0)
})

test('a Meta event close to the 7-day limit is urgent and listed first', () => {
  const tasks = buildTasks({ ...none, metaEligible: 2, metaSoonestHours: 20, waitingToConfirm: 1, oldestWaitingDays: 1 })
  assert.equal(tasks[0].key, 'meta')
  assert.equal(tasks[0].tone, 'urgent')
  assert.match(tasks[0].detail, /20 h/)
  assert.equal(tasks[0].href, '/admin/meta?queue=eligible')
})

test('a Meta event with days left is a normal task, not an alarm', () => {
  const t = buildTasks({ ...none, metaEligible: 1, metaSoonestHours: 120 })[0]
  assert.equal(t.tone, 'attention')
  assert.match(t.detail, /5 days left/)
})

test('a fact that could not be loaded is shown as unknown, never as zero', () => {
  const t = buildTasks({ ...none, metaEligible: null })[0]
  assert.equal(t.key, 'meta')
  assert.equal(t.count, null)
  assert.match(t.title, /could not be checked/)
})

test('an unconfirmed order older than three days is urgent', () => {
  assert.equal(buildTasks({ ...none, waitingToConfirm: 1, oldestWaitingDays: 4 })[0].tone, 'urgent')
  assert.equal(buildTasks({ ...none, waitingToConfirm: 1, oldestWaitingDays: 1 })[0].tone, 'attention')
})

test('overdue means the customer date has passed: the queue only reports the count it is given', () => {
  const t = buildTasks({ ...none, overdueDeliveries: 2 })[0]
  assert.equal(t.key, 'overdue')
  assert.match(t.detail, /A later date is never flagged/)
})

test('urgent tasks come before attention and information', () => {
  const tasks = buildTasks({ ...none, leadsWaiting: 5, googleUnverified: 2, waitingToConfirm: 1, oldestWaitingDays: 1, failedEmails: 1 })
  assert.equal(keys(tasks), JSON.stringify(['email', 'confirm', 'google', 'leads']))
})

test('Google imports are described as not verified, never as accepted', () => {
  const t = buildTasks({ ...none, googleUnverified: 1 })[0]
  assert.match(t.title, /not yet verified/)
  assert.match(t.detail, /not the same as accepted/)
})

test('every admin section sits in exactly one sidebar group', () => {
  const placed = nav.ADMIN_GROUPS.flatMap(g => g.keys)
  const sections = nav.ADMIN_SECTIONS.map(s => s.key)
  assert.equal(placed.length, new Set(placed).size, 'no section is listed twice')
  assert.equal(JSON.stringify([...placed].sort()), JSON.stringify([...sections].sort()), 'no section is missing')
})
