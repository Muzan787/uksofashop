// Runs actual Server Action, consent resolver, conversion reporter and captured
// production PL/pgSQL in isolated PostgreSQL WASM. No network/provider requests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const assert=require('node:assert/strict'),{test,before,after}=require('node:test')
const ts=require('typescript'),{PGlite}=require('@electric-sql/pglite'),{z}=require('zod')
const root=path.join(__dirname,'..'),variant='22222222-2222-4222-8222-222222222222'
const visitor='33333333-3333-4333-8333-333333333333',session='44444444-4444-4444-8444-444444444444',arrival='55555555-5555-4555-8555-555555555555'
let db
function load(file,mocks,extra=''){
 const m={exports:{}}
 const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8')+'\n'+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(js,{module:m,exports:m.exports,require(n){if(n in mocks)return mocks[n];throw Error(n)},Date,Intl,console:{error(){},warn(){}}})
 return m.exports
}
// A transport adapter only: filters, updates, RPCs and row inheritance execute
// in PostgreSQL rather than implementing the business rules in a mock.
class Query {
 constructor(table){this.table=table;this.filters=[];this.args=[];this.columns='*';this.mode='select'}
 value(v){this.args.push(v);return '$'+this.args.length}
 select(c){this.columns=c;return this}
 eq(c,v){this.filters.push(c+'='+this.value(v));return this}
 is(c,v){assert.equal(v,null);this.filters.push(c+' is null');return this}
 lte(c,v){this.filters.push(c+'<='+this.value(v));return this}
 gte(c,v){this.filters.push(c+'>='+this.value(v));return this}
 gt(c,v){this.filters.push(c+'>'+this.value(v));return this}
 or(v){assert.equal(v,'ad_storage.neq.granted,ad_user_data.neq.granted,ad_personalization.neq.granted');this.filters.push("(ad_storage<>'granted' or ad_user_data<>'granted' or ad_personalization<>'granted')");return this}
 order(c,o){this.sort=c+(o.ascending?' asc':' desc');return this}
 limit(n){this.max=n;return this}
 update(v){this.mode='update';this.values=v;return this}
 insert(v){this.mode='insert';this.values=v;return this}
 upsert(v,options){this.mode='insert';this.values=v;this.conflict=options.onConflict;return this}
 async execute(single=false){try{
  const where=this.filters.length?' where '+this.filters.join(' and '):''
  let sql
  if(this.mode==='select')sql='select '+this.columns+' from '+this.table+where+(this.sort?' order by '+this.sort:'')+(this.max?' limit '+this.max:'')
  else if(this.mode==='update')sql='update '+this.table+' set '+Object.entries(this.values).map(([k,v])=>k+'='+this.value(v)).join(',')+where+' returning *'
  else {
   const rows=Array.isArray(this.values)?this.values:[this.values],keys=[...new Set(rows.flatMap(Object.keys))]
   sql='insert into '+this.table+'('+keys.join(',')+') values '+rows.map(r=>'('+keys.map(k=>this.value(r[k]??null)).join(',')+')').join(',')+(this.conflict?' on conflict('+this.conflict+') do nothing':'')+' returning *'
  }
  const {rows}=await db.query(sql,this.args);return {data:single?(rows[0]??null):rows,error:null}
 }catch(error){return {data:null,error:{message:error.message}}}}
 single(){return this.execute(true)}
 maybeSingle(){return this.execute(true)}
 then(a,b){return this.execute().then(a,b)}
}
const client={from:t=>new Query(t),async rpc(name,args){
 if(name==='google_phase2b_attach_whatsapp')return {data:null,error:null}
 const keys=Object.keys(args),sql='select '+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') as result'
 try{const {rows}=await db.query(sql,Object.values(args));return {data:rows[0].result,error:null}}catch(error){return {data:null,error:{message:error.message}}}
}}
const action=()=>load('src/app/actions/manual-order.ts',{
 'zod':{z},'next/server':{after(){}},'next/cache':{revalidatePath(){}},
 '@/utils/googleMeasurement':{GOOGLE_GTM_ENABLED:true},'@/utils/supabase/admin':{createAdminClient:()=>client,createUntypedAdminClient:()=>client},
 '@/utils/supabase/server':{createClient:async()=>client},'@/utils/email':{},'@/utils/delivery':{isValidAgreedDeliveryDate:()=>true},
 '@/utils/auth':{isAdmin:async()=>true},'@/utils/phone':{isValidUkMobile:()=>true,UK_MOBILE_ERROR:'Invalid'},
 '@/utils/attribution/whatsapp':{isValidWhatsAppReference:r=>/^UKSS-WA-\d{6}-[A-Z0-9]{6}$/i.test(r)},
 '@/utils/attribution/lead':{normaliseLeadReference:r=>{const c=(r||'').trim().toUpperCase();return /^UKSS-LD-\d{6}-[A-Z0-9]{6}$/.test(c)?c:null}},
},'exports.resolveForTest=resolveWhatsAppMatch;exports.timeForTest=localWallClockToUtc;')
const consent=()=>load('src/utils/metaOrderConsent.ts',{'server-only':{},'@/utils/supabase/admin':{createUntypedAdminClient:()=>client}})
const input={customerName:'Fixture Person',customerEmail:'',customerPhone:'07123456789',shippingAddress:'Fixture address',postcode:'BB1 1AA',deliveryCharge:0,items:[{variant_id:variant,quantity:1,unit_price:null}]}
const contact={date:'2026-10-07',hour:3,minute:0,meridiem:'PM',timezone:'Asia/Karachi'}
const migration=n=>fs.readFileSync(path.join(__dirname,'../supabase/migrations/'+n),'utf8')
// In order, as they were applied. 201013 adds p_lead_reference with the naive
// attribution lookup; 202143 is the correction to it. Replaying both is what
// proves the folder still reproduces the live function.
const LEAD_MIGRATIONS=['20261008200911_lead_reference.sql','20261008201013_place_manual_order_lead_reference.sql','20261008202143_lead_attribution_pick_richest_session.sql']
// Only the two that (re)define the function. The first one alters the leads
// table, and ALTER TABLE ... ADD CONSTRAINT is not idempotent, so replaying it
// to undo the baseline fixture would fail on the second pass.
const LEAD_FUNCTION_MIGRATIONS=LEAD_MIGRATIONS.slice(1)
before(async()=>{db=new PGlite();await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/tracking-schema.sql'),'utf8'));await db.exec(migration('20261008105105_manual_order_unused_enquiry_guard.sql'));for(const m of LEAD_MIGRATIONS)await db.exec(migration(m))})
after(async()=>{await db.close()})
async function reset(){await db.exec('truncate orders,order_items,whatsapp_enquiries,attribution_sessions,google_consent_receipts,conversion_events,google_offline_conversions')}
async function click(suffix,time='2026-10-07T09:58:00Z',converted=null){
 const reference='UKSS-WA-261007-'+suffix
 await db.query('insert into whatsapp_enquiries(reference,created_at,visitor_id,session_id,arrival_id,utm_source,gclid,gbraid,wbraid,meta_fbp,meta_fbc,converted_order_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[reference,time,visitor,session,arrival,'google','fixture-gclid','fixture-gbraid','fixture-wbraid','fixture-fbp','fixture-fbc',converted]);return reference
}
async function order(){const {rows}=await db.query('select * from orders order by created_at desc limit 1');return rows[0]}
async function choice(value='granted',time='2026-10-07T09:55:00Z',analytics='granted'){
 await db.query('insert into google_consent_receipts(visitor_id,session_id,arrival_id,ad_storage,ad_user_data,ad_personalization,analytics_storage,captured_at,policy_version,surface) values($1,$2,$3,$4,$4,$4,$5,$6,$7,$8)',[visitor,session,arrival,value,analytics,time,'ukss-google-2026-09-27-v1','cookie_banner'])
}
function reporter(outcome='accepted'){
 const sends=[],google=[]
 const mod=load('src/utils/orderConversions.ts',{'server-only':{},'@/utils/metaCapi':{sendCapiEvent:async e=>{sends.push(e);return {outcome,http_status:outcome==='rejected'?400:200,events_received:outcome==='accepted'?1:undefined}}},
 '@/utils/ga4Server':{sendGa4Event:async()=>{},clientIdFromGaCookie:v=>v},'@/constants/site':{SITE_URL:'https://www.uksofashop.co.uk'},'@/utils/trackingEnv':{isServerTrackingEnabled:()=>true},
 '@/utils/supabase/admin':{createAdminClient:()=>client},'./googleServer':{reportGooglePurchase:async id=>google.push(id)},'./googleMeasurement':{GOOGLE_GTM_ENABLED:true},'./metaOrderConsent':consent()})
 return {mod,sends,google}
}
async function confirmed(){await db.exec("update orders set status='confirmed',confirmed_at=now()-interval '1 hour'");return order()}
test('A exact reference has priority over another closer contact-time candidate',async()=>{await reset();const ref=await click('EXACT1','2026-10-07T09:51:00Z');await click('CLOSE1');const r=await action().createWhatsAppOrder({...input,whatsappReference:ref,contactTime:contact});assert.equal(r.attributionMatch.reference,ref);assert.equal((await order()).whatsapp_reference,ref)})
test('B missing reference chooses closest unused backwards click, never a future click',async()=>{await reset();await click('OLDER1','2026-10-07T09:51:00Z');const ref=await click('CLOSE1');await click('FUTURE','2026-10-07T10:01:00Z');const r=await action().createWhatsAppOrder({...input,contactTime:contact});assert.equal(r.attributionMatch.reference,ref);assert.equal(r.attributionMatch.gapMinutes,2)})
test('C actual first-contact time remains authority when order is entered much later',async()=>{await reset();const ref=await click('EARLY1');const r=await action().createWhatsAppOrder({...input,contactTime:contact});assert.equal(r.attributionMatch.reference,ref);assert(Date.parse((await order()).created_at)-Date.parse('2026-10-07T10:00:00Z')>3600000)})
test('D outside-window clicks remain unmatched; an operational order still saves',async()=>{await reset();await click('OLD111','2026-10-07T09:49:59Z');const r=await action().createWhatsAppOrder({...input,contactTime:contact});assert(r.success);assert.equal(r.attributionMatch,null);assert.equal((await order()).visitor_id,null)})
test('E converted enquiries cannot be reused by fallback OR exact-reference RPC',async()=>{await reset();const prior='66666666-6666-4666-8666-666666666666',ref=await click('USED11',undefined,prior);const fallback=await action().createWhatsAppOrder({...input,contactTime:contact});assert.equal(fallback.attributionMatch,null);const exact=await action().createWhatsAppOrder({...input,whatsappReference:ref});assert(exact.success);assert.equal((await order()).visitor_id,null);assert.equal((await db.query('select converted_order_id from whatsapp_enquiries')).rows[0].converted_order_id,prior)})
test('F/I real function inherits original identifiers and session first/last touch without guesses',async()=>{await reset();const ref=await click('LINK11');await db.query('insert into attribution_sessions values($1,$2,$3)',[session,{source:'fixture-first'},{source:'fixture-last'}]);await action().createWhatsAppOrder({...input,whatsappReference:ref});const o=await order();assert.equal(o.visitor_id,visitor);assert.equal(o.session_id,session);assert.equal(o.arrival_id,arrival);for(const k of ['gclid','gbraid','wbraid'])assert.equal(o[k],'fixture-'+k);assert.equal(o.utm_source,'google');const s=(await db.query('select s.* from attribution_sessions s join orders o on o.session_id=s.id')).rows[0];assert.equal(s.first_touch.source,'fixture-first');assert.equal(s.last_touch.source,'fixture-last')})
test('G eligible manual order sends normal Meta Purchase, real lifecycle time, GBP and stable IDs once',async()=>{await reset();const ref=await click('GRANT1');await action().createWhatsAppOrder({...input,whatsappReference:ref});await choice();const o=await confirmed(),r=reporter();await Promise.all([r.mod.reportOrderConversion(o.id,'purchase'),r.mod.reportOrderConversion(o.id,'purchase')]);assert.equal(r.sends.length,1);const e=r.sends[0];assert.equal(e.eventName,'Purchase');assert.equal(e.actionSource,'chat');assert.equal(e.eventId,o.purchase_event_id);assert.equal(e.eventTime,Math.floor(Date.parse(o.confirmed_at)/1000));assert.equal(e.currency,'GBP');assert.equal(e.value,799);assert.equal(e.contents[0].id,variant);assert.equal(e.user.fbp,'fixture-fbp');const ledger=(await db.query("select * from conversion_events where platform='meta'")).rows[0];assert.equal(ledger.status,'sent');assert.equal(ledger.response_metadata.outcome,'accepted')})
test('H denial/withdrawal prevents advertising dispatch without losing order, attribution or Google staging',async()=>{for(const withdrawn of [false,true]){await reset();const ref=await click('DENY11');await action().createWhatsAppOrder({...input,whatsappReference:ref});if(withdrawn)await choice();await choice('denied','2026-10-07T09:59:00Z');const o=await confirmed(),r=reporter();await r.mod.reportOrderConversion(o.id,'purchase');assert.equal(r.sends.length,0);const saved=await order();assert.equal(saved.visitor_id,visitor);assert.equal(saved.status,'confirmed');assert.equal(saved.purchase_event_sent_at,null);assert.equal((await db.query('select count(*)::int n from google_offline_conversions')).rows[0].n,1)}})
test('J rejected/ambiguous CAPI cannot change independent Google staging or legacy operational sent status',async()=>{for(const result of ['rejected','ambiguous']){await reset();const ref=await click('REJECT');await action().createWhatsAppOrder({...input,whatsappReference:ref});await choice();const o=await confirmed(),r=reporter(result);await r.mod.reportOrderConversion(o.id,'purchase');assert.equal((await db.query('select count(*)::int n from google_offline_conversions')).rows[0].n,1);assert.equal(r.google.length,1);const l=(await db.query("select * from conversion_events where platform='meta'")).rows[0];assert.equal(l.status,'sent');assert.equal(l.response_metadata.outcome,result);assert((await order()).purchase_event_sent_at)}})
test('K/L receipt and lifecycle processing leave an unused contact match unchanged; PK/BST/GMT remain correct',async()=>{await reset();const ref=await click('ORDER1','2026-10-07T09:51:00Z');await action().createWhatsAppOrder({...input,whatsappReference:ref});const candidate=await click('STABLE');await choice();const a=action(),before=await a.resolveForTest(undefined,contact);assert.equal(before.reference,candidate);const o=await confirmed(),r=reporter('ambiguous');await r.mod.reportOrderConversion(o.id,'purchase');await db.exec("update orders set delivered_at=now()-interval '1 hour'");await r.mod.reportOrderConversion(o.id,'delivered');const after=await a.resolveForTest(undefined,contact);assert.equal(JSON.stringify(before),JSON.stringify(after));assert.equal(a.timeForTest({...contact,timezone:'Europe/London',hour:11,meridiem:'AM'}).toISOString(),'2026-10-07T10:00:00.000Z');assert.equal(a.timeForTest({...contact,date:'2026-12-07',timezone:'Europe/London',hour:10,meridiem:'AM'}).toISOString(),'2026-12-07T10:00:00.000Z')})
test('consent uses actual advertising grant without Google attachment or analytics coupling; missing choice cannot fabricate permission',async()=>{await reset();const ref=await click('CONSNT');await action().createWhatsAppOrder({...input,whatsappReference:ref});const o=await order();assert.equal((await consent().orderAdvertisingConsent(o)).allowed,false);await choice('granted',undefined,'denied');assert.equal((await consent().orderAdvertisingConsent(o)).allowed,true);await choice('denied',new Date().toISOString());assert.equal((await consent().orderAdvertisingConsent(o)).allowed,false)})
test('invalid/future/aged lifecycle times do not send or claim Meta; delivered retains distinct ID',async()=>{await reset();const ref=await click('TIMING');await action().createWhatsAppOrder({...input,whatsappReference:ref});await choice();let o=await confirmed();const r=reporter();for(const expression of ["now()+interval '1 day'","now()-interval '8 days'"]){await db.exec('update orders set confirmed_at='+expression);await r.mod.reportOrderConversion(o.id,'purchase');assert.equal(r.sends.length,0);assert.equal((await order()).purchase_event_sent_at,null)}await db.exec("update orders set delivered_at=now()-interval '2 hours'");o=await order();await r.mod.reportOrderConversion(o.id,'delivered');assert.equal(r.sends[0].eventName,'OrderDelivered');assert.equal(r.sends[0].eventId,o.purchase_event_id+'-delivered');assert.equal(r.sends[0].eventTime,Math.floor(Date.parse(o.delivered_at)/1000))})
test('baseline reproduction proves converted-reference defect; restored guard enforces intended rule',async()=>{await reset();await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/place-manual-order-before.sql'),'utf8'));const prior='66666666-6666-4666-8666-666666666666',ref=await click('BEFORE',undefined,prior);await action().createWhatsAppOrder({...input,whatsappReference:ref});assert.equal((await order()).visitor_id,visitor);assert.notEqual((await db.query('select converted_order_id from whatsapp_enquiries')).rows[0].converted_order_id,prior);await db.exec(migration('20261008105105_manual_order_unused_enquiry_guard.sql'));for(const m of LEAD_FUNCTION_MIGRATIONS)await db.exec(migration(m))})

test('eligible website order preserves website action source, customer browser identity, stable GBP Purchase',async()=>{await reset();const ref=await click('WEB111');await action().createWhatsAppOrder({...input,whatsappReference:ref});await choice();await db.exec("update orders set source='website',customer_user_agent='fixture-customer-UA',customer_ip='192.0.2.1'");const o=await confirmed(),r=reporter();await r.mod.reportOrderConversion(o.id,'purchase');assert.equal(r.sends.length,1);const e=r.sends[0];assert.equal(e.actionSource,'website');assert.equal(e.eventSourceUrl,'https://www.uksofashop.co.uk/checkout');assert.equal(e.user.userAgent,'fixture-customer-UA');assert.equal(e.user.clientIp,'192.0.2.1');assert.equal(e.eventId,o.purchase_event_id);assert.equal(e.value,799);assert.equal(e.currency,'GBP')})
