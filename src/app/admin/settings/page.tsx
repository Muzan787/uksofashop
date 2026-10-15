import type { Metadata } from 'next'
// src/app/admin/settings/page.tsx
//
// Settings (admin upgrade M1-M4): the figures checkout charges, the visitor
// offer's switch and codes, the distance delivery fees, and OrderFlow. This
// file loads; SettingsView shows.
import { createClient } from '@/utils/supabase/server'
import { SHOP_SETTINGS_COLUMNS, settingsFromRow, type OfferTier, type ShopSettingsRow } from '@/utils/shopSettings'
import SettingsView, { type DistanceFee, type OfferCodeRow, type OrderFlowStatus } from './SettingsView'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

async function loadSettings() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const [settings, codes, tiers, fees, windows, orderflow] = await Promise.all([
    supabase.from('shop_settings').select(`${SHOP_SETTINGS_COLUMNS}, updated_at`).maybeSingle(),
    supabase.from('offer_codes').select('code, label, is_active, created_at').order('created_at'),
    supabase.from('offer_product_tiers').select('tier'),
    supabase.from('delivery_distance_fees').select('outcode, fee, region, miles').order('fee').order('region').order('outcode'),
    supabase.from('offer_entitlements').select('id', { count: 'exact', head: true }).gt('expires_at', now).is('revoked_at', null),
    supabase.rpc('orderflow_status'),
  ])

  const tierCounts: Record<OfferTier, number> = { ELECTRIC: 0, ROMA: 0, STANDARD: 0, EXCLUDED: 0 }
  for (const row of tiers.data ?? []) if (row.tier in tierCounts) tierCounts[row.tier as OfferTier] += 1

  return {
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
