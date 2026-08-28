'use server'
// src/app/actions/listing.ts

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { fetchProductCards, SORTS, type GridCard, type SortKey } from '@/app/shop/[category]/productQuery'

/**
 * The next page of a listing, for the "Load more" button.
 *
 * Every argument is validated even though the only caller is our own button:
 * a server action is a public endpoint with a stable id, and "the UI would
 * never send that" is not a check.
 *
 * The category arrives as a SLUG and is resolved to an id here rather than
 * being passed as one. A client that could name the id could ask for any
 * category's rows regardless of what the page it is on is showing; a slug can
 * only ever name a category that exists.
 */
const schema = z.object({
  categorySlug: z.string().trim().max(120),
  page: z.coerce.number().int().min(1).max(500),
  style: z.string().trim().max(80).optional(),
  material: z.string().trim().max(80).optional(),
  color: z.string().trim().max(80).optional(),
  minPrice: z.number().int().min(0).max(1_000_000).optional(),
  maxPrice: z.number().int().min(0).max(1_000_000).optional(),
  sort: z.enum(SORTS).default('featured'),
})

export async function loadMoreProducts(
  input: z.input<typeof schema>,
): Promise<{ cards: GridCard[]; count: number } | { error: string }> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: 'Could not load any more just now.' }

  const { categorySlug, page, style, material, color, minPrice, maxPrice, sort } = parsed.data
  const supabase = await createClient()

  let categoryId: string | null = null
  if (categorySlug !== 'all') {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .limit(1)
      .maybeSingle()

    if (!data) return { error: 'Could not load any more just now.' }
    categoryId = data.id
  }

  try {
    return await fetchProductCards(
      supabase,
      { categoryId, style, material, color, minPrice, maxPrice },
      page,
      categorySlug,
      sort as SortKey,
    )
  } catch (err) {
    console.error('loadMoreProducts failed:', err)
    return { error: 'Could not load any more just now.' }
  }
}
