// src/utils/health/loadHealth.ts
//
// Gathers the facts for the health checks - one database call, plus what the
// server knows about its own settings - and hands them to the one pure
// function that decides green, amber or red (./checks.ts).
//
// The server key is actually tried, not just looked for: a key copied from
// another project, or one that has been rotated, is set but opens nothing.

import 'server-only'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createAdminClient } from '@/utils/supabase/admin'
import { SITE_URL } from '@/constants/site'
import { buildHealthReport, type HealthEnv, type HealthReport, type HealthSnapshot } from './checks'

const has = (name: string) => Boolean(process.env[name]?.trim())

async function probeServerKey(): Promise<HealthEnv['serverKey']> {
  if (!has('SUPABASE_SERVICE_ROLE_KEY')) return { set: false, works: false }
  try {
    const { error } = await createAdminClient()
      .from('products')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    return error ? { set: true, works: false, error: error.message } : { set: true, works: true }
  } catch (err) {
    return { set: true, works: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** The build id Next wrote, wherever this server was started from. */
function buildId(): string | null {
  for (const path of [join(process.cwd(), '.next', 'BUILD_ID'), join(process.cwd(), 'BUILD_ID')]) {
    try {
      return readFileSync(path, 'utf8').trim() || null
    } catch {
      // Not here; try the next place.
    }
  }
  return null
}

export async function healthEnv(): Promise<HealthEnv> {
  const smtp = has('SMTP_PASSWORD')
  const gmail = has('EMAIL_USER') && has('EMAIL_APP_PASSWORD')
  return {
    production: process.env.NODE_ENV === 'production',
    siteUrl: SITE_URL,
    // robots.ts allows the whole shop and disallows only /admin/ and /api/.
    searchEnginesAllowed: true,
    build: buildId(),
    serverKey: await probeServerKey(),
    email: {
      configured: smtp || gmail,
      transport: smtp ? 'hostinger' : gmail ? 'gmail' : 'none',
      adminInboxSet: has('ADMIN_EMAIL'),
    },
    addressLookup: has('NEXT_PUBLIC_HOMEDATA_API_KEY'),
    photoUploads: has('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME') && has('CLOUDINARY_API_KEY') && has('CLOUDINARY_API_SECRET'),
    tracking: {
      trackingEnv: process.env.TRACKING_ENV?.trim() || null,
      vercelEnvProduction: process.env.VERCEL_ENV === 'production',
      metaPixel: has('META_PIXEL_ID'),
      metaCapi: has('META_CAPI_ACCESS_TOKEN'),
    },
    ga4: has('GA4_MEASUREMENT_ID') && has('GA4_API_SECRET'),
    trustpilotInvites: has('TRUSTPILOT_INVITE_BCC'),
    cronSecret: has('CRON_SECRET'),
  }
}

/**
 * The full report. `db` is the admin's session client on the Status page and
 * the Home card; the hourly check (Phase 4) passes the service-role client.
 */
export async function loadHealthReport(db: SupabaseClient<Database>): Promise<HealthReport> {
  const [snapshot, env] = await Promise.all([db.rpc('admin_status_snapshot'), healthEnv()])
  return buildHealthReport({
    env,
    snapshot: snapshot.error ? null : (snapshot.data as unknown as HealthSnapshot),
    snapshotError: snapshot.error?.message ?? null,
    now: new Date(),
  })
}
