from pathlib import Path


def replace_once(text: str, old: str, new: str, path: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    return text.replace(old, new, 1)


path = 'src/app/confirm-order/[id]/page.tsx'
text = Path(path).read_text()
text = replace_once(
    text,
    "import { createClient } from '@/utils/supabase/server'\n",
    "import { createClient } from '@/utils/supabase/server'\n"
    "import { createAdminClient } from '@/utils/supabase/admin'\n",
    path,
)
text = replace_once(
    text,
    "import Link from 'next/link'\n",
    "import Link from 'next/link'\n"
    "import { after } from 'next/server'\n"
    "import { reportOrderConversion } from '@/utils/orderConversions'\n",
    path,
)
text = replace_once(
    text,
    "  if (error || !order) return notFound()\n\n  const shortCode = order.id.substring(0, 8).toUpperCase()\n",
    "  if (error || !order) return notFound()\n\n"
    "  // confirm_order is SECURITY DEFINER and changes pending_cod -> confirmed,\n"
    "  // but it predates confirmed_at. This page is the actual emailed customer\n"
    "  // confirmation path, so it must perform the trusted follow-up itself.\n"
    "  // Service role remains server-only and the predicates constrain the write\n"
    "  // to this exact confirmed order; reopening the link cannot move the time.\n"
    "  const confirmedAt = new Date().toISOString()\n"
    "  const admin = createAdminClient()\n"
    "  const { error: stampError } = await admin\n"
    "    .from('orders')\n"
    "    .update({ confirmed_at: confirmedAt })\n"
    "    .eq('id', id)\n"
    "    .eq('status', 'confirmed')\n"
    "    .is('confirmed_at', null)\n\n"
    "  if (stampError) {\n"
    "    console.error(`Could not stamp confirmed_at for order ${id}`, stampError)\n"
    "  }\n\n"
    "  // Purchase reporting is server-authoritative and idempotent. It refuses\n"
    "  // to run without a genuine confirmed_at and claims purchase_event_sent_at\n"
    "  // before sending, so reloads cannot duplicate Meta/GA4/Google staging.\n"
    "  after(() => reportOrderConversion(id, 'purchase'))\n\n"
    "  const shortCode = order.id.substring(0, 8).toUpperCase()\n",
    path,
)
Path(path).write_text(text)
print('Tracking V2.1 real confirmation-page patch applied')
