import { getConsent, CONSENT_CHANGED_EVENT } from './consent'
import { isBrowserTrackingEnabled } from './trackingEnv'
import { GA_ID } from './consentMode'
import { JOURNEY_KINDS, JOURNEY_VERSION, publicJourneyPath, journeyPage, catalogueCode, type JourneyEvent, type JourneyKind, type JourneyMeta } from './journeyContract'

let queue: JourneyEvent[] = []
let timer: ReturnType<typeof setTimeout> | undefined
let route = '', navigationId = '', started = 0, sequence = 0, count = 0
let once = new Set<string>()
let qaNavigation = false
export function resetJourney(path: string) {
  if (route === path) return
  route = path; navigationId = crypto.randomUUID(); started = performance.now()
  sequence = 0; count = 0; once = new Set()
}
export function flushJourney() {
  if (!journeyConsent()) { queue = []; return }
  if (!queue.length) return
  const batch = queue.splice(0, 20)
  try {
    void fetch('/api/journey', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({version:JOURNEY_VERSION,events:batch}), keepalive:true}).catch(() => {})
  } catch { /* Optional measurement never delays or blocks the shop. */ }
  if (queue.length) timer = setTimeout(flushJourney, 1500)
}
export function journeyConsent() {
  try { return getConsent()==='granted' } catch {return false}
}
export function trackJourney(kind: JourneyKind, metadata: JourneyMeta = {}, context: {productId?:string; variantId?:string; path?:string} = {}, key?: string) {
  try {
    if (typeof window === 'undefined' || !isBrowserTrackingEnabled() || !journeyConsent()) return
    const path = publicJourneyPath(context.path || window.location.pathname)
    if (!path || !JOURNEY_KINDS.includes(kind)) return
    // Keep this QA navigation marked across client-side route changes.
    if (/(?:^|[?&])ukss_qa=1(?:&|$)/.test(window.location.search)) qaNavigation = true
    resetJourney(path)
    if(count>=200) return
    if (key && once.has(key)) return
    if (key) once.add(key)
    count++
    const marker = path===window.location.pathname ? document.querySelector<HTMLElement>('[data-whatsapp-product-context]') : null
    const event: JourneyEvent = {
      id:crypto.randomUUID(),kind,path,page_type:journeyPage(path),navigation_id:navigationId,
      sequence:++sequence,elapsed_ms:Math.min(86400000, Math.round(performance.now()-started)),
      device:window.innerWidth<768?'mobile':window.innerWidth<1024?'tablet':'desktop',
      qa: qaNavigation,
      product_id:context.productId || marker?.dataset.productId || undefined,
      variant_id:context.variantId || ((!context.productId || context.productId===marker?.dataset.productId) ? marker?.dataset.variantId : undefined),
      metadata:{...metadata,option_code:metadata.option_code ? catalogueCode(metadata.option_code) : undefined},
    }
    queue.push(event)
    if (queue.length > 40) queue.shift()
    clearTimeout(timer); timer=setTimeout(flushJourney, queue.length >= 20 ? 0 : 1500)
    // Reuse the already-installed Google tag. This is a custom interaction,
    // never an ecommerce event, Ads conversion or Meta event.
    if (!event.qa) {
      const w=window as unknown as {gtag?:(...args:unknown[])=>void}
      w.gtag?.('event','journey_interaction', {
        send_to:GA_ID, interaction_type:kind, page_type:event.page_type,
        content_group:event.page_type, cta_position:metadata.surface,
        product_id:event.product_id, variant_id:event.variant_id,
        option_code:event.metadata.option_code, section_name:metadata.section,
        scroll_percent:metadata.depth, interaction_outcome:metadata.outcome,
        checkout_step:metadata.step, page_location:window.location.origin+path,
        page_referrer:new URL(document.referrer || window.location.origin).origin===window.location.origin && publicJourneyPath(new URL(document.referrer || window.location.origin).pathname)
          ? new URL(document.referrer || window.location.origin).origin+new URL(document.referrer || window.location.origin).pathname : '',
      })
    }
  } catch { /* Includes unavailable storage/crypto/tag implementations. */ }
}
/** Mirror only the vocabulary; never copy arbitrary metadata or form values. */
export function mirrorJourneyAction(action:string, context:{productId?:string;variantId?:string;metadata?:{step?:string;value?:string}}={}, dedupeKey?:string) {
  if(!(JOURNEY_KINDS as readonly string[]).includes(action)) return
  const meta:JourneyMeta={}
  if(context.metadata?.step && ['cart','delivery','success','seats','size','design','fabric','feet','piping','notes','summary'].includes(context.metadata.step))
    meta.step=context.metadata.step as JourneyMeta['step']
  // Existing values on these handlers come only from catalogue choices.
  if(/^(builder_(fabric|feet|piping|design|size)_selected|pdp_(size|style)_selected)$/.test(action) && context.metadata?.value) {
    meta.option_code=catalogueCode(context.metadata.value)
  }
  trackJourney(action as JourneyKind,meta,context,dedupeKey?'legacy:'+dedupeKey:undefined)
}
if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_CHANGED_EVENT, () => {
    try { if(getConsent() !== 'granted') {queue=[];clearTimeout(timer);once.clear()} } catch {queue=[]}
  })
}
