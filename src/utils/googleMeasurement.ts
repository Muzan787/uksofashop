// Google's public event boundary. Never pass forms, attribution IDs or bearer tokens here.
import { getConsent } from './consent'
import { isBrowserTrackingEnabled } from './trackingEnv'

export const GOOGLE_GTM_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_TRACKING_MODE === 'gtm-v1'
export const GOOGLE_POLICY_VERSION = 'ukss-google-2026-09-27-v1'
export type GoogleConsentState = 'granted' | 'denied'
export const googleEvents = ['page_view','view_item','view_item_list','select_item','add_to_cart',
  'remove_from_cart','view_cart','begin_checkout','checkout_progress','add_shipping_info',
  'order_placed','whatsapp_click','phone_click'] as const
export type GoogleEvent = typeof googleEvents[number]
export interface GoogleItem { item_id: string; item_name: string; price: number; quantity: number }
export interface GoogleCommerce { currency: 'GBP'; value: number; items: GoogleItem[]; transaction_id?: string; shipping?: number }
export interface GoogleOrderReceipt { reference: string; total: number; commerce: GoogleCommerce }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emitted = new Set<string>()
let navigation = { path: '', id: '' }

/** Only public route identities. All queries/fragments and private path segments disappear. */
export function googleSafeUrl(raw: string): string {
  try {
    const url = new URL(raw, 'https://www.uksofashop.co.uk')
    if (!['http:','https:'].includes(url.protocol)) return ''
    if (!['uksofashop.co.uk','www.uksofashop.co.uk','localhost','127.0.0.1'].includes(url.hostname)) return `${url.origin}/`
    const path = url.pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi,'/[id]')
      .replace(/\/(confirm-order|review|newsletter|track-order|admin|account|auth)(?:\/.*)?$/i,'/$1')
    if (!/^\/[a-z0-9\-/_%.[\]]*$/i.test(path) || /%40|@|%2b/i.test(path)) return `${url.origin}/[private]`
    return url.origin + path
  } catch { return '' }
}
export function googleConsent() {
  let state: GoogleConsentState = 'denied'
  try { if (getConsent() === 'granted') state = 'granted' } catch { /* fail closed */ }
  return {ad_storage:state,analytics_storage:state,ad_user_data:state,ad_personalization:state}
}
export function validCommerce(value: unknown): value is GoogleCommerce {
  if (!value || typeof value !== 'object') return false
  const c = value as GoogleCommerce
  return c.currency === 'GBP' && Number.isFinite(c.value) && c.value >= 0 &&
    (c.transaction_id===undefined || /^[A-F0-9]{8}$/.test(c.transaction_id)) &&
    (c.shipping===undefined || (Number.isFinite(c.shipping) && c.shipping>=0)) &&
    Array.isArray(c.items) && c.items.length > 0 && c.items.every(i => UUID.test(i.item_id) &&
      typeof i.item_name === 'string' && i.item_name.length > 0 && i.item_name.length <= 200 &&
      Number.isFinite(i.price) && i.price >= 0 && Number.isSafeInteger(i.quantity) && i.quantity > 0)
}
/** Display-price basket events share the same penny allocation as committed receipts. */
export function googleBasket(items: GoogleItem[], discount=0):GoogleCommerce {
  const gross=items.reduce((sum,i)=>sum+Math.round(i.price*100)*i.quantity,0)
  const pennies=Math.min(gross,Math.max(0,Math.round(discount*100)))
  let allocated=0
  return {currency:'GBP',value:(gross-pennies)/100,items:items.map((i,index)=>{
    const line=Math.round(i.price*100)*i.quantity
    const share=index===items.length-1?pennies-allocated:gross?Math.round(pennies*line/gross):0
    allocated+=share
    return {...i,price:(line-share)/i.quantity/100}
  })}
}
export function googleNavigationId(): string {
  const path = googleSafeUrl(window.location.href)
  if (navigation.path !== path) navigation = {path, id:crypto.randomUUID()}
  return navigation.id
}
export function emitGoogleEvent(event: GoogleEvent, commerce?: GoogleCommerce,
  context: {surface?: string; step?: string; order_value?: number; item_id?: string; list_id?: string} = {},
  dedupeKey?: string): void {
  if (typeof window === 'undefined' || !GOOGLE_GTM_ENABLED) return
  if (commerce && !validCommerce(commerce)) return
  if (context.item_id && !UUID.test(context.item_id)) delete context.item_id
  if (context.order_value!==undefined && (!Number.isFinite(context.order_value)||context.order_value<0)) return
  if (dedupeKey && emitted.has(dedupeKey)) return
  if (dedupeKey) emitted.add(dedupeKey)
  const params = new URLSearchParams(window.location.search)
  const qa = !isBrowserTrackingEnabled() || [...params].some(([k,v]) => /qa|debug|test|probe/i.test(k) || /offer-test|qa-test|debug|probe/i.test(v))
  const layer = (window as unknown as {dataLayer: unknown[]}).dataLayer ||= []
  layer.push({ecommerce:null,ukss:null})
  layer.push({event:`ukss.${event}`,ukss:{schema_version:1,environment:isBrowserTrackingEnabled()?'production':'preview',
    data_class:qa?'qa_test':'production_real',event_id:crypto.randomUUID(),occurred_at:new Date().toISOString(),
    navigation_id:googleNavigationId(),page:{location:googleSafeUrl(window.location.href),referrer:googleSafeUrl(document.referrer),title:'UK Sofa Shop'},
    consent:googleConsent(),...context,...(event==='order_placed'?{order_stage:'placed'}:{})},
    ...(commerce?{ecommerce:{currency:'GBP',value:commerce.value,items:commerce.items.map(i=>({item_id:i.item_id,item_name:i.item_name,price:i.price,quantity:i.quantity})),
      ...(commerce.transaction_id?{transaction_id:commerce.transaction_id}:{}),...(commerce.shipping!==undefined?{shipping:commerce.shipping}:{})}}:{})})
}
export function emitGoogleOrder(receipt: GoogleOrderReceipt | null | undefined): void {
  if (!receipt || !/^[A-F0-9]{8}$/.test(receipt.reference) || !Number.isFinite(receipt.total) || receipt.total <= 0 || !validCommerce(receipt.commerce)) return
  const key=`ukss_google_order_v1:${receipt.reference}`
  if (emitted.has(key)) return
  try { if (localStorage.getItem(key)) return } catch { /* document guard remains */ }
  if (!GOOGLE_GTM_ENABLED) return
  emitGoogleEvent('order_placed',{...receipt.commerce,transaction_id:receipt.reference},{order_value:receipt.total},key)
  try { localStorage.setItem(key,new Date().toISOString()) } catch { /* Ads transaction_id remains */ }
}
