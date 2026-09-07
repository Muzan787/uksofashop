from pathlib import Path


def require(path: str, *needles: str) -> None:
    text = Path(path).read_text()
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'{path}: missing required contract: {needle}')


def forbid(path: str, *needles: str) -> None:
    text = Path(path).read_text()
    for needle in needles:
        if needle in text:
            raise SystemExit(f'{path}: forbidden old contract remains: {needle}')


require(
    'src/app/actions/checkout.ts',
    "const admin = createAdminClient()",
    ".from('orders')\n      .update(attribution)",
    "WHATSAPP_REFERENCE_COOKIE",
    "isDeterministicCheckoutWhatsAppMatch",
    ".from('whatsapp_enquiries')",
    ".is('converted_order_id', null)",
    ".eq('arrival_id', currentArrivalId)",
    "retireWhatsAppReferenceCookie",
    ".eq('converted_order_id', order.id)",
    "whatsapp_reference: attrError ? null : linkedWhatsAppReference",
)
forbid(
    'src/app/actions/checkout.ts',
    "await supabase\n        .from('orders')\n        .update(attribution)",
    "linkedEnquiry?.gclid",
    "linkedEnquiry?.ga_client_id",
    "linkedEnquiry?.meta_fbp",
    ".eq('session_id', currentSessionId)",
)

require(
    'src/app/actions/orders.ts',
    "const confirmedAt = new Date().toISOString()",
    "const admin = createAdminClient()",
    ".update({ confirmed_at: confirmedAt })",
    ".eq('status', 'confirmed')",
    ".is('confirmed_at', null)",
    "after(() => reportOrderConversion(orderId, 'purchase'))",
)

require(
    'src/utils/orderConversions.ts',
    "const admin = createAdminClient()",
    "const conversionTime = kind === 'purchase' ? order.confirmed_at : order.delivered_at",
    "if (!conversionTime) return",
    ".is(sentColumn, null)",
    ".from('conversion_events').insert",
    ".from('google_offline_conversions')",
    "conversion_time: conversionTime",
    "platform: 'google_offline_staging' as const",
    "onConflict: 'order_id,conversion_stage'",
)
forbid(
    'src/utils/orderConversions.ts',
    "?? new Date().toISOString()",
    "supabase: Client",
)

require(
    'src/app/api/cron/conversions/route.ts',
    ".not('confirmed_at', 'is', null)",
    "await reportOrderConversion(order.id, 'purchase')",
)

require(
    'src/utils/attribution/useWhatsAppCTA.ts',
    "persistWhatsAppReference(reference)",
)
require(
    'src/utils/attribution/whatsapp.ts',
    "export const WHATSAPP_REFERENCE_COOKIE = 'uksofashop_wa'",
    "window.location.protocol === 'https:' ? '; secure' : ''",
)

print('Tracking V2.1 source contract PASS')
