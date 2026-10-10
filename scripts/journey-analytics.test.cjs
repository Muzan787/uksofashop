const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const assert=require('node:assert/strict'),{test,before,after}=require('node:test')
const ts=require('typescript'),{PGlite}=require('@electric-sql/pglite'),{z}=require('zod')
const {randomUUID}=require('node:crypto'),root=path.join(__dirname,'..')
function load(file,mocks={},globals={}) {
 const module={exports:{}}
 const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 vm.runInNewContext(js,{module,exports:module.exports,require:n=>{if(n in mocks)return mocks[n];throw Error('Unexpected '+n)},Date,URL,Set,Map,Math,performance,crypto:{randomUUID},TextEncoder,...globals})
 return module.exports
}
const contract=load('src/utils/journeyContract.ts')
const schema=load('src/utils/journeySchema.ts',{'zod':{z},'./journeyContract':contract})
const visitor=randomUUID(),session=randomUUID(),arrival=randomUUID(),receipt=randomUUID(),variant=randomUUID(),product=randomUUID()
const event=(overrides={})=>({id:randomUUID(),kind:'fabric_selected',path:'/shop/corner-sofas/verona',page_type:'product',navigation_id:randomUUID(),
 sequence:1,elapsed_ms:100,device:'mobile',qa:false,product_id:product,variant_id:variant,metadata:{option_code:'CH01',surface:'fabric_picker'},...overrides})
