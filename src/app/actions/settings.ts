// src/app/actions/settings.ts
'use server'
//
// Admin -> Settings (admin upgrade M1-M4). The figures, the offer switch and
// the OrderFlow switch all save through save_shop_settings(), which checks
// them again and refuses with a code; offer codes save under the admin's own
// session (RLS admits admins). After a change to the figures the shop's
// caches are refreshed, so checkout and every page that quotes a figure use
// the new one from the next visit - and checkout, which sends its own total,
// agrees with place_order, which charges from the same row.

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { adminGuard } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { SHOP_SETTINGS_TAG } from '@/utils/shopSettingsServer'
import { checkFigures, normaliseOfferCode, offerCodeProblem, settingsRefusal, SETTINGS_REFUSALS, type FigureKey } from '@/utils/shopSettingsForm'

export type SettingsResult = { ok: true } | { ok: false; text: string; field?: FigureKey | 'form' }

const NOT_ADMIN: SettingsResult = { ok: false, text: SETTINGS_REFUSALS.NOT_AUTHORISED }

/** Every page that quotes a figure reads it through these. */
function refreshShop() {
  updateTag(SHOP_SETTINGS_TAG)
  updateTag('product')
  updateTag('home')
  revalidatePath('/', 'layout')
  revalidatePath('/llms.txt')
  revalidatePath('/admin/settings')
}

// ── M1: the figures ──────────────────────────────────────────────────────────

const figuresInput = z.record(z.string(), z.string().max(12))

export async function saveShopFigures(raw: Record<string, string>): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const parsed = figuresInput.safeParse(raw)
  if (!parsed.success) return { ok: false, field: 'form', text: 'The form didn’t arrive whole. Reload the page and try again.' }
  const checked = checkFigures(parsed.data)
  if (!checked.ok) return checked

  const supabase = await createClient()
  const { error } = await supabase.rpc('save_shop_settings', { p: checked.figures })
  if (error) return { ok: false, field: 'form', text: settingsRefusal(error.message) }
  refreshShop()
  return { ok: true }
}

// ── M2: the offer switch; M4: the OrderFlow switch ───────────────────────────

const onOff = z.boolean()

/**
 * Off: no new visitor gets a window. A window already given runs to its own
 * deadline, which never moves (issue_paid_offer_entitlement).
 */
export async function setOfferEnabled(on: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  if (!onOff.safeParse(on).success) return { ok: false, text: 'Choose on or off.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('save_shop_settings', { p: { offer_enabled: on } })
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  refreshShop()
  return { ok: true }
}

/** Off: orders are still placed and kept, they just aren't sent to OrderFlow. */
export async function setOrderFlowEnabled(on: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  if (!onOff.safeParse(on).success) return { ok: false, text: 'Choose on or off.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('save_shop_settings', { p: { orderflow_enabled: on } })
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  revalidatePath('/admin/settings')
  return { ok: true }
}

// ── M3: offer codes ──────────────────────────────────────────────────────────

const codeInput = z.string().max(40)
const labelInput = z.string().max(80)

export async function addOfferCode(rawCode: string, rawLabel: string): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const c = codeInput.safeParse(rawCode)
  const l = labelInput.safeParse(rawLabel)
  if (!c.success) return { ok: false, text: 'A code is 4 to 24 letters and numbers.' }
  if (!l.success) return { ok: false, text: 'Keep the note under 80 characters.' }
  const code = normaliseOfferCode(c.data)
  const problem = offerCodeProblem(code)
  if (problem) return { ok: false, text: problem }

  const supabase = await createClient()
  const { error } = await supabase.from('offer_codes').insert({ code, label: l.data.trim() || null })
  if (error) {
    if (error.code === '23505') return { ok: false, text: `${code} is already on the list.` }
    return { ok: false, text: settingsRefusal(error.message) }
  }
  revalidatePath('/admin/settings')
  return { ok: true }
}

export async function setOfferCodeActive(rawCode: string, on: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const c = codeInput.safeParse(rawCode)
  if (!c.success || !onOff.safeParse(on).success) return { ok: false, text: 'That code no longer exists.' }
  const supabase = await createClient()
  const { data, error } = await supabase.from('offer_codes').update({ is_active: on }).eq('code', normaliseOfferCode(c.data)).select('code')
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  if (!data?.length) return { ok: false, text: 'That code no longer exists.' }
  revalidatePath('/admin/settings')
  return { ok: true }
}

/** Orders keep their code as text, so deleting one never changes an order. */
export async function deleteOfferCode(rawCode: string): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const c = codeInput.safeParse(rawCode)
  if (!c.success) return { ok: false, text: 'That code no longer exists.' }
  const supabase = await createClient()
  const { error } = await supabase.from('offer_codes').delete().eq('code', normaliseOfferCode(c.data))
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  revalidatePath('/admin/settings')
  return { ok: true }
}

// ── The products the offer never applies to ──────────────────────────────────

const productIdInput = z.string().uuid()

/**
 * Take a sofa off the visitor offer, or put it back.
 *
 * Its own list rather than the EXCLUDED tier, so a sofa keeps the tier it was
 * in while it is off the offer and gets it back when it goes on again. An
 * excluded product also cannot be the tier a mixed basket is priced at, which
 * the EXCLUDED tier never managed - it only meant "worth £0".
 *
 * calculate_order_offer reads the list, so this changes what checkout
 * charges; the shop's caches are refreshed so the product pages stop
 * promising money off it.
 */
export async function setProductOfferExcluded(rawProductId: string, excluded: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const id = productIdInput.safeParse(rawProductId)
  if (!id.success || !onOff.safeParse(excluded).success) return { ok: false, text: 'That sofa no longer exists.' }

  const supabase = await createClient()
  const { error } = excluded
    // ignoreDuplicates, so excluding something already excluded is a no-op
    // rather than an error - and so the insert needs no UPDATE privilege.
    ? await supabase.from('offer_excluded_products').upsert({ product_id: id.data }, { onConflict: 'product_id', ignoreDuplicates: true })
    : await supabase.from('offer_excluded_products').delete().eq('product_id', id.data)
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  refreshShop()
  return { ok: true }
}

// ── M4: OrderFlow ────────────────────────────────────────────────────────────

/**
 * Sends the most recent order marked as a test again. Decision 7: it goes as
 * every order does, unmarked and with the payload untouched; OrderFlow
 * already has it, so it updates that order rather than adding one.
 */
export async function sendOrderFlowTest(): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const supabase = await createClient()
  const { error } = await supabase.rpc('orderflow_send_test')
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  revalidatePath('/admin/settings')
  return { ok: true }
}

/** Reads OrderFlow's replies now instead of waiting for the five-minute job. */
export async function checkOrderFlowReplies(): Promise<SettingsResult> {
  if (await adminGuard()) return NOT_ADMIN
  const supabase = await createClient()
  const { error } = await supabase.rpc('orderflow_collect_now')
  if (error) return { ok: false, text: settingsRefusal(error.message) }
  revalidatePath('/admin/settings')
  return { ok: true }
}
