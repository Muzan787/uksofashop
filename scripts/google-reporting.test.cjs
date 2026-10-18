const {test}=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const {PGlite}=require('@electric-sql/pglite'),ts=require('typescript')
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8')
const migration=read('supabase/migrations/20261018104539_google_reporting_holds_and_sessions.sql')
const oid='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222'
function load(file,mocks={}) {const m={exports:{}};vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require(n){if(n in mocks)return mocks[n];throw Error(n)},Date,Number,Math,Promise});return m.exports}
const session=load('src/utils/googleSession.ts')
test('only actual supported Google cookies yield recent session IDs; UUIDs and future/stale IDs fail closed',()=>{
 const now=1792324800000,id=String(Math.floor(now/1000)-30)
 assert.equal(session.googleSessionId('GS1.1.'+id+'.2.1.123.0.0.0',now),id)
 assert.equal(session.googleSessionId('GS2.1.s'+id+'$o2$g1$t123$j60',now),id)
 for(const cookie of [undefined,'',oid,'GS2.1.s9999999999$o1','GS1.1.1000000000.1','GS2.1.o1$s'+id])assert.equal(session.googleSessionId(cookie,now),null)
})
test('purchase session must match GA client, real conversion time and 24-hour send deadline',()=>{
 const now=1792324800000,id=String(now/1000-60),at=new Date(now-1000).toISOString()
 assert.equal(session.googlePurchaseSession(id,'123.456','123.456',at,now).session_id,Number(id))
 for(const args of [[oid,'123.456','123.456',at,now],[id,'111.222','123.456',at,now],[id,'123.456','123.456','bad',now],[id,'123.456','123.456',new Date(now+1000).toISOString(),now],[id,'123.456','123.456',at,now+86400000]]) assert.equal(Object.keys(session.googlePurchaseSession(...args)).length,0)
})
test('actual purchase reporter sends the consent-linked session and committed GBP receipt; missing context never invents a session',async()=>{
 for(const linked of [true,false]) {
  const sends=[],updates=[],now=Date.now(),id=String(Math.floor(now/1000)-60)
  const db={async rpc(){return {data:[{ga_client_id:'123.456',conversion_time:new Date(now-1000).toISOString(),ad_user_data:'granted',ad_personalization:'granted'}]}},from(table){
   const q={select(){return q},eq(){return q},update(v){updates.push(v);return q},async single(){return {data:{total_amount:879,items_subtotal:899,discount_amount:20,delivery_total:0,order_items:[{variant_id:rid,quantity:1,price_at_time_of_purchase:899,product_variants:{products:{title:'Fixture Sofa'}}}]}}},async maybeSingle(){return {data:table==='google_order_consent'?{receipt_id:rid}:linked?{ga_session_id:id,ga_session_client_id:'123.456'}:null}},then(fn){return Promise.resolve({error:null}).then(fn)}};return q}}
  const reporter=load('src/utils/googleServer.ts',{'server-only':{},'./supabase/admin':{createUntypedAdminClient:()=>db},'./googleMeasurement':{GOOGLE_GTM_ENABLED:true},'./ga4Server':{clientIdFromGaCookie:()=>null,isGa4ServerConfigured:()=>true,sendGa4Event:async e=>{sends.push(e);return 'transport_accepted'}},'./trackingEnv':{isServerTrackingEnabled:()=>true},'./trackingMode':{getTrackingMode:async()=> 'live'},'./googleSession':session})
  await reporter.reportGooglePurchase(oid)
  assert.equal(sends.length,1);assert.equal(sends[0].params.currency,'GBP');assert.equal(sends[0].params.value,879);assert.equal(sends[0].params.transaction_id,'11111111');assert.equal(sends[0].params.session_id,linked?Number(id):undefined)
  assert.equal(updates.at(-1).status,'transport_accepted')
 }
})
test('production SQL reproduces held-order leak, then blocks staging, GA4 claiming and existing-sheet export; ordinary orders still work',async()=>{
 const db=new PGlite()
 try {
  const fixture=read('scripts/fixtures/google-reporting-before.sql'),foundation=read('supabase/migrations/20260927095449_google_tracking_phase2b_foundation.sql')
  await db.exec(fixture.slice(0,fixture.indexOf('CREATE OR REPLACE FUNCTION')))
  await db.exec(foundation.slice(foundation.indexOf('create table public.google_phase2b_config'),foundation.indexOf('create function public.google_phase2b_stage')))
  await db.exec(fixture.slice(fixture.indexOf('CREATE OR REPLACE FUNCTION')))
  await db.exec("update google_phase2b_config set eligible_from=now()-interval '1 day'")
  await db.query('insert into orders(id) values($1)',[oid])
  await db.query("insert into google_consent_receipts(id,decision_id,visitor_id,session_id,arrival_id,ad_storage,analytics_storage,ad_user_data,ad_personalization,captured_at,policy_version,surface,reason) values($1,$1,$1,$1,$1,'granted','granted','granted','granted',now()-interval '2 hours','ukss-google-2026-09-27-v1','cookie_banner','granted')",[rid])
  await db.query('insert into google_order_consent(order_id,receipt_id) values($1,$2)',[oid,rid])
  await db.query("insert into meta_signal_holds values($1,'dont_send')",[oid])
  await db.query('select google_phase2b_stage($1)',[oid])
  const q=(await db.query('select id from google_conversion_outbox')).rows[0].id
  assert((await db.query('select google_phase2b_sheet_payload($1) payload',[q])).rows[0].payload)
  assert.equal((await db.query('select * from google_phase2b_claim_ga4($1)',[oid])).rows.length,1)
  await db.exec('delete from google_ga4_delivery')
  await db.exec(migration)
  assert.equal((await db.query('select google_phase2b_sheet_payload($1) payload',[q])).rows[0].payload,null)
  assert.equal((await db.query('select * from google_phase2b_claim_ga4($1)',[oid])).rows.length,0)
  await db.exec('delete from google_conversion_outbox')
  for(const state of ['held','dont_send']){
   await db.query('update meta_signal_holds set state=$1',[state]);await db.query('select google_phase2b_stage($1)',[oid])
   assert.equal((await db.query('select count(*)::int n from google_conversion_outbox')).rows[0].n,0)
  }
  await db.exec('delete from meta_signal_holds')
  await db.query('select google_phase2b_stage($1)',[oid])
  const active=(await db.query('select id from google_conversion_outbox')).rows[0].id
  assert((await db.query('select google_phase2b_sheet_payload($1) payload',[active])).rows[0].payload)
  await db.exec('update orders set is_test=true')
  assert.equal((await db.query('select * from google_phase2b_claim_ga4($1)',[oid])).rows.length,0)
  assert.equal((await db.query('select google_phase2b_sheet_payload($1) payload',[active])).rows[0].payload,null)
  await db.exec('update orders set is_test=false')
  assert.equal((await db.query('select * from google_phase2b_claim_ga4($1)',[oid])).rows.length,1)
  assert.equal((await db.query('select * from google_phase2b_claim_ga4($1)',[oid])).rows.length,0)
  await db.exec("update orders set cancelled_at=now(),status='cancelled'")
  assert.equal((await db.query('select google_phase2b_sheet_payload($1) payload',[active])).rows[0].payload,null)
 } finally {await db.close()}
})
