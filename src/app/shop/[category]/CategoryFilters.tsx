// src/app/shop/[category]/CategoryFilters.tsx
//
// Builds the filter options for the sidebar. This scans every active product
// in the category, so it is slow enough to deserve its own Suspense boundary
// rather than holding up the grid.

import { createClient } from '@/utils/supabase/server'
import FilterSidebar from '@/components/Category/FilterSidebar'

export default async function CategoryFilters({ categoryId }: { categoryId: string | null }) {
  const supabase = await createClient()

  let specsQ = supabase
    .from('products')
    .select('specifications, product_variants(material, color), product_categories!inner(category_id)')
    .eq('is_active', true)

  if (categoryId) specsQ = specsQ.eq('product_categories.category_id', categoryId)

  const { data: allSpecs } = await specsQ

  // Extract unique filter options
  // specifications is a free-form jsonb column, so `style` genuinely might not
  // be there. Narrowing to Record<string, unknown> keeps the optional access
  // honest without claiming a shape the database does not enforce.
  const specStyle = (specs: unknown): string | undefined => {
    if (!specs || typeof specs !== 'object') return undefined
    const value = (specs as Record<string, unknown>).style
    return typeof value === 'string' ? value : undefined
  }

  const notEmpty = (v: string | null | undefined): v is string => Boolean(v)

  const uniqueStyles = [
    ...new Set((allSpecs ?? []).map(p => specStyle(p.specifications)).filter(notEmpty)),
  ]
  const uniqueMaterials = [
    ...new Set((allSpecs ?? []).flatMap(p => p.product_variants.map(v => v.material)).filter(notEmpty)),
  ]
  const uniqueColors = [
    ...new Set((allSpecs ?? []).flatMap(p => p.product_variants.map(v => v.color)).filter(notEmpty)),
  ]

  return (
    <FilterSidebar
      availableStyles={uniqueStyles}
      availableMaterials={uniqueMaterials}
      availableColors={uniqueColors}
    />
  )
}
