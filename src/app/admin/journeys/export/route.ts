import { NextResponse } from 'next/server'
import { isAdmin } from '@/utils/auth'
import { loadJourneyReport } from '@/utils/journeyReport'
export async function GET(request:Request) {
  if(!await isAdmin()) return new NextResponse(null,{status:403})
  const result=await loadJourneyReport(Object.fromEntries(new URL(request.url).searchParams))
  if(result.error) return NextResponse.json({error:result.error},{status:400})
  const columns=['created_at','session_key','page_view_key','source','campaign','device','page_path','page_type','product_id','variant_id','event','sequence','elapsed_ms','engaged_ms','cta_position','section','option_code','step','outcome','error_code','field_category','destination','scroll_percent','price','quantity','source_product_id','delivery_extra','extra_enabled'] as const
  const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"'
  const csv=[columns.join(','),...result.rows.map(r=>columns.map(k=>cell(r[k])).join(','))].join('\r\n')
  return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="UKSS_Journey_Analytics.csv"','Cache-Control':'private, no-store'}})
}
