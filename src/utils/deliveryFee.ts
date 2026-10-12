// src/utils/deliveryFee.ts
//
// The distance delivery fee for a mainland postcode, server side.
//
// Free within 250 miles of Blackburn; £40 Devon and the Aberdeen area; £80
// Cornwall and the Scottish Highlands / North East beyond 250 miles; £100 the
// far north of Scotland. The figures live in the delivery_distance_fees table
// (one row per postcode district that pays) - the same table place_order
// reads when it totals the order, so what the checkout quotes is what the
// database charges. Nothing here is computed from the browser.
//
// Only for a postcode the delivery classifier has already called mainland.
// Islands, Northern Ireland and the rest are a custom quote and never get a
// figure from this.
//
// The table is 210 rows and changes by hand, so it is read once and kept for
// ten minutes rather than queried on every keystroke of a postcode box.

import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { normalisePostcode } from '@/utils/postcode'

export interface DistanceFee {
  /** Pounds. 0 is free. */
  fee: number
  /** "Cornwall", "Devon", "Far north of Scotland" ... - null when free. */
  region: string | null
}

const FREE: DistanceFee = { fee: 0, region: null }
const TTL_MS = 10 * 60 * 1000

let cache: { at: number; rows: Map<string, DistanceFee> } | null = null

async function table(): Promise<Map<string, DistanceFee>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows
  const { data, error } = await createUntypedAdminClient()
    .from('delivery_distance_fees')
    .select('outcode, fee, region')
  if (error || !data) {
    // A failed read must not quote a price the database will then refuse,
    // so it throws - the caller reports "we could not check" rather than
    // guessing free.
    throw new Error(`delivery_distance_fees read failed: ${error?.message ?? 'no data'}`)
  }
  const rows = new Map<string, DistanceFee>()
  for (const row of data as { outcode: string; fee: number | string; region: string }[]) {
    rows.set(row.outcode, { fee: Number(row.fee), region: row.region })
  }
  cache = { at: Date.now(), rows }
  return rows
}

/** "PL14 3AB" → "PL14". */
export function outcodeOf(postcode: string): string {
  return normalisePostcode(postcode).split(' ')[0] ?? ''
}

export async function distanceFeeFor(postcode: string): Promise<DistanceFee> {
  const outcode = outcodeOf(postcode)
  if (!outcode) return FREE
  return (await table()).get(outcode) ?? FREE
}
