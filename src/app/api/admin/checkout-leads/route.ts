import { createHash, timingSafeEqual } from 'crypto'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { formatRecoveryBasket } from '@/utils/recoveryLeadFormat'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHEET_TOKEN_SHA256 = '44ffad85c004038d4da855ea9f7acd9f8403504a418c880560764215bae02b7e'

function validSheetKey(value: string | null): boolean {
  if (!value || value.length < 40) return false
  const supplied = Buffer.from(createHash('sha256').update(value).digest('hex'), 'hex')
  const expected = Buffer.from(SHEET_TOKEN_SHA256, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

type RecoveryLead = {
  basket: unknown
  phone: string | null
  email: string | null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (!validSheetKey(url.searchParams.get('key'))) {
    // Do not reveal whether this export exists to unauthenticated callers.
    return new Response('Not found', { status: 404 })
  }

  const admin = createUntypedAdminClient()
  const { data, error } = await admin
    .from('checkout_recovery_leads')
    .select('basket, phone, email, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error(`checkout leads sheet export failed: ${error.message}`)
    return new Response('Export unavailable', { status: 500 })
  }

  const rows = [
    ['Product Details', 'WhatsApp Number', 'Email'],
    ...((data ?? []) as RecoveryLead[]).map((lead) => [
      formatRecoveryBasket(lead.basket),
      lead.phone ?? '',
      lead.email ?? '',
    ]),
  ]

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="checkout-leads.csv"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
