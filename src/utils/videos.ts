// src/utils/videos.ts
//
// Reads from the videos table for the storefront. Public policy limits every
// query here to active rows, so a clip taken off in the admin disappears
// from the site without any further filter.

import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/utils/supabase/public'
import type { StripVideo } from '@/components/UI/VideoStrip'

/**
 * Warehouse clips for the About and Showroom pages.
 *
 * The anonymous client and a shared cache, so the two pages stay static:
 * the request-bound client would make both render per visit for data that
 * is the same for everyone. The admin actions call revalidatePath on both
 * pages, and revalidateTag('videos') is here for anything else.
 */
export const getWarehouseVideos = unstable_cache(
  async (): Promise<StripVideo[]> => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('videos')
      .select('id, url, caption, width, height')
      .eq('kind', 'warehouse')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(6)
    return data ?? []
  },
  ['warehouse-videos'],
  { revalidate: 3600, tags: ['videos'] },
)
