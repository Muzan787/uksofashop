from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, old: str, new: str, path: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    return text.replace(old, new, 1)


# ── Persist the exact acquisition WhatsApp reference in the browser. ─────────
path = 'src/utils/attribution/whatsapp.ts'
text = read(path)
text = replace_once(
    text,
    "export const WHATSAPP_REFERENCE_PATTERN = /^UKSS-WA-\\d{6}-[A-Z0-9]{6}$/\n",
    "export const WHATSAPP_REFERENCE_PATTERN = /^UKSS-WA-\\d{6}-[A-Z0-9]{6}$/\n\n"
    "/** Functional first-party cookie carrying the most recent acquisition WhatsApp reference. */\n"
    "export const WHATSAPP_REFERENCE_COOKIE = 'uksofashop_wa'\n"
    "/** Long enough for a normal WhatsApp-assisted purchase, bounded to avoid stale automatic linkage. */\n"
    "export const WHATSAPP_REFERENCE_MAX_AGE_S = 30 * 24 * 60 * 60\n",
    path,
)
text = replace_once(
    text,
    "export function isValidWhatsAppReference(value: string): boolean {\n  return WHATSAPP_REFERENCE_PATTERN.test(value.trim().toUpperCase())\n}\n",
    "export function isValidWhatsAppReference(value: string): boolean {\n"
    "  return WHATSAPP_REFERENCE_PATTERN.test(value.trim().toUpperCase())\n"
    "}\n\n"
    "/** Persist only acquisition references; support-only CTAs never call this. */\n"
    "export function persistWhatsAppReference(reference: string): void {\n"
    "  if (typeof document === 'undefined') return\n"
    "  const clean = reference.trim().toUpperCase()\n"
    "  if (!isValidWhatsAppReference(clean)) return\n"
    "  document.cookie =\n"
    "    `${WHATSAPP_REFERENCE_COOKIE}=${encodeURIComponent(clean)}; path=/; max-age=${WHATSAPP_REFERENCE_MAX_AGE_S}; samesite=lax`\n"
    "}\n",
    path,
)
write(path, text)


# ── CTA writes that reference before opening WhatsApp. ────────────────────────
path = 'src/utils/attribution/useWhatsAppCTA.ts'
text = read(path)
text = replace_once(
    text,
    "  sendWhatsAppEnquiry,\n} from './whatsapp'\n",
    "  sendWhatsAppEnquiry,\n  persistWhatsAppReference,\n} from './whatsapp'\n",
    path,
)
text = replace_once(
    text,
    "    // Changing the DOM href inside the click handler happens before the\n"
    "    // browser's default anchor navigation. Repeated clicks in the same context\n"
    "    // therefore reuse the same prepared reference, while a new product/variant\n"
    "    // gets a new one without needing React state or an effect.\n"
    "    event.currentTarget.href = whatsAppHref(withReferenceLine(opts.message, reference))\n",
    "    // Keep the exact acquisition reference in a functional first-party cookie\n"
    "    // before WhatsApp opens. Checkout can then link the later website order\n"
    "    // back to this enquiry, but only after server-side visitor/context checks.\n"
    "    persistWhatsAppReference(reference)\n\n"
    "    // Changing the DOM href inside the click handler happens before the\n"
    "    // browser's default anchor navigation. Repeated clicks in the same context\n"
    "    // therefore reuse the same prepared reference, while a new product/variant\n"
    "    // gets a new one without needing React state or an effect.\n"
    "    event.currentTarget.href = whatsAppHref(withReferenceLine(opts.message, reference))\n",
    path,
)
write(path, text)


