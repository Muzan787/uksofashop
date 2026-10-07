import { NextResponse } from 'next/server'
import { placeOrder } from '@/app/actions/checkout'
import { NO_EXTRAS } from '@/constants/delivery'
import { PRODUCTION_HOSTS } from '@/utils/trackingEnv'

export const dynamic = 'force-dynamic'

const QA_VARIANT_ID = '1ba97d1f-f890-48f8-8ab9-57cbb147f388'

type QaGlobals = typeof globalThis & {
  __PHASE_D_QA_PLACE_ORDER_CALLS__?: number
}

function rpcCalls(): number {
  return (globalThis as QaGlobals).__PHASE_D_QA_PLACE_ORDER_CALLS__ ?? 0
}

/**
 * QA-ONLY probe for the exact production placeOrder Server Action.
 *
 * This ships on master, because .github/workflows/phase-d-validation.yml
 * builds the real tree and drives this route - an earlier comment here
 * claimed the file was "omitted from the clean release", which was never
 * true. What keeps it harmless is the gate below, not its absence.
 *
 * Two conditions, both required. PHASE_D_QA_ENABLE=1 is set only by the
 * workflow and the local direct-HTTPS harness. The host check is the
 * backstop: if that variable were ever set on the live site by accident,
 * this would still refuse rather than drive placeOrder against a real
 * product id. The probe never permits a successful order either way - the QA
 * fetch fixture makes place_order fail with a PRICE_MISMATCH after
 * invocation, which proves a mainland request reached service-role authority
 * without creating an order.
 */
function qaDisabled(request: Request): boolean {
  if (process.env.PHASE_D_QA_ENABLE !== '1') return true
  const host = new URL(request.url).hostname
  return (PRODUCTION_HOSTS as readonly string[]).includes(host)
}

export async function POST(request: Request) {
  if (qaDisabled(request)) {
    return new NextResponse(null, { status: 404 })
  }

  let body: { postcode?: string; forged?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const postcode = String(body.postcode ?? '')
  const fd = new FormData()
  fd.set('customerName', 'Phase D QA')
  fd.set('customerEmail', 'phase-d-qa@example.com')
  fd.set('customerPhone', '07123456789')
  fd.set('postcode', postcode)
  fd.set('shippingAddress', '1 Controlled QA Street, Blackburn')
  fd.set('specialInstructions', 'No commercial order: controlled Phase D probe')

  // Deliberately include browser-fabricated authority-shaped fields. The real
  // placeOrder contract does not read them; only the actual postcode controls
  // geography.
  if (body.forged) {
    fd.set('mainland', 'true')
    fd.set('delivery_zone', 'MAINLAND_STANDARD')
    fd.set('delivery_price', '0')
  }

  const before = rpcCalls()
  const result = await placeOrder(
    fd,
    [{ variant_id: QA_VARIANT_ID, quantity: 1, fabric_id: null }],
    0,
    NO_EXTRAS,
    null,
  )
  const after = rpcCalls()

  return NextResponse.json({
    result,
    rpcDelta: after - before,
  })
}
