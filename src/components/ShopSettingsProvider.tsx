'use client'
// src/components/ShopSettingsProvider.tsx
//
// The shop's figures in the browser (admin upgrade M1). The root layout reads
// them on the server and hands them down here, so checkout, the product page
// and the sample picker show exactly what the database will charge.

import { createContext, useContext } from 'react'
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from '@/utils/shopSettings'

const ShopSettingsContext = createContext<ShopSettings>(DEFAULT_SHOP_SETTINGS)

export function ShopSettingsProvider({ value, children }: { value: ShopSettings; children: React.ReactNode }) {
  return <ShopSettingsContext.Provider value={value}>{children}</ShopSettingsContext.Provider>
}

export function useShopSettings(): ShopSettings {
  return useContext(ShopSettingsContext)
}
