// src/utils/supabase/public.ts
//
// An anonymous Supabase client with no request attached.
//
// The ordinary server client (server.ts) reads the visitor's cookies so that
// a signed-in customer's queries run as them. That ties every query it makes
// to one request, which is exactly what a shared cache cannot hold: Next
// refuses to read cookies inside unstable_cache, and rightly so, because the
// cached result would be served to everyone.
//
// This one holds the public anon key and nothing else, so its results are
// the same for every visitor and can be cached. Use it only for data that is
// public anyway - the catalogue, the categories, approved reviews, the fabric
// library - which is also all that RLS lets the anon role see, so there is
// no privilege to leak. Anything that depends on who is asking stays on the
// request-bound client.

import 'server-only'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export type PublicClient = SupabaseClient<Database>

export function createPublicClient(): PublicClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase public credentials are not configured.')
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
