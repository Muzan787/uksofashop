// src/app/actions/tracking.ts
'use server'
//
// Admin -> Meta's switches (admin upgrade N2, N4, N6): the tracking mode,
// Hold and Don't send on an order's Meta signals, and "Exclude this device".
// None of them sends anything; each only stops or redirects what would be
// sent, and only when an admin chooses it.

import { revalidatePath, updateTag } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { adminGuard } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { SHOP_SETTINGS_TAG } from '@/utils/shopSettingsServer'
import { externalOrigin } from '@/utils/requestOrigin'
import { STAFF_DEVICE_COOKIE } from '@/utils/trackingEnv'
import { TRACKING_MODES, type TrackingMode } from '@/utils/shopSettings'

export type TrackingResult = { ok: true } | { ok: false; text: string }

const NOT_ADMIN_TEXT = 'You are not signed in as an admin any more. Sign in again.'
const NOT_ADMIN: TrackingResult = { ok: false, text: NOT_ADMIN_TEXT }

// ── N2: the mode ─────────────────────────────────────────────────────────────

export async function setTrackingMode(mode: TrackingMode): Promise<TrackingResult> {
  if (await adminGuard()) return NOT_ADMIN
  if (!TRACKING_MODES.includes(mode)) return { ok: false, text: 'Choose Dry run, Test or Live.' }
  // Without Meta's test code a Test event would land in the live account.
  if (mode === 'test' && !process.env.META_CAPI_TEST_EVENT_CODE) {
    return { ok: false, text: 'Test needs Meta’s test code on the server first (META_CAPI_TEST_EVENT_CODE, from Events Manager → Test events).' }
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_tracking_mode', { p_mode: mode })
  if (error) return { ok: false, text: error.message.includes('NOT_AUTHORISED') ? NOT_ADMIN_TEXT : 'That didn’t save. Try again in a minute.' }
  // Every page carries the mode for the browser tags, so refresh them all.
  updateTag(SHOP_SETTINGS_TAG)
  revalidatePath('/', 'layout')
  revalidatePath('/admin/meta')
  return { ok: true }
}

// ── N4: Hold and Don't send ──────────────────────────────────────────────────

const holdInput = z.object({
  orderId: z.string().uuid(),
  state: z.enum(['hold', 'dont_send']).nullable(),
})

/** Hold, Don't send, or (null) back in the queue. */
export async function setMetaHold(orderId: string, state: 'hold' | 'dont_send' | null): Promise<TrackingResult> {
  if (await adminGuard()) return NOT_ADMIN
  const parsed = holdInput.safeParse({ orderId, state })
  if (!parsed.success) return { ok: false, text: 'That order no longer exists.' }

  const supabase = await createClient()
  const { data: order } = await supabase.from('orders').select('id').eq('id', parsed.data.orderId).maybeSingle()
  if (!order) return { ok: false, text: 'That order no longer exists.' }

  const { error } = parsed.data.state === null
    ? await supabase.from('meta_signal_holds').delete().eq('order_id', parsed.data.orderId)
    : await supabase.from('meta_signal_holds').upsert({ order_id: parsed.data.orderId, state: parsed.data.state, set_at: new Date().toISOString() })
  if (error) return { ok: false, text: 'That didn’t save. Try again in a minute.' }
  revalidatePath('/admin/meta')
  revalidatePath('/admin/more')
  return { ok: true }
}

// ── N6: Exclude this device ──────────────────────────────────────────────────

/** 400 days, the longest a browser keeps a cookie. Turning it on again renews it. */
const STAFF_DEVICE_MAX_AGE_S = 400 * 24 * 60 * 60

export async function setStaffDevice(on: boolean): Promise<TrackingResult> {
  if (await adminGuard()) return NOT_ADMIN
  if (typeof on !== 'boolean') return { ok: false, text: 'Choose on or off.' }
  const jar = await cookies()
  const secure = (externalOrigin(await headers()) ?? '').startsWith('https:')
  // Readable by the page (not httpOnly): the shop's own scripts check it
  // before loading a tag or sending an event.
  jar.set(STAFF_DEVICE_COOKIE, on ? '1' : '', {
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: on ? STAFF_DEVICE_MAX_AGE_S : 0,
  })
  revalidatePath('/admin/meta')
  return { ok: true }
}
