const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
const { createHash, randomUUID } = require('node:crypto')
const path = require('node:path')
function load(relative, mocks = {}, globals = {}, env = {}) {
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}}
  vm.runInNewContext(js, {module,exports:module.exports,
    require(name){if(name in mocks)return mocks[name];throw new Error('Unexpected import '+name)},
    process:{env},URL,URLSearchParams,Date,Number,console:{error(){},warn(){}},
    crypto:{randomUUID}, ...globals}, {filename:relative})
  return module.exports
}
const capiMocks={'server-only':{},crypto:{createHash},
  '@/utils/phone':{normaliseUkMobile:p=>p.startsWith('07')?'44'+p.slice(1):p},
  '@/utils/trackingEnv':{isServerTrackingEnabled:()=>true}}
const env={META_PIXEL_ID:'fixture_dataset',META_CAPI_ACCESS_TOKEN:'fixture_secret'}
const event={eventName:'Purchase',eventId:'fixture_event',eventTime:1790824320,
  user:{email:' Example@Example.test ',phone:'07123456789',externalId:'fixture_visitor'},value:799,currency:'GBP'}
test('CAPI preserves business time and hashes customer match keys',async()=>{
  let payload
  const m=load('src/utils/metaCapi.ts',capiMocks,{fetch:async(_url,opt)=>{
    payload=JSON.parse(opt.body);return {ok:true,status:200,json:async()=>({events_received:1,fbtrace_id:'ignored'})}}},env)
  const r=await m.sendCapiEvent(event)
  assert.equal(r.outcome,'accepted');assert.equal(r.events_received,1)
  assert.equal(payload.data[0].event_time,event.eventTime)
  assert.equal(payload.data[0].event_id,event.eventId)
  assert.equal(payload.data[0].user_data.em,createHash('sha256').update('example@example.test').digest('hex'))
  assert(!JSON.stringify(payload).includes('Example@'))
})
test('CAPI provider error receipt cannot persist raw provider/customer text',async()=>{
  const m=load('src/utils/metaCapi.ts',capiMocks,{fetch:async()=>({ok:false,status:400,
    json:async()=>({error:{code:100,error_subcode:123,message:'fixture_secret raw@example.test'}})})},env)
  const r=await m.sendCapiEvent(event)
  assert.equal(r.outcome,'rejected');assert.equal(r.error_code,100)
  assert(!JSON.stringify(r).includes('fixture_secret'));assert(!JSON.stringify(r).includes('@'))
})
test('HTTP success without events_received=1 is ambiguous, not accepted',async()=>{
  const m=load('src/utils/metaCapi.ts',capiMocks,{fetch:async()=>({ok:true,status:200,json:async()=>({})})},env)
  assert.equal((await m.sendCapiEvent(event)).outcome,'ambiguous')
})
test('transport interruption stays ambiguous, never replays',async()=>{
  let calls=0
  const m=load('src/utils/metaCapi.ts',capiMocks,{fetch:async()=>{calls++;throw Error('fixture_secret')}},env)
  assert.equal((await m.sendCapiEvent(event)).outcome,'ambiguous');assert.equal(calls,1)
})
test('missing config, preview and invalid business times never send',async()=>{
  let calls=0;const globals={fetch:async()=>{calls++;throw Error('must not send')}}
  assert.equal((await load('src/utils/metaCapi.ts',capiMocks,globals,{}).sendCapiEvent(event)).outcome,'skipped')
  const preview={...capiMocks,'@/utils/trackingEnv':{isServerTrackingEnabled:()=>false}}
  assert.equal((await load('src/utils/metaCapi.ts',preview,globals,env).sendCapiEvent(event)).outcome,'skipped')
  assert.equal((await load('src/utils/metaCapi.ts',capiMocks,globals,env).sendCapiEvent({...event,eventTime:NaN})).outcome,'skipped')
  assert.equal(calls,0)
})
function consentFixture(initial) {
  const data=new Map(initial?[['cookie_consent',initial]]:[])
  const cookies=new Set(['_ga','_ga_test','_fbp','_fbc','_gcl_au','_gcl_aw','_gcl_gb','uksofashop_ft','uksofashop_lt','cart_cookie','sb-auth'])
  let reloaded=false
  const document={get cookie(){return [...cookies].map(n=>n+'=fixture').join('; ')},
    set cookie(v){if(v.includes('expires=Thu, 01 Jan 1970'))cookies.delete(v.split('=')[0])}}
  const window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},
    location:{hostname:'www.uksofashop.co.uk',reload(){reloaded=true}},dispatchEvent(){}}
  const choices=[]
  const mod=load('src/utils/consent.ts',{'./googleConsentEvidence':{recordGoogleChoice:(...a)=>choices.push(a)}},
    {window,document,Event:class {constructor(type){this.type=type}}})
  return {mod,cookies,choices,reloaded:()=>reloaded}
}
test('consent unset is null; grant and reject are explicit states',()=>{
  const f=consentFixture();assert.equal(f.mod.getConsent(),null)
  f.mod.grantConsent();assert.equal(f.mod.getConsent(),'granted')
  f.mod.revokeConsent();assert.equal(f.mod.getConsent(),'denied');assert(f.reloaded())
})
test('withdrawal deletes Google Ads cookies, preserves basket and authentication',()=>{
  const f=consentFixture('granted');f.mod.revokeConsent({reload:false})
  for(const n of ['_ga','_ga_test','_fbp','_fbc','_gcl_au','_gcl_aw','_gcl_gb','uksofashop_ft','uksofashop_lt'])assert(!f.cookies.has(n),n)
  assert(f.cookies.has('cart_cookie'));assert(f.cookies.has('sb-auth'));assert(!f.reloaded())
  assert.deepEqual(f.choices[0],['denied','revoked'])
})
function googleFixture(consent='granted',storage=new Map()) {
  const window={location:{href:'https://www.uksofashop.co.uk/checkout',pathname:'/checkout',search:''},dataLayer:[]}
  const mod=load('src/utils/googleMeasurement.ts',{
    './consent':{getConsent:()=>consent},
    './trackingEnv':{isBrowserTrackingEnabled:()=>true},
    './redactUrl':{isSensitiveUrl:()=>false}},
    {window,document:{title:'Checkout | UK Sofa Shop',referrer:''},
      localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},
    {NEXT_PUBLIC_GOOGLE_TRACKING_MODE:'gtm-v1'})
  return {mod,window}
}
test('committed Google receipt emits once across repeated calls and refresh',()=>{
  const store=new Map();const f=googleFixture('granted',store)
  const receipt={reference:'ABCDEF12',total:799,commerce:{currency:'GBP',value:799,items:[
    {item_id:'12345678-1234-1234-1234-123456789012',item_name:'Fixture sofa',price:799,quantity:1}]}}
  f.mod.emitGoogleOrder(null);assert.equal(f.window.dataLayer.length,0)
  f.mod.emitGoogleOrder(receipt);f.mod.emitGoogleOrder(receipt)
  assert.equal(f.window.dataLayer.filter(e=>e.event==='ukss.order_placed').length,1)
  const refreshed=googleFixture('granted',store);refreshed.mod.emitGoogleOrder(receipt)
  assert.equal(refreshed.window.dataLayer.length,0)
  const emitted=f.window.dataLayer.find(e=>e.event)
  assert.equal(emitted.ecommerce.currency,'GBP');assert.equal(emitted.ecommerce.transaction_id,receipt.reference)
})
test('Google consent defaults denied when unset and remains denied on refusal',()=>{
  for(const value of [null,'denied']) {
    const f=googleFixture(value)
    assert.equal(f.mod.googleConsent().ad_storage,'denied')
    assert.equal(f.mod.googleConsent().ad_user_data,'denied')
  }
})
test('discount allocation preserves pennies across multiple lines',()=>{
  const {mod}=googleFixture()
  const b=mod.googleBasket([{item_id:'x',item_name:'A',price:299.99,quantity:2},
    {item_id:'y',item_name:'B',price:199.99,quantity:1}],20)
  assert.equal(b.value,779.97)
  assert(Math.abs(b.items.reduce((s,i)=>s+i.price*i.quantity,0)-b.value)<0.00001)
})

test('non-JSON provider errors retain HTTP evidence; success with unreadable body stays ambiguous',async()=>{for(const status of [400,200]){const m=load('src/utils/metaCapi.ts',capiMocks,{fetch:async()=>({ok:status===200,status,json:async()=>{throw Error('private body')}})},env);const r=await m.sendCapiEvent(event);assert.equal(r.http_status,status);assert.equal(r.outcome,status===400?'rejected':'ambiguous')}})
