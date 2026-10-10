'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CONSENT_CHANGED_EVENT } from '@/utils/consent'
import { flushJourney, resetJourney, trackJourney, journeyConsent } from '@/utils/journey'
import { publicJourneyPath, scrollThresholds, type JourneyMeta, type JourneySurface } from '@/utils/journeyContract'

export default function JourneyAnalytics() {
  const pathname=usePathname()
  useEffect(() => {
    if(!publicJourneyPath(pathname)) return
    resetJourney(pathname)
    const seen=new Set<number>(), sections=new Set<string>(), leftSections=new Set<string>()
    let observed=new WeakSet<Element>()
    let raf=0, activeAt=performance.now(), engaged=0, first=false
    const depth=()=>{
      raf=0
      if(!journeyConsent() || document.visibilityState !== 'visible') return
      scrollThresholds(window.scrollY,window.innerHeight,document.documentElement.scrollHeight,seen)
        .forEach(n=>trackJourney('scroll_depth',{depth:n}, {}, 'scroll:'+n))
    }
    const queueDepth=()=>{if(!raf) raf=requestAnimationFrame(depth)}
    const enter=()=>{if(journeyConsent()) {activeAt=performance.now();trackJourney('page_enter',{}, {}, 'enter');queueDepth();observer.disconnect();observed=new WeakSet();observe()}}
    const observer=new IntersectionObserver(entries=>{
      for(const e of entries) {
        const section=(e.target as HTMLElement).dataset.journeySection as JourneyMeta['section']
        if(!section || !journeyConsent()) continue
        if(!e.isIntersecting) {
          if(sections.has(section) && !leftSections.has(section)) {leftSections.add(section);trackJourney('section_exit',{section},{},'section_exit:'+section)}
          continue
        }
        if(e.intersectionRatio<0.25 && e.intersectionRect.height<200) continue
        if(!sections.has(section)) {
          sections.add(section);trackJourney('section_view',{section},{},'section:'+section)
        }
      }
    },{threshold:[0,0.01,0.1,0.25]})
    const observe=()=>document.querySelectorAll('[data-journey-section]').forEach(el=>{if(!observed.has(el)){observed.add(el);observer.observe(el)}})
    // One debounced observer covers lazy content and modal/SPA updates.
    let mutationTimer:ReturnType<typeof setTimeout>|undefined
    const mutation=new MutationObserver(()=>{
      clearTimeout(mutationTimer);mutationTimer=setTimeout(()=>{observe();queueDepth()},250)
    })
    mutation.observe(document.body,{childList:true,subtree:true})
    const click=(e:MouseEvent)=>{
      if(!(e.target instanceof Element) || !journeyConsent()) return
      const element=e.target.closest<HTMLElement>('a,button,[role="button"]')
      if(!element || element.closest('[inert]')) return
      if(!first) {first=true;trackJourney('first_interaction')}
      const surface:JourneySurface=element.closest('header')?'header':element.closest('footer')?'footer':
        element.closest<HTMLElement>('[data-journey-surface]')?.dataset.journeySurface as JourneySurface || (pathname==='/'?'home':pathname.startsWith('/shop/')||pathname.startsWith('/collection')?'collection':'other')
      if(element instanceof HTMLAnchorElement) {
        const url=new URL(element.href,location.origin)
        if(url.hostname==='wa.me' || url.hostname==='api.whatsapp.com') trackJourney('whatsapp_outbound',{surface})
        else if(url.protocol==='tel:') trackJourney('phone_outbound',{surface})
        else if(url.origin===location.origin) {
          const destination=publicJourneyPath(url.pathname)
          if(destination && destination!==pathname) trackJourney(element.closest('[data-journey-product]')?'product_click':'navigation',
            {surface,destination,source_product_id:document.querySelector<HTMLElement>('[data-whatsapp-product-context]')?.dataset.productId}, {productId:element.closest<HTMLElement>('[data-journey-product]')?.dataset.journeyProduct})
        }
      }
    }
    const visibility=()=>{
      const now=performance.now()
      if(document.hidden) {engaged+=Math.max(0,now-activeAt);flushJourney()}
      else {activeAt=now;queueDepth()}
    }
    const exit=()=>{
      const elapsed=engaged+(document.hidden?0:performance.now()-activeAt)
      trackJourney('page_exit',{engaged_ms:Math.min(86400000,Math.round(elapsed))},{path:pathname},'exit')
      flushJourney()
    }
    enter();observe()
    window.addEventListener('scroll',queueDepth,{passive:true})
    window.addEventListener('resize',queueDepth,{passive:true})
    window.addEventListener('pagehide',exit)
    document.addEventListener('visibilitychange',visibility)
    document.addEventListener('click',click,true)
    window.addEventListener(CONSENT_CHANGED_EVENT,enter)
    return ()=>{
      // Route change preserves the departing page's context until this runs.
      exit();cancelAnimationFrame(raf);clearTimeout(mutationTimer);observer.disconnect();mutation.disconnect()
      window.removeEventListener('scroll',queueDepth);window.removeEventListener('resize',queueDepth)
      window.removeEventListener('pagehide',exit);document.removeEventListener('visibilitychange',visibility)
      document.removeEventListener('click',click,true);window.removeEventListener(CONSENT_CHANGED_EVENT,enter)
    }
  },[pathname])
  return null
}
