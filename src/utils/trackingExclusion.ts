// src/utils/trackingExclusion.ts
//
// The server's side of "never counts" (admin upgrade N6, N8, O5): a request
// from a staff device, or from a visit that came in through the test ad link,
// is not recorded and not forwarded to Meta or Google. The browser already
// stops these calls (utils/trackingEnv.ts); every route checks again.

import 'server-only'
import { cookies } from 'next/headers'
import { exclusionReason } from './trackingEnv'

/** Why this request never counts, or null when it does. */
export async function requestExclusion(): Promise<'staff_device' | 'test_link' | null> {
  try {
    const jar = await cookies()
    return exclusionReason(name => jar.get(name)?.value)
  } catch {
    return null
  }
}

export async function isExcludedRequest(): Promise<boolean> {
  return (await requestExclusion()) !== null
}
