import type { Metadata } from 'next'
// src/app/admin/settings/page.tsx
//
// Settings (admin upgrade M1-M4): the figures checkout charges, the visitor
// offer's switch and codes, the distance delivery fees, and OrderFlow. This
// file loads; SettingsView shows.
import { createClient } from '@/utils/supabase/server'
import { SHOP_SETTINGS_COLUMNS, settingsFromRow, type OfferTier, type ShopSettingsRow } from '@/utils/shopSettings'
import SettingsView, { type DistanceFee, type OfferCodeRow, type OrderFlowStatus } from './SettingsView'
import type { OfferProductRow } from './OfferExclusions'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

async function loadSettings() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const [settings, codes, tiers, fees, windows, orderflow, products, excluded] = await Promise.all([
    supabase.from('shop_settings').select(`${SHOP_SETTINGS_COLUMNS}, updated_at`).maybeSingle(),
    supabase.from('offer_codes').select('code, label, is_active, created_at').order('created_at'),
    supabase.from('offer_product_tiers').select('product_id, tier'),
    supabase.from('delivery_distance_fees').select('outcode, fee, region, miles').order('fee').order('region').order('outcode'),
    supabase.from('offer_entitlements').select('id', { count: 'exact', head: true }).gt('expires_at', now).is('revoked_at', null),
    supabase.rpc('orderflow_status'),
    // The sofas on sale, for the exclusion list. Dearest first, as everything
    // that lists products now is.
    supabase.from('products').select('id, title, base_price').eq('is_active', true).order('base_price', { ascending: false }),
    supabase.from('offer_excluded_products').select('product_id'),
  ])

  const tierCounts: Record<OfferTier, number> = { ELECTRIC: 0, ROMA: 0, STANDARD: 0, EXCLUDED: 0 }
  const tierOf = new Map<string, string>()
  for (const row of tiers.data ?? []) {
    if (row.tier in tierCounts) tierCounts[row.tier as OfferTier] += 1
    tierOf.set(row.product_id, row.tier)
  }
  const excludedIds = new Set((excluded.data ?? []).map(r => r.product_id))

  return {
    offerProducts: (products.data ?? []).map(p => ({
      id: p.id,
      title: p.title,
      price: Number(p.base_price),
      tier: tierOf.get(p.id) ?? null,
      excluded: excludedIds.has(p.id),
    })) as OfferProductRow[],
    settings: settingsFromRow(settings.data as Partial<ShopSettingsRow> | null),
    settingsMissing: Boolean(settings.error) || !settings.data,
    updatedAt: (settings.data as { updated_at?: string } | null)?.updated_at ?? null,
    codes: (codes.data ?? []) as OfferCodeRow[],
    tierCounts,
    fees: (fees.data ?? []).map(f => ({ ...f, fee: Number(f.fee) })) as DistanceFee[],
    openWindows: windows.count ?? null,
    orderflow: (orderflow.error ? null : orderflow.data) as OrderFlowStatus | null,
  }
}

export default async function AdminSettingsPage() {
  return <SettingsView {...await loadSettings()} />
}
