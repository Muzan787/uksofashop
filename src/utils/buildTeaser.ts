// src/utils/buildTeaser.ts
//
// The figures the "Build your own sofa" section is drawn with, read at
// request time so the section can never claim a frame, a price or a fabric
// count the builder itself would not offer.
//
// Two pages carry the section - the homepage and the free-samples page - and
// each already has the fabric library in hand, so it is passed in rather than
// fetched twice.

import { createClient } from '@/utils/supabase/server'
import type { FabricCollection } from '@/components/Product/types'
import type { BuildTeaser } from '@/components/Home/BuildYourOwn'

/**
 * The Ashton high back is the first choice for the board because it is the
 * best studio shot in the range; any 3 seater with a photograph stands in,
 * then any made-to-order frame at all.
 */
const PREFERRED_SLUG = 'ashton-high-back-3-seater'

/** Three swatches that read as a range at 28px: a colour, a neutral, a dark. */
const SWATCH_CODES = ['PL08', 'CH02', 'CH05']

interface FrameRow {
  slug: string
  title: string
  base_price: number | string
  size_label: string | null
  product_variants: { image_url: string | null; priority: number | null }[] | null
}

export async function getBuildTeaser(library: FabricCollection[]): Promise<BuildTeaser> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('slug, title, base_price, size_label, product_variants(image_url, priority)')
    .eq('custom_made', true)
    .eq('is_active', true)

  const frames = ((data ?? []) as FrameRow[]).map(f => ({
    ...f,
    image: [...(f.product_variants ?? [])]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .find(v => v.image_url)?.image_url ?? null,
  }))

  const board =
    frames.find(f => f.slug === PREFERRED_SLUG && f.image) ??
    frames.find(f => f.size_label === '3 Seater' && f.image) ??
    frames.find(f => f.image) ??
    null

  const threeSeaters = frames
    .filter(f => f.size_label === '3 Seater')
    .map(f => Number(f.base_price))
    .filter(Number.isFinite)

  const all = library.flatMap(c => c.fabrics)
  const wanted = SWATCH_CODES
    .map(code => all.find(f => f.code === code))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))

  return {
    image: board?.image ?? null,
    title: board?.title ?? null,
    threeSeaterFrom: threeSeaters.length ? Math.min(...threeSeaters) : null,
    fabricCount: all.length,
    swatches: (wanted.length === SWATCH_CODES.length ? wanted : all.slice(0, 3)).map(f => ({
      image: f.image,
      hex: f.hex,
      name: f.name,
    })),
  }
}
