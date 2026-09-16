// src/app/api/cron/recovery-cleanup/route.ts
//
// Deletes expired checkout-recovery records. Contact/basket data is retained
// for at most 90 days after explicit opt-in, and is cleared immediately when
// the checkout converts or the shopper opts out.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('checkout_recovery_leads')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error(`checkout recovery cleanup failed: ${error.message}`)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }

  return NextResponse.json({ deleted: data?.length ?? 0 })
}
