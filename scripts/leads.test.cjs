// Leads with tabs, reviews (admin upgrade Phase 8).
//
// Replays supabase/migrations/20261015000600_leads_tabs.sql (and its
// follow-up, 20261015001821) into PGlite on a stand-in schema and checks:
//
//   * a basket reminder email can only ever be claimed once; a failed send
//     hands its claim back; nobody can change the stamp any other way;
//   * contact messages: admins read them and move them between new, replied
//     and closed; nobody else can read or change them;
//   * WhatsApp enquiries: admins can read them now, nobody else can;
//
// and, without a database, which tab Leads opens on, the addresses it builds,
// and that the pages call what they should (source checks).
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

function load(file) {
  const module = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, URLSearchParams, Date })
  return module.exports
}

const ADMIN = '11111111-1111-4111-8111-111111111111'
/** Values made inside the vm sandbox, brought into this realm for deepEqual. */
const plain = value => JSON.parse(JSON.stringify(value))

const LEAD = 'aaaaaaaa-0000-4000-8000-000000000001'
const NO_EMAIL = 'aaaaaaaa-0000-4000-8000-000000000002'
const QA = 'aaaaaaaa-0000-4000-8000-000000000003'

let db

before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create schema private;
    grant usage on schema private to authenticated;
    -- Stand-ins for the real admin checks: admin when the test says so.
    create function private.is_admin() returns boolean language sql stable
      as $$ select coalesce(current_setting('test.admin', true), '') = 'yes' $$;
    create function private.require_admin() returns void language plpgsql
      as $$ begin if not private.is_admin() then raise exception 'NOT_AUTHORISED'; end if; end $$;
    grant execute on function private.is_admin() to authenticated;

    create table public.checkout_recovery_leads (
      id uuid primary key, status text not null default 'active', data_class text not null default 'production_real',
      email_opt_in boolean not null default false, email text, reminder_emailed_at timestamptz, done_at timestamptz
    );
    alter table public.checkout_recovery_leads enable row level security;
    create policy "admin read" on public.checkout_recovery_leads for select to authenticated using ((select private.is_admin()));
    create policy "admin update" on public.checkout_recovery_leads for update to authenticated using ((select private.is_admin()));
    grant select on public.checkout_recovery_leads to authenticated;
    grant update (status, done_at, reminder_emailed_at) on public.checkout_recovery_leads to authenticated;
    insert into public.checkout_recovery_leads (id, email_opt_in, email) values ('${LEAD}', true, 'a@example.com');
    insert into public.checkout_recovery_leads (id, email_opt_in, email) values ('${NO_EMAIL}', false, null);
    insert into public.checkout_recovery_leads (id, email_opt_in, email, data_class) values ('${QA}', true, 'qa@example.com', 'qa_test');

    create table public.whatsapp_enquiries (id uuid primary key default gen_random_uuid(), reference text, created_at timestamptz default now());
    alter table public.whatsapp_enquiries enable row level security;
    create policy "service role only" on public.whatsapp_enquiries for all to anon, authenticated using (false);
    insert into public.whatsapp_enquiries (reference) values ('UKSS-WA-261015-ABC123');
  `)
  await db.exec(read('supabase/migrations/20261015000600_leads_tabs.sql'))
  await db.exec(read('supabase/migrations/20261015001821_leads_tabs_release_count.sql'))
})

async function isolated(fn) {
  await db.exec('begin')
  try {
    return await fn()
  } finally {
    await db.exec('rollback')
  }
}

/** Switches who is asking: the admin, a signed-in customer, or anyone. */
async function as(who) {
  await db.exec('reset role')
  await db.query(`select set_config('test.admin', $1, true), set_config('test.uid', $2, true)`,
    [who === 'admin' ? 'yes' : '', who === 'admin' ? ADMIN : ''])
  if (who === 'anon') await db.exec('set local role anon')
  else await db.exec('set local role authenticated')
}

async function refusal(sql, params = []) {
  await db.exec('savepoint s')
  try {
    await db.query(sql, params)
    await db.exec('release savepoint s')
    return null
  } catch (err) {
    await db.exec('rollback to savepoint s')
    return err.message
  }
}

test('a basket reminder email can only ever be claimed once', async () => {
  await isolated(async () => {
    await as('admin')
    const claimed = (await db.query(`select public.claim_lead_reminder($1) as at`, [LEAD])).rows[0].at
    assert.ok(claimed, 'the first claim stamps it')
    assert.match(await refusal(`select public.claim_lead_reminder($1)`, [LEAD]), /REMINDER_ALREADY_SENT/)
    // Nobody can clear or move the stamp directly.
    assert.match(await refusal(`update public.checkout_recovery_leads set reminder_emailed_at = null where id = $1`, [LEAD]), /permission denied/)
    await db.exec('reset role')
    assert.match(await refusal(`update public.checkout_recovery_leads set reminder_emailed_at = now() + interval '1 day' where id = $1`, [LEAD]), /REMINDER_ALREADY_SENT/)
    // The send failed: only that claim can be handed back, and then it can go.
    await as('admin')
    assert.equal((await db.query(`select public.release_lead_reminder($1, now() - interval '1 hour') as ok`, [LEAD])).rows[0].ok, false)
    assert.equal((await db.query(`select public.release_lead_reminder($1, $2) as ok`, [LEAD, claimed])).rows[0].ok, true)
    assert.ok((await db.query(`select public.claim_lead_reminder($1) as at`, [LEAD])).rows[0].at)
    // Status and Done still work as before.
    await db.query(`update public.checkout_recovery_leads set status = 'done', done_at = now() where id = $1`, [LEAD])
  })
})

test('only a lead that asked for email, and is real, can be claimed; only by an admin', async () => {
  await isolated(async () => {
    await as('admin')
    assert.match(await refusal(`select public.claim_lead_reminder($1)`, [NO_EMAIL]), /NO_EMAIL_REMINDER/)
    assert.match(await refusal(`select public.claim_lead_reminder($1)`, [QA]), /NO_EMAIL_REMINDER/)
    assert.match(await refusal(`select public.claim_lead_reminder(gen_random_uuid())`), /NOT_FOUND/)
    await as('customer')
    assert.match(await refusal(`select public.claim_lead_reminder($1)`, [LEAD]) ?? 'ALLOWED', /NOT_AUTHORISED/)
    assert.match(await refusal(`select public.release_lead_reminder($1, now())`, [LEAD]) ?? 'ALLOWED', /NOT_AUTHORISED/)
    await as('anon')
    assert.match(await refusal(`select public.claim_lead_reminder($1)`, [LEAD]) ?? 'ALLOWED', /permission denied/)
  })
})

test('contact messages: admins read them and move them between new, replied and closed', async () => {
  await isolated(async () => {
    const id = (await db.query(`insert into public.contact_messages (name, email, message) values ('Ann', 'ann@example.com', 'Do you deliver to Leeds?') returning id`)).rows[0].id
    await as('admin')
    assert.equal((await db.query(`select count(*)::int n from public.contact_messages`)).rows[0].n, 1)
    await db.query(`select public.set_contact_message_status($1, 'replied')`, [id])
    let row = (await db.query(`select status, status_changed_at is not null as stamped, status_changed_by from public.contact_messages where id = $1`, [id])).rows[0]
    assert.deepEqual(row, { status: 'replied', stamped: true, status_changed_by: ADMIN })
    await db.query(`select public.set_contact_message_status($1, 'new')`, [id])
    row = (await db.query(`select status, status_changed_at is null as cleared from public.contact_messages where id = $1`, [id])).rows[0]
    assert.deepEqual(row, { status: 'new', cleared: true })
    await db.query(`select public.set_contact_message_status($1, 'closed')`, [id])
    assert.match(await refusal(`select public.set_contact_message_status($1, 'spam')`, [id]), /BAD_STATUS/)
    assert.match(await refusal(`select public.set_contact_message_status(gen_random_uuid(), 'closed')`), /NOT_FOUND/)
    // Not even an admin writes a message, or changes one, by hand.
    assert.match(await refusal(`insert into public.contact_messages (name, email, message) values ('x', 'x@x.co', 'x')`), /permission denied/)
    assert.match(await refusal(`update public.contact_messages set status = 'new' where id = $1`, [id]), /permission denied/)

    await as('customer')
    assert.equal((await db.query(`select count(*)::int n from public.contact_messages`)).rows[0].n, 0)
    assert.match(await refusal(`select public.set_contact_message_status($1, 'new')`, [id]) ?? 'ALLOWED', /NOT_AUTHORISED/)
    await as('anon')
    assert.match(await refusal(`select * from public.contact_messages`) ?? 'ALLOWED', /permission denied/)
  })
})

test('WhatsApp enquiries: admins can read them, nobody else', async () => {
  await isolated(async () => {
    await as('admin')
    assert.equal((await db.query(`select count(*)::int n from public.whatsapp_enquiries`)).rows[0].n, 1)
    assert.match(await refusal(`insert into public.whatsapp_enquiries (reference) values ('x')`) ?? 'ALLOWED', /permission denied|row-level security/)
    await as('customer')
    assert.equal((await db.query(`select count(*)::int n from public.whatsapp_enquiries`)).rows[0].n, 0)
    await as('anon')
    assert.match(await refusal(`select * from public.whatsapp_enquiries`) ?? 'ALLOWED', /permission denied/)
  })
})

test('Leads opens on what needs doing, and old links still land', () => {
  const { pickLeadsTab, leadsHref, isLeadsTab, newEnquiriesSince, LEADS_TABS } = load('src/utils/leadsTabs.ts')
  const none = { samples: 0, messages: 0, enquiries: 0, reminders: 0, newsletter: 2 }
  assert.deepEqual(plain(LEADS_TABS.map(t => t.key)), ['samples', 'messages', 'enquiries', 'reminders', 'newsletter'])
  assert.equal(pickLeadsTab(undefined, none), 'reminders')
  assert.equal(pickLeadsTab(undefined, { ...none, enquiries: 27 }), 'enquiries')
  assert.equal(pickLeadsTab(undefined, { ...none, enquiries: 27, reminders: 3 }), 'reminders')
  assert.equal(pickLeadsTab(undefined, { ...none, enquiries: 27, reminders: 3, messages: 1 }), 'messages')
  assert.equal(pickLeadsTab(undefined, { ...none, samples: 8, messages: 1 }), 'samples')
  assert.equal(pickLeadsTab('newsletter', { ...none, samples: 8 }), 'newsletter')
  assert.equal(pickLeadsTab('nonsense', { ...none, samples: 8 }), 'samples')
  assert.equal(pickLeadsTab(undefined, { ...none, samples: 8 }, 'done'), 'reminders', '/admin/leads?view=done still lands on reminders')
  assert.equal(isLeadsTab('messages'), true)
  assert.equal(isLeadsTab('swatches'), false)
  assert.equal(leadsHref('samples'), '/admin/leads?tab=samples')
  assert.equal(leadsHref('enquiries', { q: 'UKSS-WA', page: 2, show: null }), '/admin/leads?tab=enquiries&q=UKSS-WA&page=2')
  assert.equal(newEnquiriesSince(new Date('2026-10-15T12:00:00Z')), '2026-10-14T12:00:00.000Z')
})

test('the pages do what Phase 8 says', () => {
  const contact = read('src/app/actions/contact.ts')
  assert.ok(contact.indexOf("from('contact_messages').insert") < contact.indexOf('await sendContactNotification('), 'stored, then emailed as before')
  assert.match(contact, /createAdminClient\(\)/)

  const leads = read('src/app/actions/leads.ts')
  assert.ok(leads.indexOf("rpc('claim_lead_reminder'") < leads.indexOf('await sendCheckoutReminder('), 'claimed before it is sent')
  assert.match(leads, /rpc\('release_lead_reminder'/)
  assert.doesNotMatch(leads, /update\(\{ reminder_emailed_at/)
  assert.doesNotMatch(read('src/app/admin/leads/EmailLeadButton.tsx'), /Email again/)

  assert.match(read('src/app/admin/swatches/page.tsx'), /redirect\(leadsHref\('samples'/)
  const samples = read('src/app/admin/leads/SamplesTab.tsx')
  for (const s of ['Ring or WhatsApp to take the fee, post them, then mark them posted.', 'Paid and posted', 'Back to waiting', 'question={`Cancel']) {
    assert.ok(samples.includes(s), s)
  }
  assert.match(read('src/app/admin/leads/EnquiriesTab.tsx'), /\/admin\/orders\?ref=\$\{encodeURIComponent\(e\.reference\)\}/)

  const reviews = read('src/app/actions/reviews.ts')
  assert.match(reviews, /export async function hideReview/)
  assert.match(reviews, /updateTag\('product'\)/)
  const page = read('src/app/admin/reviews/ReviewsView.tsx')
  assert.match(page, /aria-label=\{`\$\{review\.rating\} out of 5`\}/)
  assert.ok(page.includes('Publish genuine reviews, good or bad. Hide or delete only spam, abuse or private details.'))
  assert.match(page, /action=\{deleteReview\}[\s\S]{0,200}question=/, 'Delete asks first')

  const nav = load('src/utils/adminNav.ts')
  assert.equal(nav.ADMIN_SECTIONS.some(s => s.href === '/admin/swatches'), false, 'Swatches is a Leads tab now')
})
