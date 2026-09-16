// src/utils/supabase/admin.ts
//
// Service-role Supabase clients. These bypass RLS entirely, so they must never
// be reachable from the browser and must never be used for anything a signed-in
// user could do with their own session.
//
// The typed client remains the default. The untyped variant exists narrowly for
// a table introduced by a migration before the checked-in generated Database
// type has been regenerated. Keeping that exception here makes it visible and
// prevents `as any` from spreading through application code.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured.')
  }

  return { url, key }
}

const OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const

export function createAdminClient() {
  const { url, key } = credentials()
  return createSupabaseClient<Database>(url, key, OPTIONS)
}

/**
 * Server-only escape hatch for service-role operations on a newly migrated
 * table that is not yet represented in src/types/supabase.ts.
 *
 * Do not use this for ordinary application queries. Regenerate the database
 * types and move callers back to createAdminClient() when convenient.
 */
export function createUntypedAdminClient() {
  const { url, key } = credentials()
  return createSupabaseClient(url, key, OPTIONS)
}