# ── Pure linkage rule so it can be deterministically tested without DB writes. ─
path = 'src/utils/attribution/checkoutLinkage.ts'
Path(path).write_text("""// src/utils/attribution/checkoutLinkage.ts\n//\n// Automatic website-order -> WhatsApp linkage is deliberately conservative.\n// A reference alone is not enough: it must still belong to the same persistent\n// browser visitor, be recent, unclaimed, and (for a product enquiry) match a\n// variant that is actually in the checkout basket. Cross-device historical\n// attribution therefore remains a manual evidence decision rather than an\n// automatic guess.\n\nexport interface CheckoutWhatsAppEnquiry {\n  reference: string\n  created_at: string\n  visitor_id: string | null\n  product_id: string | null\n  variant_id: string | null\n  converted_order_id: string | null\n}\n\ninterface MatchInput {\n  visitorId: string | null\n  cartVariantIds: string[]\n  enquiry: CheckoutWhatsAppEnquiry\n  maxAgeSeconds: number\n  nowMs?: number\n}\n\nexport function isDeterministicCheckoutWhatsAppMatch({\n  visitorId,\n  cartVariantIds,\n  enquiry,\n  maxAgeSeconds,\n  nowMs = Date.now(),\n}: MatchInput): boolean {\n  if (!visitorId || !enquiry.visitor_id || enquiry.visitor_id !== visitorId) return false\n  if (enquiry.converted_order_id) return false\n\n  const createdAtMs = Date.parse(enquiry.created_at)\n  if (!Number.isFinite(createdAtMs)) return false\n  const ageMs = nowMs - createdAtMs\n  if (ageMs < 0 || ageMs > maxAgeSeconds * 1000) return false\n\n  // Product enquiries must identify a concrete variant and that exact variant\n  // must be in the basket. A product id without a variant is too ambiguous to\n  // auto-link. Generic acquisition enquiries have neither and may link by the\n  // same-visitor persisted reference alone.\n  if (enquiry.variant_id) return cartVariantIds.includes(enquiry.variant_id)\n  if (enquiry.product_id) return false\n  return true\n}\n""")