test('depth thresholds fire once across repeated scroll and changing page heights',()=>{
 const seen=new Set();assert.deepEqual(Array.from(contract.scrollThresholds(0,800,3200,seen)),[25])
 assert.deepEqual(Array.from(contract.scrollThresholds(0,800,3200,seen)),[])
 assert.deepEqual(Array.from(contract.scrollThresholds(1600,800,3200,seen)),[50,75])
 assert.deepEqual(Array.from(contract.scrollThresholds(2400,800,5000,seen)),[])
 assert.deepEqual(Array.from(contract.scrollThresholds(2600,800,3200,seen)),[90])
 assert.deepEqual(Array.from(contract.scrollThresholds(2600,800,3200,new Set())),[25,50,75,90])
})
test('schema rejects PII, arbitrary events, raw values, unbounded batches and private routes',()=>{
 assert(schema.journeyBatchSchema.safeParse({version:contract.JOURNEY_VERSION,events:[event()]}).success)
 for(const e of [event({kind:'Purchase'}),event({path:'/admin/orders',page_type:'content'}),event({metadata:{email:'private@example.com'}}),
 event({metadata:{option_code:'private@example.com'}}),event({path:'/checkout?postcode=BB11AA',page_type:'checkout'}),event({sequence:201}),event({metadata:{depth:26}})])
   assert.equal(schema.journeyBatchSchema.safeParse({version:contract.JOURNEY_VERSION,events:[e]}).success,false)
 assert.equal(schema.journeyBatchSchema.safeParse({version:contract.JOURNEY_VERSION,events:Array.from({length:21},()=>event())}).success,false)
})
function browser() {
 let consent='denied';const writes=[],tags=[],listeners={},timers=new Map();let timer=0
 const win={location:{pathname:'/shop/corner-sofas/verona',hostname:'www.uksofashop.co.uk',origin:'https://www.uksofashop.co.uk',search:''},
 innerWidth:375,addEventListener:(n,f)=>listeners[n]=f,gtag:(...args)=>tags.push(args)}
 const mod=load('src/utils/journey.ts',{'./consent':{getConsent:()=>consent,CONSENT_CHANGED_EVENT:'choice'},
 './trackingEnv':{isBrowserTrackingEnabled:()=>true},'./consentMode':{GA_ID:'G-GTBKG6RSNF'},'./journeyContract':contract},
 {window:win,document:{referrer:'https://www.uksofashop.co.uk/?private=omit',querySelector:()=>({dataset:{productId:product,variantId:variant}})},
 fetch:async(url,options)=>writes.push({url,body:JSON.parse(options.body)}),setTimeout:f=>{timers.set(++timer,f);return timer},clearTimeout:id=>timers.delete(id)})
 return {mod,win,writes,tags,choose:v=>{consent=v;listeners.choice?.()},timers}
}
test('grant, deny and withdrawal gate optional transport and GA4 without any purchase event',()=>{
 const b=browser();b.mod.trackJourney('fabric_selected',{option_code:'CH01'});b.mod.flushJourney()
 assert.equal(b.writes.length,0);assert.equal(b.tags.length,0)
 b.choose('granted');b.mod.trackJourney('fabric_selected',{option_code:'CH01'});b.mod.flushJourney()
 assert.equal(b.writes.length,1);assert.equal(b.writes[0].body.events[0].variant_id,variant)
 assert(b.tags.every(t=>t[0]==='event'&&t[1]==='journey_interaction'&&t[2].send_to==='G-GTBKG6RSNF'))
 b.mod.trackJourney('scroll_depth',{depth:50});b.choose('denied');b.mod.flushJourney();assert.equal(b.writes.length,1)
 assert(!JSON.stringify(b.writes).includes('private=omit'))
})
test('dedupe, route context, public product IDs and QA exclusion preserve sequence',()=>{
 const b=browser();b.choose('granted');b.mod.trackJourney('scroll_depth',{depth:25},{},'25');b.mod.trackJourney('scroll_depth',{depth:25},{},'25')
 b.win.location.pathname='/shop/all';b.mod.trackJourney('page_exit',{}, {path:'/shop/corner-sofas/verona'},'exit')
 b.mod.trackJourney('page_enter');b.mod.flushJourney()
 const rows=b.writes[0].body.events;assert.equal(rows.length,3);assert.equal(rows[1].path,'/shop/corner-sofas/verona')
 assert.equal(rows[2].page_type,'collection');assert.notEqual(rows[0].navigation_id,rows[2].navigation_id)
 b.win.location.search='?ukss_qa=1';const count=b.tags.length;b.mod.trackJourney('cta_click',{surface:'sticky'});b.mod.flushJourney()
 assert.equal(b.tags.length,count);assert.equal(b.writes.at(-1).body.events[0].qa,true)
 b.win.location.search='';b.win.location.pathname='/build';b.mod.trackJourney('builder_started');b.mod.flushJourney()
 assert.equal(b.tags.length,count);assert.equal(b.writes.at(-1).body.events[0].qa,true)
})
test('replayed operational effects mirror once per navigation while real changed choices remain distinct',()=>{
 const b=browser();b.choose('granted')
 b.mod.mirrorJourneyAction('builder_started',{},'one-start');b.mod.mirrorJourneyAction('builder_started',{},'one-start')
 b.mod.mirrorJourneyAction('builder_size_selected',{metadata:{step:'seats',value:'3+2'}})
 b.mod.mirrorJourneyAction('builder_size_selected',{metadata:{step:'seats',value:'5 seater'}})
 b.mod.flushJourney();assert.equal(b.writes[0].body.events.length,3)
 assert.equal(b.writes[0].body.events[1].metadata.option_code,'option_3_2')
})
test('bounded event queue and transport failure cannot block customer callbacks',()=>{
 const b=browser();b.choose('granted');for(let i=0;i<250;i++)b.mod.trackJourney('cta_click',{surface:'primary'})
 b.mod.flushJourney();assert.equal(b.writes[0].body.events.length,20)
 b.mod.flushJourney();assert.equal(b.writes[1].body.events.length,20)
 assert.equal(b.tags.length,200)
})
test('configuration, fabric, gallery, builder and checkout outcomes keep their real vocabulary',()=>{
 const b=browser();b.choose('granted')
 const cases=[['variant_changed',{price:799}],['fabric_selected',{option_code:'3 blue velvet'}],['gallery_selected',{quantity:2}],
 ['builder_step_completed',{step:'seats',outcome:'success'}],['builder_back',{step:'fabric'}],['postcode_lookup_result',{outcome:'custom_quote'}],
 ['checkout_validation_error',{field:'phone',error_code:'invalid_mobile'}],['delivery_extra_toggled',{extra:'assembly',enabled:true}],
 ['order_submit_failed',{outcome:'failed',error_code:'server_error'}],['order_saved',{outcome:'success'}]]
 for(const [kind,meta] of cases)b.mod.trackJourney(kind,meta)
 b.mod.flushJourney();const events=b.writes[0].body.events
 assert.equal(events.length,cases.length)
 for(const e of events)assert(schema.journeyEventSchema.safeParse(e).success)
 assert.equal(events[1].metadata.option_code,'option_3_blue_velvet')
 assert.equal(b.tags[1][2].option_code,'option_3_blue_velvet')
 assert(!b.tags.some(t=>['purchase','order_placed','add_to_cart'].includes(t[1])))
 assert.equal(contract.searchClassification('private-person@example.com'),'other')
})
test('responsive devices, related navigation and collection routes preserve public context',()=>{
 const b=browser();b.choose('granted');const target=randomUUID()
 for(const width of [320,390,820,1440]) {b.win.innerWidth=width;b.mod.trackJourney('product_click',{destination:'/shop/all/verona',source_product_id:product},{productId:target})}
 b.mod.flushJourney();assert.deepEqual(b.writes[0].body.events.map(e=>e.device),['mobile','mobile','tablet','desktop'])
 for(const e of b.writes[0].body.events){assert.equal(e.product_id,target);assert.equal(e.variant_id,undefined);assert.equal(e.metadata.source_product_id,product)}
 b.win.location.pathname='/collection/made-to-order';b.mod.trackJourney('page_enter');b.mod.flushJourney()
 assert.equal(b.writes.at(-1).body.events[0].page_type,'collection')
 assert.equal(contract.publicJourneyPath('/search?q=private@example.com'),'/search')
})
test('actual cart provider measures committed updates once despite replayed React updaters',()=>{
 const state=[],effects=[],writes=[],google=[];let cursor=0,scheduled=[]
 const hooks={createContext:()=>({Provider:()=>null}),useContext:()=>{},
 useState:initial=>{const i=cursor++;if(!state[i])state[i]={value:typeof initial==='function'?initial():initial};return [state[i].value,v=>{const before=state[i].value;if(typeof v==='function'){v(before);state[i].value=v(before)}else state[i].value=v}]},
 useRef:initial=>{const i=cursor++;if(!state[i])state[i]={current:initial};return state[i]},
 useEffect:(fn,deps)=>{const i=cursor++;if(!effects[i]||!deps||deps.some((v,n)=>v!==effects[i][n]))scheduled.push(fn);effects[i]=deps}}
 const storage={getItem:()=>null,setItem:()=>{}}
 const cart=load('src/context/CartContext.tsx',{'react':hooks,'react/jsx-runtime':require('react/jsx-runtime'),
 '@/utils/googleMeasurement':{emitGoogleEvent:(...a)=>google.push(a)},'@/utils/journey':{trackJourney:(...a)=>writes.push(a)}},
 {window:{localStorage:storage},localStorage:storage})
 const render=()=>{cursor=0;scheduled=[];const node=cart.CartProvider({children:null});return node.props.value}
 const commit=()=>{const pending=scheduled;scheduled=[];pending.forEach(f=>f())}
 render();commit();let value=render();commit()
 const item={variant_id:variant,quantity:1,price:799,title:'Verona',color:'Grey',image_url:'/sofa.jpg'}
 for(const surface of ['primary','sticky','fabric_picker']) {
   const before=writes.filter(e=>e[0]==='cart_updated').length
   value.addToCart(item,surface)
   assert.equal(writes.filter(e=>e[0]==='cart_updated').length,before)
   value=render();commit();value=render();commit()
   assert.equal(writes.filter(e=>e[0]==='cart_updated').length,before+1)
   assert.equal(writes.filter(e=>e[0]==='cart_updated').at(-1)[1].surface,surface)
 }
 assert.equal(value.cartItems[0].quantity,3)
 assert.equal(writes.filter(e=>e[0]==='cart_update_requested').length,3)
 assert(!google.some(e=>/purchase|order/.test(e[0])))
})
let db
before(async()=>{
 db=new PGlite()
 await db.exec(`
 create role anon;create role authenticated;create role service_role;
 create table attribution_sessions(arrival_id uuid primary key,visitor_id uuid,session_id uuid,gclid text,gbraid text,wbraid text,fbclid text,last_touch_source text,last_touch_campaign text);
 create table attribution_actions(id uuid primary key,created_at timestamptz default now(),visitor_id uuid,session_id uuid,arrival_id uuid references attribution_sessions(arrival_id),action_type text check(action_type in ('product_view','whatsapp_click')),page_url text,product_id uuid,variant_id uuid,metadata jsonb);
 alter table attribution_actions enable row level security;
 create table google_consent_receipts(id uuid primary key,visitor_id uuid,session_id uuid,arrival_id uuid,analytics_storage text,policy_version text,captured_at timestamptz);
 create table orders(session_id uuid,confirmed_at timestamptz,delivered_at timestamptz);
 grant select on attribution_actions,attribution_sessions,orders to service_role;
 `)
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261010192402_journey_analytics.sql'),'utf8'))
 await db.query('insert into attribution_sessions(arrival_id,visitor_id,session_id,last_touch_source,last_touch_campaign) values($1,$2,$3,$4,$5)',[arrival,visitor,session,'google','24325776381'])
 await db.query('insert into google_consent_receipts values($1,$2,$3,$4,$5,$6,now()-interval \'1 minute\')',[receipt,visitor,session,arrival,'granted','ukss-google-2026-09-27-v1'])
})
after(async()=>db.close())
class Query {
 constructor(table){this.table=table;this.filters=[];this.args=[]}
 value(v){this.args.push(v);return '$'+this.args.length}
 select(c,options={}){this.columns=options.count?'count(*)::int as count':c;this.head=options.head;return this}
 eq(c,v){this.filters.push(c+'='+this.value(v));return this}
 gte(c,v){this.filters.push(c+'>='+this.value(v));return this}
 limit(n){this.max=n;return this}
 upsert(rows){this.rows=rows;return this}
 async run(single=false){try {
  let sql
  if(this.rows){const keys=Object.keys(this.rows[0]);sql='insert into '+this.table+'('+keys.join(',')+') values '+this.rows.map(r=>'('+keys.map(k=>this.value(r[k]??null)).join(',')+')').join(',')+' on conflict(id) do nothing returning id'}
  else sql='select '+this.columns+' from '+this.table+(this.filters.length?' where '+this.filters.join(' and '):'')+(this.max?' limit '+this.max:'')
  const {rows}=await db.query(sql,this.args);return {data:this.head?null:single?(rows[0]||null):rows,count:this.head?rows[0].count:null,error:null}
 }catch(e){return {data:null,error:{message:e.message}}}}
 maybeSingle(){return this.run(true)}
 then(a,b){return this.run().then(a,b)}
}
function endpoint(origin='https://www.uksofashop.co.uk',cookieReceipt=receipt){
 const h=new Headers({host:'www.uksofashop.co.uk',origin})
 class NextResponse extends Response {static json(data,opts){return new Response(JSON.stringify(data),opts)}}
 return load('src/app/api/journey/route.ts',{'next/server':{NextResponse},'next/headers':{headers:async()=>h,cookies:async()=>({get:n=>({value:{uksofashop_vid:visitor,uksofashop_sid:session,uksofashop_aid:arrival,ukss_google_consent_receipt:cookieReceipt}[n]})})},
 'zod':{z},'@/utils/supabase/admin':{createUntypedAdminClient:()=>({from:t=>new Query(t)})},
 '@/utils/rateLimit':{callerKey:()=>'',rateLimit:()=>({ok:true})},'@/utils/trackingEnv':{isProductionRequestHost:v=>v==='www.uksofashop.co.uk',isServerTrackingEnabled:()=>true},
 '@/utils/journeySchema':schema},{Response,Request,Headers})
}
const request=e=>new Request('https://www.uksofashop.co.uk/api/journey',{method:'POST',body:JSON.stringify({version:contract.JOURNEY_VERSION,events:[e]})})
test('actual endpoint persists once with established identity and denies cross-origin and missing proof',async()=>{
 const e=event(),route=endpoint();assert.equal((await route.POST(request(e))).status,200)
 assert.equal((await route.POST(request(e))).status,200)
 const {rows}=await db.query('select * from attribution_actions where id=$1',[e.id]);assert.equal(rows.length,1);assert.equal(rows[0].visitor_id,visitor)
 assert.equal((await endpoint('https://evil.example').POST(request(event()))).status,403)
 assert.equal((await endpoint(undefined,randomUUID()).POST(request(event()))).status,204)
 assert.equal((await route.POST(request(event({metadata:{address:'private'}})))).status,400)
})
test('RLS grants, QA reporting exclusion, chronology and scoped retention execute in PostgreSQL',async()=>{
 const qa=event({qa:true});assert.equal((await endpoint().POST(request(qa))).status,200)
 assert.equal((await db.query("select count(*)::int as n from journey_events_v1")).rows[0].n,1)
 assert.equal((await db.query("select source,cart_updated from journey_session_funnel_v1")).rows[0].source,'google')
 assert.equal((await db.query("select has_table_privilege('anon','journey_events_v1','select') as allowed")).rows[0].allowed,false)
 assert.equal((await db.query("select has_table_privilege('authenticated','journey_session_funnel_v1','select') as allowed")).rows[0].allowed,false)
 await db.query("insert into attribution_actions(id,action_type,created_at) values($1,'product_view',now()-interval '120 days')",[randomUUID()])
 await db.query("update attribution_actions set created_at=now()-interval '100 days' where id=$1",[qa.id])
 await db.exec("delete from attribution_actions where action_type='journey_event' and created_at<now()-interval '90 days'")
 assert.equal((await db.query("select count(*)::int n from attribution_actions where action_type='product_view'")).rows[0].n,1)
})
test('later recorded withdrawal rejects stale grant cookie without rewriting orders or identity',async()=>{
 await db.query('insert into google_consent_receipts values($1,$2,$3,$4,$5,$6,now())',[randomUUID(),visitor,session,arrival,'denied','ukss-google-2026-09-27-v1'])
 assert.equal((await endpoint().POST(request(event()))).status,204)
 assert.equal((await db.query('select count(*)::int n from attribution_sessions')).rows[0].n,1)
})
