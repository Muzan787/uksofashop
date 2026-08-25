// src/utils/supabase/admin.ts
//
// Service-role Supabase client. This bypasses RLS entirely, so it must never be
// reachable from the browser and must never be used for anything a signed-in
// user could do with their own session.
//
// It exists for operations that have no caller identity to check at all - the
// newsletter double opt-in being the case it was written for. There, the
// confirmation token has to be generated and emailed without ever passing
// through the client, because a token the browser can read defeats double
// opt-in completely.
//
// If you are reaching for this to make an admin screen work, don't: add an RLS
// policy keyed on is_admin() and use the ordinary cookie-bound client instead,
// the way src/app/admin/reviews/page.tsx does.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured.')
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
