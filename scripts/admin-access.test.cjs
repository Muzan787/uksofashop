// Admin access (admin upgrade, Phase 1).
//
// Three things that must not quietly regress:
//   1. Every server action the admin panel can call checks admin rights itself.
//      A server action is a public POST endpoint - the proxy and the admin
//      layout never see it - so a missing guard is an open door.
//   2. The sign-in page only follows `next=` to a path on this site.
//   3. The admin allowlist: a confirmed account on a listed, active address
//      becomes an admin; nobody else does. Replays the real migration into
//      PGlite against a stand-in auth schema.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

// ── 1. Every admin-reachable server action has a guard ─────────────────────

const GUARD = /\b(?:requireAdmin|adminGuard|isAdmin)\(\)/

/** Actions the panel may call without being an admin, and why. */
const PUBLIC_ACTIONS = {
  'auth:logout': 'signing out needs no rights',
}

function walk(dir) {
  const abs = path.join(root, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

/** '@/x/y' or a relative import -> a source file path relative to root. */
function resolveImport(fromFile, spec) {
  let base
  if (spec.startsWith('@/')) base = path.join('src', spec.slice(2))
  else if (spec.startsWith('.')) base = path.join(path.dirname(fromFile), spec)
  else return null
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(path.join(root, candidate)) && fs.statSync(path.join(root, candidate)).isFile()) return candidate
  }
  return null
}

