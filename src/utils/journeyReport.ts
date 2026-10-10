import 'server-only'
import { z } from 'zod'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { JOURNEY_KINDS, PAGE_TYPES } from './journeyContract'
const date=z.iso.date()
export const reportFilterSchema=z.object({
  from:date.optional(),to:date.optional(),
  source:z.enum(['google','meta','direct_or_unattributed','other']).optional(),
  campaign:z.string().max(120).regex(/^[a-zA-Z0-9 _|+-]+$/).optional(),
  device:z.enum(['mobile','tablet','desktop']).optional(),page_type:z.enum(PAGE_TYPES).optional(),
  product:z.string().uuid().optional(),event:z.enum(JOURNEY_KINDS).optional(),
  stage:z.enum(['engagement','configuration','cart','checkout','enquiry','order']).optional(),
  session:z.string().regex(/^[a-f0-9]{12}$/).optional(),
}).strict()
export type JourneyRow={
  created_at:string;session_key:string;page_view_key:string;page_path:string;product_id:string|null;variant_id:string|null;
  event:string;page_type:string;device:string;source:string;campaign:string|null;cta_position:string|null;section:string|null;
  option_code:string|null;step:string|null;outcome:string|null;error_code:string|null;field_category:string|null;
  destination:string|null;scroll_percent:number|null;sequence:number;elapsed_ms:number;price:number|null;quantity:number|null;
  engaged_ms:number|null;source_product_id:string|null;delivery_extra:string|null;extra_enabled:boolean|null
}
export type JourneyFunnelRow={session_key:string;source:string;campaign:string|null;device:string;cart_attempted:boolean;cart_updated:boolean;checkout_started:boolean;whatsapp_clicked:boolean;website_order_saved:boolean;enquiry_recorded:boolean;order_linked:boolean;order_confirmed:boolean;order_delivered:boolean}
export async function loadJourneyLifecycle(rows:JourneyRow[]) {
  const keys=[...new Set(rows.map(r=>r.session_key))]
  if(!keys.length) return {rows:[] as JourneyFunnelRow[],limited:false,error:null}
  const {data,error}=await createUntypedAdminClient().from('journey_session_funnel_v1')
    .select('session_key,source,campaign,device,cart_attempted,cart_updated,checkout_started,whatsapp_clicked,website_order_saved,enquiry_recorded,order_linked,order_confirmed,order_delivered')
    .in('session_key',keys.slice(0,300)).limit(2000)
  return {rows:(data||[]) as JourneyFunnelRow[],limited:keys.length>300,error:error?'Order associations are temporarily unavailable.':null}
}
export const stageOf=(event:string):string=>
  event==='order_saved'||event.startsWith('order_submit')?'order':
  event.includes('whatsapp')||event.includes('phone')||event==='call_click'?'enquiry':
  event.startsWith('checkout')||event.startsWith('place_order')||event.includes('postcode')||event.includes('address')||event.includes('offer_code')?'checkout':
  event.startsWith('cart_')||event==='cta_click'||event==='builder_add_to_cart'?'cart':
  /fabric|material|colour|variant|size_selected|style_selected|builder_|zoom|photo/.test(event)?'configuration':'engagement'
export function aggregateJourneys(rows:JourneyRow[],key:(r:JourneyRow)=>string) {
  const buckets=new Map<string,{label:string;events:number;sessions:Set<string>}>()
  rows.forEach(r=>{
    const label=key(r),entry=buckets.get(label)||{label,events:0,sessions:new Set<string>()}
    entry.events++;entry.sessions.add(r.session_key);buckets.set(label,entry)
  })
  return [...buckets.values()].map(b=>({label:b.label,events:b.events,sessions:b.sessions.size}))
    .sort((a,b)=>b.events-a.events).slice(0,50)
}
export async function loadJourneyReport(raw:Record<string,string|undefined>) {
  const clean=Object.fromEntries(Object.entries(raw).filter(([,v])=>v))
  const parsed=reportFilterSchema.safeParse(clean)
  if(!parsed.success) return {rows:[] as JourneyRow[],error:'Invalid report filter.',truncated:false,from:'',to:''}
  const filter=parsed.data
  const today=new Date(Date.now()+5*3600000).toISOString().slice(0,10)
  const from=filter.from||today,to=filter.to||today
  const start=Date.parse(from+'T00:00:00+05:00'),end=Date.parse(to+'T00:00:00+05:00')+86400000
  if(end<=start || end-start>31*86400000) return {rows:[] as JourneyRow[],error:'Choose a range of 1–31 days.',truncated:false,from,to}
  let query=createUntypedAdminClient().from('journey_events_v1').select('*')
    .gte('created_at',new Date(start).toISOString()).lt('created_at',new Date(end).toISOString())
    .order('created_at',{ascending:true}).order('sequence',{ascending:true}).limit(5001)
  for(const [key,column] of Object.entries({source:'source',campaign:'campaign',device:'device',page_type:'page_type',product:'product_id',event:'event',session:'session_key'})) {
    const value=filter[key as keyof typeof filter]
    if(value) query=query.eq(column,value)
  }
  const {data,error}=await query
  let rows=(data||[]) as JourneyRow[]
  const truncated=rows.length>5000
  rows=rows.slice(0,5000)
  if(filter.stage) rows=rows.filter(r=>stageOf(r.event)===filter.stage)
  return {rows,error:error?'Journey reporting is temporarily unavailable.':null,truncated,from,to}
}
