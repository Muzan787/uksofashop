// src/utils/shopSettingsServer.ts
//
// The shop's figures on the server (admin upgrade M1), read once and shared
// by every page in a cache that Admin -> Settings refreshes when it saves.
// Read with the public key, like the navigation, because the row is public
// and a cookie-bound client can't live inside a shared cache. If it can't
// be read, the shop uses today's figures, which is also what the database
// falls back to.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { DEFAULT_SHOP_SETTINGS, SHOP_SETTINGS_COLUMNS, settingsFromRow, type ShopSettings, type ShopSettingsRow } from './shopSettings'

export const SHOP_SETTINGS_TAG = 'shop-settings'

const readShopSettings = unstable_cache(
  async (): Promise<ShopSettings> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return DEFAULT_SHOP_SETTINGS
    const supabase = createSupabaseClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await supabase.from('shop_settings').select(SHOP_SETTINGS_COLUMNS).maybeSingle()
    if (error) {
      console.error(`shop settings read failed: ${error.message}`)
      return DEFAULT_SHOP_SETTINGS
    }
    return settingsFromRow(data as Partial<ShopSettingsRow> | null)
  },
  ['uksofashop-shop-settings-v1'],
  { revalidate: 300, tags: [SHOP_SETTINGS_TAG] },
)

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    return await readShopSettings()
  } catch (err) {
    console.error('shop settings read failed', err)
    return DEFAULT_SHOP_SETTINGS
  }
}
