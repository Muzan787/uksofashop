from pathlib import Path

BASE = Path('.')
MIGRATION = BASE / 'supabase/migrations/20260907140000_atomic_confirm_order_timestamp.sql'


def require(path: str, *needles: str) -> None:
    text = Path(path).read_text()
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'{path}: missing required contract: {needle}')


def forbid(path: str, *needles: str) -> None:
    text = Path(path).read_text()
    for needle in needles:
        if needle in text:
            raise SystemExit(f'{path}: forbidden contract remains: {needle}')


if not MIGRATION.exists():
    raise SystemExit(f'missing migration: {MIGRATION}')

require(
    str(MIGRATION),
    'create or replace function public.confirm_order(p_order_id uuid)',
    'security definer',
    "set search_path to 'public'",
    "status = 'confirmed'",
    'confirmed_at = coalesce(o.confirmed_at, now())',
    "and o.status = 'pending_cod'",
    'return query',
)
forbid(
    str(MIGRATION),
    'alter table',
    'create table',
    'create trigger',
    'drop function',
    'update public.orders set confirmed_at',
)

require(
    'src/app/confirm-order/[id]/page.tsx',
    "supabase.rpc('confirm_order', { p_order_id: id })",
    "after(() => reportOrderConversion(id, 'purchase'))",
    'No application fallback is',
)
forbid(
    'src/app/confirm-order/[id]/page.tsx',
    'createAdminClient',
    '.update({ confirmed_at:',
    'new Date().toISOString()',
)

require(
    'src/app/actions/orders.ts',
    "supabase.rpc('confirm_order', { p_order_id: orderId })",
    "after(() => reportOrderConversion(orderId, 'purchase'))",
    'confirm_order atomically performs pending_cod -> confirmed',
)
# The admin status-change path still legitimately stamps confirmed_at in the
# same authenticated UPDATE that changes status. The public/customer path must
# not have a separate service-role fallback.
forbid(
    'src/app/actions/orders.ts',
    'createAdminClient',
    'Could not stamp confirmed_at for order',
)

require(
    'src/app/actions/checkout.ts',
    'const admin = createAdminClient()',
    ".from('orders')\n      .update(attribution)",
    'WHATSAPP_REFERENCE_COOKIE',
    'isDeterministicCheckoutWhatsAppMatch',
    ".is('converted_order_id', null)",
    ".eq('arrival_id', currentArrivalId)",
    'retireWhatsAppReferenceCookie',
)
forbid(
    'src/app/actions/checkout.ts',
    "linkedEnquiry?.gclid",
    "linkedEnquiry?.ga_client_id",
    "linkedEnquiry?.meta_fbp",
)

require(
    'src/utils/orderConversions.ts',
    'const admin = createAdminClient()',
    "const conversionTime = kind === 'purchase' ? order.confirmed_at : order.delivered_at",
    'if (!conversionTime) return',
    ".is(sentColumn, null)",
    ".from('conversion_events').insert",
    ".from('google_offline_conversions')",
    'conversion_time: conversionTime',
    "onConflict: 'order_id,conversion_stage'",
)
forbid(
    'src/utils/orderConversions.ts',
    '?? new Date().toISOString()',
    'supabase: Client',
)

require(
    'src/app/api/cron/conversions/route.ts',
    ".not('confirmed_at', 'is', null)",
    "await reportOrderConversion(order.id, 'purchase')",
)
require(
    'src/utils/attribution/useWhatsAppCTA.ts',
    'persistWhatsAppReference(reference)',
)
require(
    'src/utils/attribution/whatsapp.ts',
    "export const WHATSAPP_REFERENCE_COOKIE = 'uksofashop_wa'",
    "window.location.protocol === 'https:' ? '; secure' : ''",
)

print('Tracking V2.1 atomic source contract PASS')
