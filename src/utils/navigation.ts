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
import { createClient } from '@/utils/supabase/server'

export interface NavCategory {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

/**
 * Called once from the root layout, so both the header and the footer are
 * rendered with the list already in them rather than filling in after a client
 * round trip. That also fixes a smaller thing on the way: the category links in
 * the footer and the mega menu are now in the server HTML, where a crawler can
 * follow them.
 */
export async function getNavCategories(): Promise<NavCategory[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, image_url')
    .order('name')

  // An empty list renders a nav without category links, which is degraded but
  // navigable. Throwing here would take down every page on the site.
  return data ?? []
}
