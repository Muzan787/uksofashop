import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { isProductionRequestHost, isServerTrackingEnabled } from '@/utils/trackingEnv'
import { journeyBatchSchema, receiptAllowsJourney } from '@/utils/journeySchema'
export const dynamic='force-dynamic'
export async function POST(request:Request) {
  const done=(status=204)=>new NextResponse(null,{status})
  if(!isServerTrackingEnabled()) return done()
  const h=await headers()
  let origin:string|null=null
  try {origin=new URL(h.get('origin')||'').host} catch { /* deny */ }
  if(!isProductionRequestHost(h.get('host')) || !isProductionRequestHost(origin)) return done(403)
  if(!rateLimit(callerKey(h,'journey'),30,60000).ok) return done(429)
  if(Number(h.get('content-length')||0)>24576) return done(413)
  let raw:string
  try {raw=await request.text()} catch {return done(400)}
  if(new TextEncoder().encode(raw).byteLength>24576) return done(413)
  let body:unknown
  try {body=JSON.parse(raw)} catch {return done(400)}
  const parsed=journeyBatchSchema.safeParse(body)
  if(!parsed.success) return done(400)
  const jar=await cookies(), uuid=z.string().uuid()
  const vid=uuid.safeParse(jar.get('uksofashop_vid')?.value), sid=uuid.safeParse(jar.get('uksofashop_sid')?.value),
    aid=uuid.safeParse(jar.get('uksofashop_aid')?.value), receipt=uuid.safeParse(jar.get('ukss_google_consent_receipt')?.value)
  if(!vid.success || !sid.success || !aid.success || !receipt.success) return done(204)
  try {
    const db=createUntypedAdminClient()
    const {data:choice,error:choiceError}=await db.from('google_consent_receipts')
      .select('visitor_id,session_id,arrival_id,analytics_storage,policy_version,captured_at').eq('id',receipt.data).maybeSingle()
    if(choiceError || !choice || !receiptAllowsJourney(choice,{visitor:vid.data,session:sid.data,arrival:aid.data})) return done()
    // A withdrawal on a later visit must invalidate a stale grant cookie.
    const {data:later,error:laterError}=await db.from('google_consent_receipts').select('analytics_storage')
      .eq('visitor_id',vid.data).gte('captured_at',choice.captured_at).eq('analytics_storage','denied').limit(1)
    if(laterError || later?.length) return done()
    const {count,error:countError}=await db.from('attribution_actions').select('id',{count:'exact',head:true})
      .eq('arrival_id',aid.data).eq('action_type','journey_event')
    if(countError || (count??0)>=1000) return done(429)
    const rows=parsed.data.events.slice(0,1000-(count??0)).map(e=>({
      id:e.id,visitor_id:vid.data,session_id:sid.data,arrival_id:aid.data,
      action_type:'journey_event',page_url:e.path,product_id:e.product_id,variant_id:e.variant_id,
      metadata:{...e.metadata,kind:e.kind,page_type:e.page_type,device:e.device,navigation_id:e.navigation_id,
        sequence:e.sequence,elapsed_ms:e.elapsed_ms,data_class:e.qa?'qa_test':'consented_journey',
        schema_version:1,consent_receipt_id:receipt.data},
    }))
    const {error}=await db.from('attribution_actions').upsert(rows,{onConflict:'id',ignoreDuplicates:true})
    if(error) return done(503)
    return NextResponse.json({accepted:rows.length},{headers:{'Cache-Control':'no-store'}})
  } catch {return done(503)}
}
