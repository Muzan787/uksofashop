// src/utils/navigation.ts
//
// The category list the header and footer navigate by, fetched on the server.
//
// WHY THIS EXISTS. It replaces src/hooks/useCategories.ts, which did the same
// query from the browser. That hook's own comment explained the reasoning:
// "the layout wrapper that renders both of them is a client component, so a
// server fetch would mean threading the data through the root layout." That is
// true, and threading it through is what this does - because the cost of not
// doing so turned out to be much larger than the inconvenience.
//
// Three client components in the site-wide chrome imported the browser
// Supabase client: this hook, MegaMenu and SearchOverlay. Between them they put
// @supabase/supabase-js - 198KB to parse and execute, on every page including
// the homepage - into the first load of the whole storefront, to populate a nav
// menu. Download was never the problem; that chunk is 52KB gzipped. The problem
// was 984ms of long tasks on a mobile page load, and parse cost scales with the
// uncompressed size, not the transferred one.
//
// All three now go through the server. Nothing on the storefront imports the
// browser client any more, so the chunk is gone from first load entirely rather
// than merely deferred.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export interface NavCategory {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

/**
 * The nav changes very rarely but RootLayout needs it on every storefront
 * request. Using the ordinary SSR client here would tie the query to request
 * cookies, which cannot live inside a shared Next cache. This deliberately
 * uses the public anon key instead: categories were already public to the old
 * browser implementation, so there is no privilege expansion.
 */
const readNavCategories = unstable_cache(
  async (): Promise<NavCategory[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return []

    const supabase = createSupabaseClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image_url')
      .order('name')

    if (error) {
      console.error(`navigation categories fetch failed: ${error.message}`)
      return []
    }

    return data ?? []
  },
  ['uksofashop-nav-categories-v1'],
  {
    // Five minutes removes the repeat database hit from normal page-to-page
    // browsing while keeping admin category changes reasonably quick to appear.
    revalidate: 300,
    tags: ['nav-categories'],
  },
)

/**
 * Called once from the root layout, so both the header and the footer are
 * rendered with the list already in them rather than filling in after a client
 * round trip. The shared cache means a browsing session no longer turns every
 * route transition into another categories query.
 */
export async function getNavCategories(): Promise<NavCategory[]> {
  return readNavCategories()
}
