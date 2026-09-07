from pathlib import Path


def replace_once(text: str, old: str, new: str, path: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    return text.replace(old, new, 1)


# 1) Acquisition WhatsApp cookie: server-readable, bounded, and Secure on HTTPS.
path = 'src/utils/attribution/whatsapp.ts'
text = Path(path).read_text()
text = replace_once(
    text,
    "  document.cookie =\n    `${WHATSAPP_REFERENCE_COOKIE}=${encodeURIComponent(clean)}; path=/; max-age=${WHATSAPP_REFERENCE_MAX_AGE_S}; samesite=lax`\n",
    "  const secure = window.location.protocol === 'https:' ? '; secure' : ''\n"
    "  document.cookie =\n"
    "    `${WHATSAPP_REFERENCE_COOKIE}=${encodeURIComponent(clean)}; path=/; max-age=${WHATSAPP_REFERENCE_MAX_AGE_S}; samesite=lax${secure}`\n",
    path,
)
Path(path).write_text(text)


# 2) Checkout evidence must resolve the exact current arrival, never an arbitrary
# row from a session that may contain multiple meaningful arrivals. WhatsApp
# linkage remains separate from checkout attribution: linked enquiry marketing
# ids are NOT copied into the order's browser-context fields.
path = 'src/app/actions/checkout.ts'
text = Path(path).read_text()
text = replace_once(text, "  if (currentSessionId) {\n", "  if (currentArrivalId) {\n", path)
text = replace_once(text, ".eq('session_id', currentSessionId)\n", ".eq('arrival_id', currentArrivalId)\n", path)
text = replace_once(
    text,
    "      console.error(`Could not read checkout attribution session for order ${shortCode}`, evidenceError)\n",
    "      console.error(`Could not read checkout attribution arrival for order ${shortCode}`, evidenceError)\n",
    path,
)

# Narrow the enquiry row to evidence used only for deterministic linkage.
for line in [
    "    gclid: string | null\n",
    "    gbraid: string | null\n",
    "    wbraid: string | null\n",
    "    fbclid: string | null\n",
    "    utm_source: string | null\n",
    "    utm_medium: string | null\n",
    "    utm_campaign: string | null\n",
    "    utm_content: string | null\n",
    "    utm_term: string | null\n",
    "    ga_client_id: string | null\n",
    "    meta_fbp: string | null\n",
    "    meta_fbc: string | null\n",
]:
    text = replace_once(text, line, '', path)
text = replace_once(
    text,
    ".select('reference, created_at, visitor_id, product_id, variant_id, converted_order_id, gclid, gbraid, wbraid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ga_client_id, meta_fbp, meta_fbc')\n",
    ".select('reference, created_at, visitor_id, product_id, variant_id, converted_order_id')\n",
    path,
)
for suffix in [
    " ?? linkedEnquiry?.ga_client_id",
    " ?? linkedEnquiry?.meta_fbp",
    " ?? linkedEnquiry?.meta_fbc",
    " ?? linkedEnquiry?.gclid",
    " ?? linkedEnquiry?.gbraid",
    " ?? linkedEnquiry?.wbraid",
    " ?? linkedEnquiry?.fbclid",
    " ?? linkedEnquiry?.utm_source",
    " ?? linkedEnquiry?.utm_medium",
    " ?? linkedEnquiry?.utm_campaign",
    " ?? linkedEnquiry?.utm_content",
    " ?? linkedEnquiry?.utm_term",
]:
    text = replace_once(text, suffix, '', path)

# Replace the reference-resolution block so stale/claimed/wrong-visitor cookies
# retire, exact-variant mismatches remain available for a later matching basket,
# and the acquisition cookie is cleared only after the order update succeeds.
start = text.index("  const rawWhatsAppReference = jar.get(WHATSAPP_REFERENCE_COOKIE)?.value\n")
end = text.index("\n\n  const attribution = {", start)
new_linkage = """  const retireWhatsAppReferenceCookie = () => {
    try {
      jar.set(WHATSAPP_REFERENCE_COOKIE, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.VERCEL_ENV === 'production',
      })
    } catch {
      // Database state is authoritative; cookie cleanup is best-effort hygiene.
    }
  }

  const rawWhatsAppReference = jar.get(WHATSAPP_REFERENCE_COOKIE)?.value
  if (rawWhatsAppReference) {
    if (!isValidWhatsAppReference(rawWhatsAppReference)) {
      retireWhatsAppReferenceCookie()
    } else {
      const candidateReference = rawWhatsAppReference.trim().toUpperCase()
      const { data: enquiry, error: enquiryError } = await admin
        .from('whatsapp_enquiries')
        .select('reference, created_at, visitor_id, product_id, variant_id, converted_order_id')
        .eq('reference', candidateReference)
        .maybeSingle()

      if (enquiryError) {
        console.error(`Could not read WhatsApp enquiry ${candidateReference}`, enquiryError)
      } else if (!enquiry) {
        retireWhatsAppReferenceCookie()
      } else {
        const createdAtMs = Date.parse(enquiry.created_at)
        const ageMs = Date.now() - createdAtMs
        const stale =
          !Number.isFinite(createdAtMs) ||
          ageMs < 0 ||
          ageMs > WHATSAPP_REFERENCE_MAX_AGE_S * 1000
        const wrongVisitor =
          !currentVisitorId ||
          !enquiry.visitor_id ||
          enquiry.visitor_id !== currentVisitorId
        const permanentlyAmbiguousProduct = Boolean(enquiry.product_id && !enquiry.variant_id)

        if (stale || enquiry.converted_order_id || wrongVisitor || permanentlyAmbiguousProduct) {
          retireWhatsAppReferenceCookie()
        } else if (isDeterministicCheckoutWhatsAppMatch({
          visitorId: currentVisitorId,
          cartVariantIds: validatedItems.data.map(item => item.variant_id),
          enquiry,
          maxAgeSeconds: WHATSAPP_REFERENCE_MAX_AGE_S,
        })) {
          const linkedAt = new Date().toISOString()
          const { data: claimed, error: claimError } = await admin
            .from('whatsapp_enquiries')
            .update({ converted_order_id: order.id, converted_at: linkedAt })
            .eq('reference', candidateReference)
            .is('converted_order_id', null)
            .select('reference')

          if (claimError) {
            console.error(`Could not link WhatsApp enquiry ${candidateReference} to order ${shortCode}`, claimError)
          } else if (claimed?.length === 1) {
            linkedWhatsAppReference = candidateReference
            linkedEnquiry = enquiry
          }
        }
      }
    }
  }"""
text = text[:start] + new_linkage + text[end:]

# linkedEnquiry is intentionally retained only as proof the claim succeeded;
# checkout attribution below uses the current request/arrival context exclusively.
text = replace_once(
    text,
    "  const attribution = {\n",
    "  void linkedEnquiry\n\n  const attribution = {\n",
    path,
)

# Safely ordered claim: if the single order-attribution update fails, release
# the enquiry claim. Clear the browser cookie only after both sides are linked.
block_start = text.index("  if (hasAnyAttribution) {\n")
block_end = text.index("\n\n  return { success: true, orderId: shortCode, total: Number(order.total_amount) }", block_start)
new_persist = """  if (hasAnyAttribution) {
    // This must use service role. The checkout visitor is anonymous and the
    // orders table intentionally permits UPDATE only to authenticated admins;
    // the previous anon update was therefore rejected by RLS on every website
    // order even though place_order itself had succeeded.
    const { error: attrError } = await admin
      .from('orders')
      .update(attribution)
      .eq('id', order.id)

    if (attrError) {
      console.error(`Could not store attribution ids for order ${shortCode}`, attrError)

      // The enquiry was claimed first to prevent two orders racing for it. If
      // the corresponding order update fails, release only our own claim so
      // the database cannot be left saying the enquiry converted to an order
      // that does not carry the same reference.
      if (linkedWhatsAppReference) {
        const { error: rollbackError } = await admin
          .from('whatsapp_enquiries')
          .update({ converted_order_id: null, converted_at: null })
          .eq('reference', linkedWhatsAppReference)
          .eq('converted_order_id', order.id)
        if (rollbackError) {
          console.error(`Could not release WhatsApp claim ${linkedWhatsAppReference}`, rollbackError)
        }
      }
    } else if (linkedWhatsAppReference) {
      retireWhatsAppReferenceCookie()
    }

    const { error: actionError } = await admin.from('attribution_actions').insert({
      visitor_id: attribution.visitor_id,
      session_id: attribution.session_id,
      arrival_id: attribution.arrival_id,
      action_type: 'order_placed',
      order_id: order.id,
      whatsapp_reference: attrError ? null : linkedWhatsAppReference,
    })
    if (actionError) {
      console.error(`Could not write attribution_actions row for order ${shortCode}`, actionError)
    }
  }"""
text = text[:block_start] + new_persist + text[block_end:]
Path(path).write_text(text)


# 3) Customer confirmation: capture one real timestamp, stamp it once via the
# server-only privileged client, and never move it on repeat confirmation.
path = 'src/app/actions/orders.ts'
text = Path(path).read_text()
text = replace_once(
    text,
    "  const admin = createAdminClient()\n  const { error: stampError } = await admin\n",
    "  const confirmedAt = new Date().toISOString()\n  const admin = createAdminClient()\n  const { error: stampError } = await admin\n",
    path,
)
text = replace_once(
    text,
    ".update({ confirmed_at: new Date().toISOString() })\n",
    ".update({ confirmed_at: confirmedAt })\n",
    path,
)
Path(path).write_text(text)


# 4) Conversion reporting must use the genuine business timestamp with no
# now()-fallback, and the Google staging operation gets its own audit result.
path = 'src/utils/orderConversions.ts'
text = Path(path).read_text()
text = replace_once(
    text,
    "    if (kind === 'purchase' && !order.confirmed_at) return\n    if (kind === 'delivered' && !order.delivered_at) return\n\n",
    "    const conversionTime = kind === 'purchase' ? order.confirmed_at : order.delivered_at\n"
    "    if (!conversionTime) return\n\n",
    path,
)
text = replace_once(
    text,
    "          conversion_time:\n            (kind === 'purchase' ? order.confirmed_at : order.delivered_at)\n            ?? new Date().toISOString(),\n",
    "          conversion_time: conversionTime,\n",
    path,
)
old_stage = """    await admin
      .from('google_offline_conversions')
      .upsert(
        {
          order_id: orderId,
          conversion_stage: kind === 'purchase' ? 'confirmed' : 'delivered',
          conversion_time: conversionTime,
          value,
          currency: 'GBP',
          gclid: order.gclid,
          gbraid: order.gbraid,
          wbraid: order.wbraid,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          customer_first_name: name.split(/\\s+/)[0] || null,
          customer_last_name: name.split(/\\s+/).slice(1).join(' ') || null,
          customer_postcode: postcode,
        },
        { onConflict: 'order_id,conversion_stage', ignoreDuplicates: true },
      )
"""
new_stage = """    const conversionStage = kind === 'purchase' ? 'confirmed' : 'delivered'
    const { error: stagingError } = await admin
      .from('google_offline_conversions')
      .upsert(
        {
          order_id: orderId,
          conversion_stage: conversionStage,
          conversion_time: conversionTime,
          value,
          currency: 'GBP',
          gclid: order.gclid,
          gbraid: order.gbraid,
          wbraid: order.wbraid,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          customer_first_name: name.split(/\\s+/)[0] || null,
          customer_last_name: name.split(/\\s+/).slice(1).join(' ') || null,
          customer_postcode: postcode,
        },
        { onConflict: 'order_id,conversion_stage', ignoreDuplicates: true },
      )

    const stagingAttemptAt = new Date().toISOString()
    await admin.from('conversion_events').insert({
      order_id: orderId,
      platform: 'google_offline_staging' as const,
      event_name: conversionStage,
      event_id: `${shortCode}-${conversionStage}`,
      sent_at: stagingError ? null : stagingAttemptAt,
      status: stagingError ? 'failed' as const : 'sent' as const,
      error_metadata: stagingError ? { message: stagingError.message } : null,
    })
"""
text = replace_once(text, old_stage, new_stage, path)
Path(path).write_text(text)

print('Tracking V2.1 candidate refinements applied')
