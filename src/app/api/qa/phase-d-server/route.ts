import { NextResponse } from 'next/server'
import { placeOrder } from '@/app/actions/checkout'
import { NO_EXTRAS } from '@/constants/delivery'

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
 * This route exists only on the dirty Phase D QA branch and is deliberately
 * omitted from the clean release. It is additionally inert unless the local
 * direct-HTTPS harness sets PHASE_D_QA_ENABLE=1. The probe never permits a
 * successful order: the QA fetch fixture makes place_order fail with a
 * PRICE_MISMATCH after invocation, which proves that a mainland request reached
 * service-role authority without creating an order.
 */
export async function POST(request: Request) {
  if (process.env.PHASE_D_QA_ENABLE !== '1') {
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
