import 'server-only'
import { createUntypedAdminClient } from './supabase/admin'
import { GOOGLE_GTM_ENABLED, type GoogleOrderReceipt, type GoogleItem } from './googleMeasurement'
import { clientIdFromGaCookie, sendGa4Event, isGa4ServerConfigured } from './ga4Server'
import { isServerTrackingEnabled } from './trackingEnv'

/** Prices and discounts come from the committed database record, never cart state. */
export async function googleOrderReceipt(orderId:string):Promise<GoogleOrderReceipt|null> {
  if (!GOOGLE_GTM_ENABLED) return null
  try {
    const db=createUntypedAdminClient()
    const {data:o,error}=await db.from('orders').select('total_amount,items_subtotal,discount_amount,delivery_total,order_items(variant_id,quantity,price_at_time_of_purchase,product_variants(products(title)))').eq('id',orderId).single()
    if(error||!o) return null
    const subtotal=Number(o.items_subtotal), discount=Number(o.discount_amount)
    type JoinedLine={variant_id:string;quantity:number;price_at_time_of_purchase:number;product_variants:{products:{title:string}|{title:string}[]}|{products:{title:string}|{title:string}[]}[]}
    const lines=o.order_items as unknown as JoinedLine[]
    if (!lines?.length || subtotal<=0 || !Number.isFinite(discount)) return null
    // Allocate discount in integer pennies and put the rounding remainder on the last line.
    let allocated=0
    const items:GoogleItem[]=lines.map((l,i)=>{
      const gross=Math.round(Number(l.price_at_time_of_purchase)*100)*l.quantity
      const share=i===lines.length-1?Math.round(discount*100)-allocated:Math.round(discount*100*gross/Math.round(subtotal*100))
      allocated+=share
      const variant=Array.isArray(l.product_variants)?l.product_variants[0]:l.product_variants
      const product=Array.isArray(variant?.products)?variant.products[0]:variant?.products
      return {item_id:l.variant_id,item_name:product?.title||'Sofa',quantity:l.quantity,price:(gross-share)/l.quantity/100}
    })
    return {reference:orderId.slice(0,8).toUpperCase(),total:Number(o.total_amount),commerce:{currency:'GBP',value:Math.round((subtotal-discount)*100)/100,shipping:Number(o.delivery_total),items}}
  } catch {return null}
}

/** Independent Google guard, called before the protected Meta send guard. */
export async function reportGooglePurchase(orderId:string):Promise<void> {
  if (!GOOGLE_GTM_ENABLED || !isServerTrackingEnabled() || !isGa4ServerConfigured()) return
  try {
    const db=createUntypedAdminClient()
    const {data:claims,error}=await db.rpc('google_phase2b_claim_ga4',{p_order_id:orderId})
    if(error || !claims?.length) return
    const c=claims[0]
    const receipt=await googleOrderReceipt(orderId)
    const clientId=clientIdFromGaCookie(c.ga_client_id) || (/^\d+\.\d+$/.test(c.ga_client_id||'')?c.ga_client_id:null)
    if (!receipt || !clientId) {
      await db.from('google_ga4_delivery').update({status:'held',error_code:'missing_receipt_or_client'}).eq('order_id',orderId)
      return
    }
    const result=await sendGa4Event({clientId,name:'purchase',timestampMicros:Math.floor(Date.parse(c.conversion_time)*1000),
      consent:{ad_user_data:c.ad_user_data,ad_personalization:c.ad_personalization},params:{...receipt.commerce,transaction_id:receipt.reference}})
    await db.from('google_ga4_delivery').update({status:result==='transport_accepted'?'transport_accepted':'ambiguous',completed_at:new Date().toISOString()}).eq('order_id',orderId)
  } catch { /* Google never blocks the order or Meta */ }
}