# ── Checkout writes attribution with service role and links WhatsApp safely. ──
path = 'src/app/actions/checkout.ts'
text = read(path)
text = replace_once(
    text,
    "import { metaFbcFromTouch } from '@/utils/attribution/fbc'\n",
    "import { metaFbcFromTouch } from '@/utils/attribution/fbc'\n"
    "import {\n"
    "  WHATSAPP_REFERENCE_COOKIE,\n"
    "  WHATSAPP_REFERENCE_MAX_AGE_S,\n"
    "  isValidWhatsAppReference,\n"
    "} from '@/utils/attribution/whatsapp'\n"
    "import { isDeterministicCheckoutWhatsAppMatch } from '@/utils/attribution/checkoutLinkage'\n",
    path,
)
old_block_start = "  const attribution = {\n"
start = text.index(old_block_start)
end_marker = "\n\n  return { success: true, orderId: shortCode, total: Number(order.total_amount) }"
end = text.index(end_marker, start)
old = text[start:end]
new = """  const admin = createAdminClient()\n\n  // The session ledger is a server-side fallback for operational context that\n  // may not live in the consent-gated last-touch cookie (notably landing page\n  // and referrer). Current request cookies remain the first choice.\n  const currentVisitorId = jar.get('uksofashop_vid')?.value ?? null\n  const currentSessionId = jar.get('uksofashop_sid')?.value ?? null\n  const currentArrivalId = jar.get('uksofashop_aid')?.value ?? null\n\n  let sessionEvidence: {\n    gclid: string | null\n    gbraid: string | null\n    wbraid: string | null\n    fbclid: string | null\n    last_touch_source: string | null\n    last_touch_medium: string | null\n    last_touch_campaign: string | null\n    last_touch_content: string | null\n    last_touch_term: string | null\n    ga_client_id: string | null\n    meta_fbp: string | null\n    meta_fbc: string | null\n    landing_page: string | null\n    referrer: string | null\n  } | null = null\n\n  if (currentSessionId) {\n    const { data: evidence, error: evidenceError } = await admin\n      .from('attribution_sessions')\n      .select('gclid, gbraid, wbraid, fbclid, last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_term, ga_client_id, meta_fbp, meta_fbc, landing_page, referrer')\n      .eq('session_id', currentSessionId)\n      .maybeSingle()\n    if (evidenceError) {\n      console.error(`Could not read checkout attribution session for order ${shortCode}`, evidenceError)\n    } else {\n      sessionEvidence = evidence\n    }\n  }\n\n  let linkedWhatsAppReference: string | null = null\n  let linkedEnquiry: {\n    reference: string\n    created_at: string\n    visitor_id: string | null\n    product_id: string | null\n    variant_id: string | null\n    converted_order_id: string | null\n    gclid: string | null\n    gbraid: string | null\n    wbraid: string | null\n    fbclid: string | null\n    utm_source: string | null\n    utm_medium: string | null\n    utm_campaign: string | null\n    utm_content: string | null\n    utm_term: string | null\n    ga_client_id: string | null\n    meta_fbp: string | null\n    meta_fbc: string | null\n  } | null = null\n\n  const rawWhatsAppReference = jar.get(WHATSAPP_REFERENCE_COOKIE)?.value\n  if (rawWhatsAppReference && isValidWhatsAppReference(rawWhatsAppReference)) {\n    const candidateReference = rawWhatsAppReference.trim().toUpperCase()\n    const { data: enquiry, error: enquiryError } = await admin\n      .from('whatsapp_enquiries')\n      .select('reference, created_at, visitor_id, product_id, variant_id, converted_order_id, gclid, gbraid, wbraid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ga_client_id, meta_fbp, meta_fbc')\n      .eq('reference', candidateReference)\n      .maybeSingle()\n\n    if (enquiryError) {\n      console.error(`Could not read WhatsApp enquiry ${candidateReference}`, enquiryError)\n    } else if (enquiry && isDeterministicCheckoutWhatsAppMatch({\n      visitorId: currentVisitorId,\n      cartVariantIds: validatedItems.data.map(item => item.variant_id),\n      enquiry,\n      maxAgeSeconds: WHATSAPP_REFERENCE_MAX_AGE_S,\n    })) {\n      const convertedAt = new Date().toISOString()\n      const { data: claimed, error: claimError } = await admin\n        .from('whatsapp_enquiries')\n        .update({ converted_order_id: order.id, converted_at: convertedAt })\n        .eq('reference', candidateReference)\n        .is('converted_order_id', null)\n        .select('reference')\n\n      if (claimError) {\n        console.error(`Could not link WhatsApp enquiry ${candidateReference} to order ${shortCode}`, claimError)\n      } else if (claimed?.length === 1) {\n        linkedWhatsAppReference = candidateReference\n        linkedEnquiry = enquiry\n        // One acquisition enquiry may convert at most one order. Clear the\n        // browser hint as soon as the row is claimed so a later order cannot\n        // accidentally try to reuse it.\n        try {\n          jar.set(WHATSAPP_REFERENCE_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' })\n        } catch {\n          // The database claim is the real dedupe guard; cookie cleanup is hygiene.\n        }\n      }\n    }\n  }\n\n  const attribution = {\n    ga_client_id:\n      jar.get('_ga')?.value ?? sessionEvidence?.ga_client_id ?? linkedEnquiry?.ga_client_id ?? null,\n    meta_fbp:\n      jar.get('_fbp')?.value ?? sessionEvidence?.meta_fbp ?? linkedEnquiry?.meta_fbp ?? null,\n    meta_fbc:\n      jar.get('_fbc')?.value ?? metaFbcFromTouch(lastTouch) ??\n      sessionEvidence?.meta_fbc ?? linkedEnquiry?.meta_fbc ?? null,\n    // Meta requires client_user_agent for website events, and the IP\n    // materially improves match quality. They have to be taken from THIS\n    // request: at confirmation time the only headers available belong to the\n    // admin, and sending those would attribute the sale to their device.\n    customer_user_agent: hdrs.get('user-agent'),\n    customer_ip:\n      hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||\n      hdrs.get('x-real-ip') ||\n      null,\n\n    visitor_id: currentVisitorId,\n    session_id: currentSessionId,\n    arrival_id: currentArrivalId,\n\n    gclid: lastTouch.gclid ?? sessionEvidence?.gclid ?? linkedEnquiry?.gclid ?? null,\n    gbraid: lastTouch.gbraid ?? sessionEvidence?.gbraid ?? linkedEnquiry?.gbraid ?? null,\n    wbraid: lastTouch.wbraid ?? sessionEvidence?.wbraid ?? linkedEnquiry?.wbraid ?? null,\n    fbclid: lastTouch.fbclid ?? sessionEvidence?.fbclid ?? linkedEnquiry?.fbclid ?? null,\n\n    utm_source:\n      lastTouch.source ?? sessionEvidence?.last_touch_source ?? linkedEnquiry?.utm_source ?? null,\n    utm_medium:\n      lastTouch.medium ?? sessionEvidence?.last_touch_medium ?? linkedEnquiry?.utm_medium ?? null,\n    utm_campaign:\n      lastTouch.campaign ?? sessionEvidence?.last_touch_campaign ?? linkedEnquiry?.utm_campaign ?? null,\n    utm_content:\n      lastTouch.content ?? sessionEvidence?.last_touch_content ?? linkedEnquiry?.utm_content ?? null,\n    utm_term:\n      lastTouch.term ?? sessionEvidence?.last_touch_term ?? linkedEnquiry?.utm_term ?? null,\n\n    landing_page: lastTouch.landingPage ?? sessionEvidence?.landing_page ?? null,\n    referrer: lastTouch.referrer ?? sessionEvidence?.referrer ?? null,\n    whatsapp_reference: linkedWhatsAppReference,\n  }\n\n  const hasAnyAttribution = Object.values(attribution).some(v => v !== null && v !== undefined)\n\n  if (hasAnyAttribution) {\n    // This must use service role. The checkout visitor is anonymous and the\n    // orders table intentionally permits UPDATE only to authenticated admins;\n    // the previous anon update was therefore rejected by RLS on every website\n    // order even though place_order itself had succeeded.\n    const { error: attrError } = await admin\n      .from('orders')\n      .update(attribution)\n      .eq('id', order.id)\n    if (attrError) {\n      // Costs attribution quality on this one order, nothing more.\n      console.error(`Could not store attribution ids for order ${shortCode}`, attrError)\n    }\n\n    const { error: actionError } = await admin.from('attribution_actions').insert({\n      visitor_id: attribution.visitor_id,\n      session_id: attribution.session_id,\n      arrival_id: attribution.arrival_id,\n      action_type: 'order_placed',\n      order_id: order.id,\n      whatsapp_reference: linkedWhatsAppReference,\n    })\n    if (actionError) {\n      console.error(`Could not write attribution_actions row for order ${shortCode}`, actionError)\n    }\n  }\n"""
text = text[:start] + new + text[end:]
write(path, text)