const IMPORT = /import\s+(?:type\s+)?(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g

/**
 * Every file the admin panel's code can reach through local imports, and
 * every server action name imported along the way.
 */
function adminReach() {
  const entries = [...walk('src/app/admin'), ...walk('src/components/Admin')]
  const seen = new Set()
  const queue = [...entries]
  const actions = new Map() // 'file:name' -> importing file
  while (queue.length) {
    const file = queue.shift()
    if (seen.has(file)) continue
    seen.add(file)
    const src = read(file)
    for (const m of src.matchAll(IMPORT)) {
      const spec = m[3]
      const action = spec.match(/^@\/app\/actions\/([\w-]+)$/)
      if (action) {
        for (const raw of (m[2] ?? '').split(',')) {
          const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
          if (name && !/^type\s/.test(raw.trim())) actions.set(`${action[1]}:${name}`, file)
        }
        continue
      }
      const target = resolveImport(file, spec)
      // Stay inside the admin's own world: follow utils, components and
      // types it imports, but not into the storefront's app routes.
      if (target && !target.startsWith(path.join('src', 'app') + path.sep + 'actions')) queue.push(target)
    }
  }
  return { files: seen, actions }
}

function exportedBody(source, name) {
  const start = source.search(new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(`))
  if (start === -1) return null
  const rest = source.slice(start + 1)
  const next = rest.search(/\nexport\s/)
  return next === -1 ? rest : rest.slice(0, next)
}

test('every server action the admin panel imports checks admin rights itself', () => {
  const { actions } = adminReach()
  assert.ok(actions.size > 10, `expected the admin to import plenty of actions, found ${actions.size}`)
  const missing = []
  for (const [key, importer] of actions) {
    if (PUBLIC_ACTIONS[key]) continue
    const [file, name] = key.split(':')
    const source = read(path.join('src/app/actions', `${file}.ts`))
    const body = exportedBody(source, name)
    if (body === null) continue // a type or constant, not an action
    if (!GUARD.test(body)) missing.push(`${file}.ts ${name} (imported by ${importer})`)
  }
  assert.deepEqual(missing, [], `server actions with no admin guard:\n${missing.join('\n')}`)
})

test('inline server actions in admin pages only call guarded actions', () => {
  const { actions } = adminReach()
  const imported = new Set([...actions.keys()].map(k => k.split(':')[1]))
  const bad = []
  for (const file of walk('src/app/admin')) {
    const src = read(file)
    const inline = /(['"])use server\1/g
    for (const m of src.matchAll(inline)) {
      const before = src.slice(0, m.index).trim()
      if (before === '' || /^\/\/[^\n]*$/m.test(before) && !/[;{}]/.test(before)) continue // file-level directive
      const after = src.slice(m.index, m.index + 400)
      const calls = [...after.matchAll(/await\s+(\w+)\(/g)].map(c => c[1])
      if (!calls.some(c => imported.has(c)) && !GUARD.test(after)) bad.push(`${file} at ${m.index}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('admin route handlers check admin rights (the manifest is public on purpose)', () => {
  const routes = walk('src/app/admin').filter(f => /route\.ts$/.test(f) && !f.includes('manifest.webmanifest'))
  const open = routes.filter(f => !GUARD.test(read(f)))
  assert.deepEqual(open, [])
})

test('the admin layout refuses non-admins', () => {
  const layout = read('src/app/admin/layout.tsx')
  assert.match(layout, /if \(!\(await isAdmin\(\)\)\) notFound\(\)/)
})

// ── 2. Sign-in only returns to paths on this site ──────────────────────────

function load(file) {
  const module = { exports: {} }
  const js = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, URL })
  return module.exports
}

test('safeNextPath keeps same-site paths and refuses everything else', () => {
  const { safeNextPath, isAdminPath } = load('src/utils/safeRedirect.ts')
  assert.equal(safeNextPath('/admin/orders?status=all'), '/admin/orders?status=all')
  assert.equal(safeNextPath('/account#orders'), '/account#orders')
  assert.equal(safeNextPath('/'), '/')
  for (const bad of [
    'https://evil.example/', '//evil.example/x', '/\\evil.example', '\\\\evil.example',
    'javascript:alert(1)', 'admin', '', '   ', '/\n/evil.example', '/%0d%0aSet-Cookie:x', null, undefined, 42,
    '/' + 'a'.repeat(3000),
  ]) {
    const result = safeNextPath(bad)
    if (result !== null) assert.ok(result.startsWith('/') && !result.startsWith('//'), `${JSON.stringify(bad)} -> ${result}`)
    if (typeof bad === 'string' && /^(https?:|\/\/|\/\\|\\\\|javascript:)/.test(bad)) assert.equal(result, null, JSON.stringify(bad))
  }
  assert.equal(safeNextPath('/\n/evil.example'), null)
  assert.equal(isAdminPath('/admin'), true)
  assert.equal(isAdminPath('/admin/leads'), true)
  assert.equal(isAdminPath('/administer'), false)
  assert.equal(isAdminPath('/account'), false)
})

// ── 3. The allowlist ───────────────────────────────────────────────────────

let db
const ADMIN = '11111111-1111-4111-8111-111111111111'
const LISTED = '22222222-2222-4222-8222-222222222222'
const UNCONFIRMED = '33333333-3333-4333-8333-333333333333'
const STRANGER = '44444444-4444-4444-8444-444444444444'

before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create table public.admins (
      id uuid primary key references auth.users(id) on delete cascade,
      created_at timestamptz default now()
    );
    create function public.is_admin() returns boolean language sql stable security definer
      set search_path to 'public' as $$ select exists (select 1 from public.admins where id = auth.uid()) $$;
    insert into auth.users values
      ('${ADMIN}', 'Owner@Example.com', now()),
      ('${LISTED}', 'helper@example.com', now()),
      ('${UNCONFIRMED}', 'pending@example.com', null),
      ('${STRANGER}', 'shopper@example.com', now());
    insert into public.admins (id) values ('${ADMIN}');
  `)
  await db.exec(read('supabase/migrations/20261014201806_admin_allowlist.sql'))
})

const as = async (uid, sql) => {
  await db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
  return (await db.query(sql)).rows[0]
}

test('the existing admin is backfilled by address and stays an admin', async () => {
  const row = (await db.query(`select email, claimed_at is not null as claimed, is_active from public.admins`)).rows
  assert.deepEqual(row, [{ email: 'owner@example.com', claimed: true, is_active: true }])
  assert.equal((await as(ADMIN, 'select public.is_admin() a')).a, true)
})

test('a confirmed account on a listed address is linked on sign-in; others are not', async () => {
  await db.exec(`insert into public.admins (email, name) values ('helper@example.com', 'Helper'), ('pending@example.com', 'Pending')`)
  assert.equal((await as(LISTED, 'select public.is_admin() a')).a, false, 'listed but not yet claimed')
  assert.equal((await as(LISTED, 'select public.claim_admin() c')).c, true)
  assert.equal((await as(LISTED, 'select public.is_admin() a')).a, true)
  assert.equal((await as(UNCONFIRMED, 'select public.claim_admin() c')).c, false, 'unconfirmed email cannot claim')
  assert.equal((await as(UNCONFIRMED, 'select public.is_admin() a')).a, false)
  assert.equal((await as(STRANGER, 'select public.claim_admin() c')).c, false, 'unlisted address cannot claim')
  assert.equal((await as(null, 'select public.claim_admin() c')).c, false, 'signed out cannot claim')
})

test('switching an address off removes admin rights at once', async () => {
  await db.exec(`update public.admins set is_active = false where email = 'helper@example.com'`)
  assert.equal((await as(LISTED, 'select public.is_admin() a')).a, false)
  await db.exec(`update public.admins set is_active = true where email = 'helper@example.com'`)
  assert.equal((await as(LISTED, 'select public.is_admin() a')).a, true)
})

test('deleting an account unlinks its address instead of forgetting it', async () => {
  await db.exec(`delete from auth.users where id = '${LISTED}'`)
  const row = (await db.query(`select id from public.admins where email = 'helper@example.com'`)).rows[0]
  assert.equal(row.id, null)
})

test('addresses are stored lower-case and trimmed', async () => {
  await assert.rejects(db.exec(`insert into public.admins (email) values ('Mixed@Example.com')`))
  await assert.rejects(db.exec(`insert into public.admins (email) values ('not-an-address')`))
})
