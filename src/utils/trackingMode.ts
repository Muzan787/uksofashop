// src/utils/trackingMode.ts
//
// The tracking mode chosen in Admin -> Meta (admin upgrade N2), on the server.
// Live is the shop's behaviour before the modes and the default; see
// utils/shopSettings.ts for what Test and Dry run do. The production gate in
// utils/trackingEnv.ts still applies on top: a server that isn't the live
// one sends nothing whatever the mode.

import 'server-only'
import { getShopSettings } from '@/utils/shopSettingsServer'
import type { TrackingMode } from '@/utils/shopSettings'

export type { TrackingMode }

export async function getTrackingMode(): Promise<TrackingMode> {
  try {
    return (await getShopSettings()).trackingMode
  } catch {
    return 'live'
  }
}