# ── Customer confirmation uses service role for timestamp and conversion. ────
path = 'src/app/actions/orders.ts'
text = read(path)
text = replace_once(
    text,
    "import { createClient } from '@/utils/supabase/server'\n",
    "import { createClient } from '@/utils/supabase/server'\nimport { createAdminClient } from '@/utils/supabase/admin'\n",
    path,
)
text = text.replace(
    "reportOrderConversion(\n        supabase,\n        orderId,\n        newStatus === 'confirmed' ? 'purchase' : 'delivered',\n      )",
    "reportOrderConversion(\n        orderId,\n        newStatus === 'confirmed' ? 'purchase' : 'delivered',\n      )",
)
old = """  // confirm_order (the RPC) predates confirmed_at and isn't tracked in this
  // repository's migrations, so it doesn't know about the column. Stamped
  // here instead, guarded the same "first time only" way updateOrderStatus
  // does it - the `is('confirmed_at', null)` predicate means a customer
  // re-opening the confirmation link never moves the timestamp a second time.
  await supabase
    .from('orders')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('confirmed_at', null)

  // The customer confirming from their email reaches 'confirmed' too, so the
  // Purchase conversion has to be reported here as well. The guard column
  // means whichever path gets there first is the only one that reports.
  after(() => reportOrderConversion(supabase, orderId, 'purchase'))
"""
new = """  // confirm_order is SECURITY DEFINER and can confirm an anonymous customer
  // who possesses the emailed order UUID. The follow-up write cannot use that
  // anonymous client: orders UPDATE is admin-only under RLS. Service role is
  // safe here because it is server-only and constrained to the exact order the
  // RPC just handled, while the status predicate prevents stamping anything
  // that did not actually reach confirmed.
  const admin = createAdminClient()
  const { error: stampError } = await admin
    .from('orders')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'confirmed')
    .is('confirmed_at', null)

  if (stampError) {
    console.error(`Could not stamp confirmed_at for order ${orderId}`, stampError)
  }

  // The reporter uses its own service-role client and refuses to report a
  // Purchase without a genuine confirmed_at timestamp. Re-opening the link is
  // harmless: purchase_event_sent_at is still the one-time claim guard.
  after(() => reportOrderConversion(orderId, 'purchase'))
"""
text = replace_once(text, old, new, path)
write(path, text)


