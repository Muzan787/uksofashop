import { GOOGLE_POLICY_VERSION, googleConsent, GOOGLE_DATALAYER_ENABLED, GOOGLE_GTM_QA_ENABLED } from './googleMeasurement'
const GOOGLE_CONSENT_DETAILS = 'ukss_google_consent_v1'
export function recordGoogleChoice(value: 'granted'|'denied', reason: 'granted'|'denied'|'revoked') {
  try { localStorage.setItem(GOOGLE_CONSENT_DETAILS,JSON.stringify({id:crypto.randomUUID(),value,reason,
    captured_at:new Date().toISOString(),policy_version:GOOGLE_POLICY_VERSION,surface:'cookie_banner'})) } catch { /* no export evidence */ }
  persistGoogleConsent()
}
/** Restoring an old answer never fabricates its timestamp or policy. */
export function persistGoogleConsent() {
  if (!GOOGLE_DATALAYER_ENABLED) return
  try {
    const details = JSON.parse(localStorage.getItem(GOOGLE_CONSENT_DETAILS) || 'null')
    if (!details || details.policy_version!==GOOGLE_POLICY_VERSION) return
    const consent=googleConsent()
    if (consent.ad_user_data !== details.value) return
    const body={...details,consent}
    const layer=(window as unknown as {dataLayer:unknown[]}).dataLayer ||= []
    layer.push({event:'ukss.consent_update',ukss:{schema_version:1,consent:{...consent,
      captured_at:details.captured_at,policy_version:details.policy_version,reason:details.reason}}})
    if (GOOGLE_GTM_QA_ENABLED) return // QA never writes a production consent receipt.
    const send=()=>{ void fetch('/api/google/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{}) }
    send(); window.setTimeout(send,1000)
  } catch { /* consent persistence cannot interrupt checkout */ }
}
