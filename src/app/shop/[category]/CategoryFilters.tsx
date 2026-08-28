// src/app/shop/[category]/CategoryFilters.tsx
//
// Builds the filter options for the sidebar. This scans every active product
// in the category, so it is slow enough to deserve its own Suspense boundary
// rather than holding up the grid.

import { createClient } from '@/utils/supabase/server'
import FilterSidebar, { type FilterOption } from '@/components/Category/FilterSidebar'

interface Props {
  categoryId: string | null
  /** The facets currently applied, so the counts can account for them. */
  style?: string
  material?: string
  color?: string
  minPrice?: number
  maxPrice?: number
}

/** One product, reduced to the four things the filters care about. */
interface Row {
  price: number
  style?: string
  materials: string[]
  colors: string[]
}

export default async function CategoryFilters({
  categoryId, style, material, color, minPrice, maxPrice,
}: Props) {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('base_price, specifications, product_variants(material, color), product_categories!inner(category_id)')
    .eq('is_active', true)

  if (categoryId) query = query.eq('product_categories.category_id', categoryId)

  const { data } = await query

  // specifications is a free-form jsonb column, so `style` genuinely might not
  // be there. Narrowing to Record<string, unknown> keeps the optional access
  // honest without claiming a shape the database does not enforce.
  const specStyle = (specs: unknown): string | undefined => {
    if (!specs || typeof specs !== 'object') return undefined
    const value = (specs as Record<string, unknown>).style
    return typeof value === 'string' ? value : undefined
  }

  const notEmpty = (v: string | null | undefined): v is string => Boolean(v)

  const rows: Row[] = (data ?? []).map(p => ({
    price: Number(p.base_price) || 0,
    style: specStyle(p.specifications),
    materials: p.product_variants.map(v => v.material).filter(notEmpty),
    colors: p.product_variants.map(v => v.color).filter(notEmpty),
  }))

  // ── Counting ─────────────────────────────────────────────────────────────
  // A facet's own value is excluded from its own count. Counting "Grey" while
  // Grey is selected would report 1 against every colour and make the numbers
  // useless — the question the number answers is "how many would I have if I
  // picked this", not "how many do I have now".
  const eq = (a: string | undefined, b: string | undefined) =>
    !b || (a ?? '').toLowerCase() === b.toLowerCase()

  const matches = (row: Row, ignore: 'style' | 'material' | 'color' | null) =>
    (ignore === 'style' || eq(row.style, style)) &&
    (ignore === 'material' || !material || row.materials.some(m => eq(m, material))) &&
    (ignore === 'color' || !color || row.colors.some(c => eq(c, color))) &&
    (minPrice === undefined || row.price >= minPrice) &&
    (maxPrice === undefined || row.price <= maxPrice)

  const tally = (
    ignore: 'style' | 'material' | 'color',
    valuesOf: (row: Row) => string[],
  ): FilterOption[] => {
    const counts = new Map<string, { label: string; n: number }>()
    for (const row of rows) {
      if (!matches(row, ignore)) continue
      // A product is counted ONCE per value however many variants carry it.
      for (const value of new Set(valuesOf(row))) {
        const key = value.toLowerCase()
        const seen = counts.get(key)
        if (seen) seen.n += 1
        else counts.set(key, { label: value, n: 1 })
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
      .map(({ label, n }) => ({ value: label, count: n }))
  }

  const styles = tally('style', r => (r.style ? [r.style] : []))
  const materials = tally('material', r => r.materials)
  const colors = tally('color', r => r.colors)

  // The number on the sheet's button: everything currently selected, applied.
  const resultCount = rows.filter(r => matches(r, null)).length

  // Bounds are the category's own, unaffected by the price filter — otherwise
  // the slider would shrink around the handles and could never be widened.
  const prices = rows.map(r => r.price).filter(p => p > 0)
  const floor = prices.length ? Math.floor(Math.min(...prices)) : 0
  const ceiling = prices.length ? Math.ceil(Math.max(...prices)) : 0

  return (
    <FilterSidebar
      styles={styles}
      materials={materials}
      colors={colors}
      priceFloor={floor}
      priceCeiling={ceiling}
      priceFrom={minPrice ?? floor}
      priceTo={maxPrice ?? ceiling}
      resultCount={resultCount}
    />
  )
}