# ── Conversion reporter is server-authoritative regardless of caller auth. ───
path = 'src/utils/orderConversions.ts'
text = read(path)
text = text.replace("import type { SupabaseClient } from '@supabase/supabase-js'\n", '')
text = text.replace("import type { Database } from '@/types/supabase'\n", '')
text = text.replace("\ntype Client = SupabaseClient<Database>\n", '')
text = replace_once(
    text,
    "export async function reportOrderConversion(\n  supabase: Client,\n  orderId: string,\n  kind: ConversionKind,\n): Promise<void> {",
    "export async function reportOrderConversion(\n  orderId: string,\n  kind: ConversionKind,\n): Promise<void> {",
    path,
)
text = replace_once(
    text,
    "    const sentColumn = SENT_COLUMN[kind]\n\n",
    "    const sentColumn = SENT_COLUMN[kind]\n    // Conversion reporting is a server-side business operation, not a caller-\n"
    "    scoped customer query. Using one service-role client here avoids the\n"
    "    anonymous customer-confirmation RLS dead end that previously returned\n"
    "    before Meta, GA4, the audit ledger or Google staging could run.\n"
    "    const admin = createAdminClient()\n\n",
    path,
)
text = text.replace("    const { data: order } = await supabase\n      .from('orders')", "    const { data: order } = await admin\n      .from('orders')", 1)
text = replace_once(
    text,
    "    if (!order) return\n\n    const alreadySent = (order as Record<string, unknown>)[sentColumn]\n",
    "    if (!order) return\n\n"
    "    // Never invent the business-event time for a historical row. Future\n"
    "    // app confirmations stamp these first; a legacy/null timestamp must be\n"
    "    // corrected explicitly before any Purchase/Delivered conversion runs.\n"
    "    if (kind === 'purchase' && !order.confirmed_at) return\n"
    "    if (kind === 'delivered' && !order.delivered_at) return\n\n"
    "    const alreadySent = (order as Record<string, unknown>)[sentColumn]\n",
    path,
)
text = text.replace("    const { data: claimed } = await supabase\n      .from('orders')", "    const { data: claimed } = await admin\n      .from('orders')", 1)
text = text.replace("    const { data: lines } = await supabase\n      .from('order_items')", "    const { data: lines } = await admin\n      .from('order_items')", 1)
text = replace_once(
    text,
    "    const admin = createAdminClient()\n\n    // Best-effort and never allowed to affect anything above - both sends\n",
    "    // Best-effort and never allowed to affect anything above - both sends\n",
    path,
)
write(path, text)


# ── Cron calls new reporter and refuses timestamp-less historical purchases. ─
path = 'src/app/api/cron/conversions/route.ts'
text = read(path)
text = replace_once(
    text,
    "    .is('purchase_event_sent_at', null)\n    .gte('created_at', since)\n",
    "    .is('purchase_event_sent_at', null)\n    .not('confirmed_at', 'is', null)\n    .gte('created_at', since)\n",
    path,
)
text = text.replace("await reportOrderConversion(supabase, order.id, 'purchase')", "await reportOrderConversion(order.id, 'purchase')")
text = text.replace("await reportOrderConversion(supabase, order.id, 'delivered')", "await reportOrderConversion(order.id, 'delivered')")
write(path, text)

print('Tracking V2.1 patch applied')
