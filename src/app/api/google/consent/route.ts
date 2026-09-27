import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { isProductionRequestHost, isServerTrackingEnabled } from '@/utils/trackingEnv'
import { GOOGLE_GTM_ENABLED, GOOGLE_POLICY_VERSION } from '@/utils/googleMeasurement'
const state=z.enum(['granted','denied'])
const schema=z.object({id:z.string().uuid(),value:state,reason:z.enum(['granted','denied','revoked']),
  captured_at:z.iso.datetime(),policy_version:z.literal(GOOGLE_POLICY_VERSION),surface:z.literal('cookie_banner'),
  consent:z.object({ad_storage:state,analytics_storage:state,ad_user_data:state,ad_personalization:state}).strict()}).strict()
export async function POST(req:Request) {
  const done=(status=204)=>new NextResponse(null,{status})
  if(!GOOGLE_GTM_ENABLED || !isServerTrackingEnabled()) return done()
  const h=await headers()
  if(!isProductionRequestHost(h.get('host')) || !h.get('origin') || new URL(req.url).origin!==h.get('origin')) return done(403)
  if(!rateLimit(callerKey(h,'google-consent'),60,60_000).ok) return done(429)
  if(Number(h.get('content-length')||0)>4096) return done(413)
  let raw:unknown
  try {raw=await req.json()} catch{return done(400)}
  const parsed=schema.safeParse(raw)
  if(!parsed.success) return done(400)
  const p=parsed.data
  if(Object.values(p.consent).some(s=>s!==p.value) || Date.parse(p.captured_at)>Date.now()+60_000) return done(400)
  const jar=await cookies(), uuid=z.string().uuid()
  const vid=uuid.safeParse(jar.get('uksofashop_vid')?.value),sid=uuid.safeParse(jar.get('uksofashop_sid')?.value),aid=uuid.safeParse(jar.get('uksofashop_aid')?.value)
  if(!vid.success || !sid.success || !aid.success) return done(409)
  // A restored decision retains its original capture time while each session gets its own receipt.
  const hex=createHash('sha256').update([p.id,vid.data,sid.data,aid.data].join(':')).digest('hex').slice(0,32)
  const receiptId=`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20)}`
  const {error}=await createUntypedAdminClient().from('google_consent_receipts').upsert({id:receiptId,decision_id:p.id,visitor_id:vid.data,session_id:sid.data,arrival_id:aid.data,
    ...p.consent,captured_at:p.captured_at,policy_version:p.policy_version,surface:p.surface,reason:p.reason},{onConflict:'id',ignoreDuplicates:true})
  if(error) return done(503)
  jar.set('ukss_google_consent_receipt',receiptId,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:365*86400})
  return done()
}
