// src/utils/fabrics.ts
//
// The fabric library, read once per made-to-order product page.
//
// One query rather than one per collection: 69 rows is nothing, and the page
// needs all of them anyway - the dialog switches between collections without
// going back to the server, so a customer comparing a Chenille against a Naple
// is not waiting on a round trip each time they change their mind.
//
// Only active rows come back. A withdrawn fabric stays in the table so that
// orders already placed in it still read correctly; it just stops being
// offered.

import { createClient } from '@/utils/supabase/server'
import type { FabricCollection } from '@/components/Product/types'

interface FabricRow {
  id: string
  code: string
  name: string
  hex: string | null
  image_url: string | null
  is_swatchable: boolean
  sort: number
}

interface CollectionRow {
  id: string
  slug: string
  name: string
  description: string | null
  fabrics: FabricRow[] | null
}

export async function getFabricLibrary(): Promise<FabricCollection[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fabric_collections')
    .select('id, slug, name, description, fabrics(id, code, name, hex, image_url, is_swatchable, sort)')
    .eq('is_active', true)
    .eq('fabrics.is_active', true)
    .order('sort', { ascending: true })
    .order('sort', { referencedTable: 'fabrics', ascending: true })

  if (error || !data) return []

  return (data as CollectionRow[])
    .map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      fabrics: (c.fabrics ?? []).map(f => ({
        id: f.id,
        code: f.code,
        name: f.name,
        hex: f.hex,
        image: f.image_url,
        swatchable: f.is_swatchable,
        collectionName: c.name,
      })),
    }))
    // A collection whose every fabric has been withdrawn would otherwise show
    // as an empty tab.
    .filter(c => c.fabrics.length > 0)
}

/** Flat lookup, for resolving a saved basket line back to a live fabric. */
export function findFabric(library: FabricCollection[], id: string | null | undefined) {
  if (!id) return null
  for (const c of library) {
    const hit = c.fabrics.find(f => f.id === id)
    if (hit) return hit
  }
  return null
}
