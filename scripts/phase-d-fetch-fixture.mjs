// QA-only fetch fixture loaded with NODE_OPTIONS by the direct-HTTPS runner.
// Production source is untouched. Public storefront reads may pass through to
// the real Supabase project; every write/admin RPC used by this harness is
// intercepted so the pre-release run cannot create production rows.

const originalFetch = globalThis.fetch.bind(globalThis)
const SUPABASE_ORIGIN = 'https://nznpeqjnoobhyxwnmsez.supabase.co'

const TIER_BY_VARIANT = new Map([
  ['1ba97d1f-f890-48f8-8ab9-57cbb147f388', 'ELECTRIC'],
  ['7af910cd-3025-4c08-ad65-e86a39beb768', 'ELECTRIC'],
  ['4b6dc9c2-91ec-432f-9735-abb6899b1a95', 'ROMA'],
  ['e3ed0121-2990-4f17-b4f3-103da614f228', 'STANDARD'],
  ['477b6305-82e2-4ace-8594-dda75cc47244', 'EXCLUDED'],
  ['f262accc-1287-4375-984e-e677afd5aa01', 'EXCLUDED'],
])

const PRICE_BY_VARIANT = new Map([
  ['1ba97d1f-f890-48f8-8ab9-57cbb147f388', 999],
  ['7af910cd-3025-4c08-ad65-e86a39beb768', 999],
  ['4b6dc9c2-91ec-432f-9735-abb6899b1a95', 350],
  ['e3ed0121-2990-4f17-b4f3-103da614f228', 749],
  ['477b6305-82e2-4ace-8594-dda75cc47244', 369],
  ['f262accc-1287-4375-984e-e677afd5aa01', 149],
])

const PRIORITY = { ELECTRIC: 4, ROMA: 3, STANDARD: 2, EXCLUDED: 1 }
const AMOUNT = { ELECTRIC: 50, ROMA: 30, STANDARD: 20, EXCLUDED: 0 }

function json(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
}

function requestUrl(input) {
  if (input instanceof URL) return input
  if (typeof input === 'string') return new URL(input)
  return new URL(input.url)
}

function methodOf(input, init) {
  return String(init?.method || (typeof input === 'object' && input && 'method' in input ? input.method : '') || 'GET').toUpperCase()
}

async function requestJson(input, init) {
  const raw = init?.body ?? (typeof input === 'object' && input && 'clone' in input ? await input.clone().text() : '')
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

function offerQuote(body) {
  const items = Array.isArray(body.p_items) ? body.p_items : []
  let subtotal = 0
  let tier = null
  let tierPriority = 0

  for (const item of items) {
    const id = String(item?.variant_id || '')
    const quantity = Math.max(1, Math.min(99, Number(item?.quantity || 1)))
    subtotal += (PRICE_BY_VARIANT.get(id) || 0) * quantity
    const nextTier = TIER_BY_VARIANT.get(id)
    if (nextTier && PRIORITY[nextTier] > tierPriority) {
      tier = nextTier
      tierPriority = PRIORITY[nextTier]
    }
  }

  const normalized = String(body.p_promotion_code || '').trim().toUpperCase()
  const codeValid = normalized === 'SOFAEXTRA'
  const entitlementValid = Boolean(body.p_offer_entitlement_token)
  const valid = codeValid || entitlementValid
  const amount = valid && tier ? Math.min(subtotal, AMOUNT[tier]) : 0

  return {
    items_subtotal: subtotal,
    code_valid: codeValid,
    entitlement_valid: entitlementValid,
    normalized_code: codeValid ? 'SOFAEXTRA' : null,
    discount_amount: amount,
    discount_tier: valid ? tier : null,
    promotion_code: codeValid ? 'SOFAEXTRA' : null,
    offer_source: codeValid ? 'manual_code' : entitlementValid ? 'paid_entitlement' : null,
  }
}

function homedataFixture(postcode) {
  const p = postcode.toUpperCase().trim()
  if (p === 'IV40 8AE') return json({ suggestions: [{ address: '1 Main Street, Kyle of Lochalsh, IV40 8AE' }] })
  if (p === 'IV40 8PB') return json({ suggestions: [{ address: '1 Inverarish, Isle of Raasay, IV40 8PB' }] })
  if (p === 'PA34 5AB') return json({ suggestions: [{ address: '1 George Street, Oban, PA34 5AB' }] })
  if (p === 'PA34 4UB') return json({ suggestions: [{ address: '1 Cullipool, Isle of Luing, PA34 4UB' }] })
  if (p === 'IV40 8ZZ' || p === 'PA34 5ZZ') return json({ detail: 'controlled lookup unavailable' }, 503)
  return json({ suggestions: [{ address: `1 Controlled QA Address, ${p}` }] })
}

const qaGlobals = globalThis
if (typeof qaGlobals.__PHASE_D_QA_PLACE_ORDER_CALLS__ !== 'number') {
  qaGlobals.__PHASE_D_QA_PLACE_ORDER_CALLS__ = 0
}

globalThis.fetch = async function phaseDFixtureFetch(input, init) {
  const url = requestUrl(input)
  const method = methodOf(input, init)

  if (url.hostname === 'api.homedata.co.uk' && url.pathname.includes('/api/address/find/')) {
    return homedataFixture(url.searchParams.get('q') || '')
  }

  if (url.origin === SUPABASE_ORIGIN) {
    if (url.pathname.endsWith('/rest/v1/rpc/calculate_order_offer') && method === 'POST') {
      return json(offerQuote(await requestJson(input, init)))
    }

    if (url.pathname.endsWith('/rest/v1/rpc/issue_paid_offer_entitlement') && method === 'POST') {
      const now = new Date()
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return json({
        token: '11111111-1111-4111-8111-111111111111',
        source: 'google_ads',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
    }

    if (url.pathname.endsWith('/rest/v1/rpc/place_order') && method === 'POST') {
      qaGlobals.__PHASE_D_QA_PLACE_ORDER_CALLS__ += 1
      // A mainland Server Action is allowed to reach this point, but the QA
      // backend always rejects before any order can be created.
      return json({
        code: '23514',
        details: null,
        hint: null,
        message: 'PRICE_MISMATCH',
      }, 400)
    }

    if (url.pathname.includes('/rest/v1/offer_entitlements') && method === 'GET') {
      const now = new Date()
      return json({
        source: 'google_ads',
        started_at: new Date(now.getTime() - 60_000).toISOString(),
        expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        revoked_at: null,
      })
    }

    // Never let the pre-release direct-HTTPS harness mutate production. Public
    // GET/HEAD reads (catalogue/nav/PDP) are allowed through; all other writes
    // not explicitly modelled above are converted into harmless no-op replies.
    if (method !== 'GET' && method !== 'HEAD') {
      console.log(`[phase-d-fixture] blocked Supabase ${method} ${url.pathname}`)
      return new Response(null, { status: 204 })
    }
  }

  return originalFetch(input, init)
}
