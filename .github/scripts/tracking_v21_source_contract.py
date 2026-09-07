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
    "whatsapp_reference: linkedWhatsAppReference",
)
forbid(
    'src/app/actions/checkout.ts',
    "await supabase\n        .from('orders')\n        .update(attribution)",
)

require(
    'src/app/actions/orders.ts',
    "const admin = createAdminClient()",
    ".eq('status', 'confirmed')",
    ".is('confirmed_at', null)",
    "after(() => reportOrderConversion(orderId, 'purchase'))",
)

require(
    'src/utils/orderConversions.ts',
    "const admin = createAdminClient()",
    "if (kind === 'purchase' && !order.confirmed_at) return",
    "if (kind === 'delivered' && !order.delivered_at) return",
    ".is(sentColumn, null)",
    ".from('conversion_events').insert",
    ".from('google_offline_conversions')",
    "onConflict: 'order_id,conversion_stage'",
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
)

print('Tracking V2.1 source contract PASS')
