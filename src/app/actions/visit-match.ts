'use server'

// src/app/actions/visit-match.ts
//
// "Find the website visit" for a hand-taken order: the order form and the
// order page both list the visits active around a time, with the pages each
// one opened, and staff pick the one that is their customer.
//
// Why it exists: a WhatsApp or phone sale only carries its ad click when the
// customer brings a UKSS-WA-… or UKSS-LD-… reference. Swatch requests, calls
// and chats from a saved number bring none, so Meta's Purchase had nothing to
// match on. Picking the visit copies its identity and click ids onto the
// order (match_order_visit, 20261101210000_match_order_to_visit.sql), and the
// existing gates in orderConversions.ts take it from there exactly as for a
// referenced order - consent, Google-only acquisition, holds, the 7-day rule.
//
// Only visits whose cookie choice allows advertising are listed or
// attachable; the database enforces that, not this file.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { isAdmin } from '@/utils/auth'
import { GOOGLE_GTM_ENABLED } from '@/utils/googleMeasurement'
import { WALL_CLOCK_ZONES, wallClockToUtc } from '@/utils/wallClock'

export interface VisitPage {
  at: string
  path: string
  type: string | null
  product: string | null
}

export interface VisitCandidate {
  session_id: string
  first_at: string
  last_at: string
  phone_match: boolean
  whatsapp: { reference: string; at: string; product: string | null; used: boolean } | null
  lead: { reference: string; used: boolean } | null
  linked_order_id: string | null
  tapped_call: boolean
  saw_swatches: boolean
  added_to_basket: boolean
  reached_checkout: boolean
  device: string | null
  arrival: {
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    meta_click: boolean
    google_click: boolean
    landing_page: string | null
    referrer: string | null
  } | null
  pages: VisitPage[]
}

export interface PhoneHit {
  kind: 'swatches' | 'lead'
  at: string
  label: string
}

export type FindVisitsResult =
  | { error: string }
  | { error?: undefined; visits: VisitCandidate[]; hiddenNoConsent: number; more: number; phoneHits: PhoneHit[]; from: string; to: string }

/** How far either side of the time staff give. */
export type VisitSpan = '15' | '30' | '60' | '180' | '720'

const findSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the date.'),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, 'Choose the time.'),
  timezone: z.enum(WALL_CLOCK_ZONES),
  span: z.enum(['15', '30', '60', '180', '720']),
  productId: z.string().uuid().optional(),
  phone: z.string().trim().max(32).optional(),
  channel: z.enum(['whatsapp', 'call', 'swatches', 'any']).default('any'),
})

export async function findWebsiteVisits(input: z.input<typeof findSchema>): Promise<FindVisitsResult> {
  if (!(await isAdmin())) return { error: 'You are not authorised to do this.' }
  const parsed = findSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the time.' }
  const v = parsed.data

  const at = wallClockToUtc(v.date, v.time, v.timezone)
  if (!at) return { error: 'That date and time could not be read.' }
  const span = Number(v.span) * 60_000
  const from = new Date(at.getTime() - span)
  const to = new Date(at.getTime() + span)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('find_order_visits', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_at: at.toISOString(),
    p_product_id: v.productId ?? null,
    p_phone: v.phone || null,
    p_channel: v.channel === 'any' ? null : v.channel,
  })
  if (error || !data) {
    console.error('find_order_visits failed:', error?.message)
    return { error: "Couldn't search the visits. Try again." }
  }
  const result = data as unknown as {
    visits: VisitCandidate[]; hidden_no_consent: number; more: number; phone_hits: PhoneHit[]
  }
  return {
    visits: result.visits ?? [],
    hiddenNoConsent: Number(result.hidden_no_consent ?? 0),
    more: Number(result.more ?? 0),
    phoneHits: result.phone_hits ?? [],
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

const MATCH_ERRORS: Record<string, string> = {
  NOT_AUTHORISED: 'You are not authorised to do this.',
  NOT_FOUND: 'That order no longer exists.',
  NOT_MANUAL: 'Only WhatsApp and phone orders can be matched. A website order already knows its visit.',
  ALREADY_SENT: 'The ad conversion for this order has already gone, so its visit can no longer change.',
  ALREADY_LINKED: 'This order is already linked to a visit through its WhatsApp or lead reference.',
  VISIT_TAKEN: 'That visit is already on another order.',
  NO_CONSENT: "That visit can't be used: the customer didn't allow advertising cookies, or the visit began after the order was taken.",
  NOT_MATCHED: 'This order has no hand-made match to remove.',
}

/**
 * Put the chosen visit on the order, or take a hand-made match off
 * (sessionId null). Records who did it and when, in the database.
 */
export async function matchOrderToVisit(input: { orderId: string; sessionId: string | null; note?: string }): Promise<{ success: true } | { error: string }> {
  if (!(await isAdmin())) return { error: MATCH_ERRORS.NOT_AUTHORISED }
  const parsed = z.object({
    orderId: z.string().uuid(),
    sessionId: z.string().uuid().nullable(),
    note: z.string().trim().max(300).optional(),
  }).safeParse(input)
  if (!parsed.success) return { error: 'Pick a visit first.' }
  const { orderId, sessionId, note } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('match_order_visit', {
    p_order_id: orderId,
    p_session_id: sessionId,
    p_note: note || null,
  })
  if (error || !data) {
    const code = Object.keys(MATCH_ERRORS).find(k => error?.message?.includes(k))
    if (!code) console.error('match_order_visit failed:', error?.message)
    return { error: code ? MATCH_ERRORS[code] : "That didn't save. Try again." }
  }

  // Google's own consent link for the order, as the reference path does it
  // (manual-order.ts). Its evidence can never undo the match.
  const result = data as unknown as { matched: boolean; receipt_id?: string; visitor_id?: string; whatsapp_reference?: string | null }
  if (GOOGLE_GTM_ENABLED && result.matched && sessionId) {
    try {
      const admin = createUntypedAdminClient()
      if (result.whatsapp_reference) await admin.rpc('google_phase2b_attach_whatsapp', { p_order_id: orderId })
      else await admin.rpc('google_phase2b_attach_consent', {
        p_order_id: orderId, p_receipt_id: result.receipt_id, p_visitor_id: result.visitor_id, p_session_id: sessionId,
      })
    } catch { /* Google evidence cannot interrupt the match. */ }
  }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin/meta')
  return { success: true }
}
