// src/app/shop/[category]/ProductGrid.tsx
//
// The slow half of the category page: the product query, the grid and the
// pagination. Split out of page.tsx so it can sit behind a Suspense boundary
// and stream in, while the hero and breadcrumb render immediately.

import { createClient } from '@/utils/supabase/server'
import Pagination from '@/components/UI/Pagination'
import { ITEMS_PER_PAGE, fetchProductCards, type SortKey } from './productQuery'
import ProductGridClient from './ProductGridClient'
import EmptyState, { type ActiveFilter } from './EmptyState'

interface Props {
  /** null on /shop/all, where no category filter is applied. */
  categoryId: string | null
  /** The raw URL segment, reused when building product links. */
  categorySegment: string
  page: number
  style?: string
  material?: string
  color?: string
  minPrice?: number
  maxPrice?: number
  sort: SortKey
}

export default async function ProductGrid({
  categoryId,
  categorySegment,
  page,
  style,
  material,
  color,
  minPrice,
  maxPrice,
  sort,
}: Props) {
  const supabase = await createClient()

  const { cards, count } = await fetchProductCards(
    supabase,
    { categoryId, style, material, color, minPrice, maxPrice },
    page,
    categorySegment,
    sort,
  )

  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0
  const basePath = `/shop/${encodeURIComponent(categorySegment)}`

  if (cards.length === 0) {
    // Only the facets that are actually set, in the order the sidebar lists
    // them, so a chip row reads the same way the filters do.
    const active: ActiveFilter[] = []
    if (style) active.push({ key: 'style', label: 'Style', value: style })
    if (material) active.push({ key: 'material', label: 'Material', value: material })
    if (color) active.push({ key: 'color', label: 'Colour', value: color })

    return <EmptyState basePath={basePath} filters={active} />
  }

  return (
    <>
      <p className="m-0 mb-4 font-data text-caption tabular-nums text-ink-500">
        {count} {count === 1 ? 'product' : 'products'}
      </p>

      <ProductGridClient
        initial={cards}
        total={count}
        page={page}
        categorySlug={categorySegment}
        style={style}
        material={material}
        color={color}
        minPrice={minPrice}
        maxPrice={maxPrice}
        sort={sort}
      />

      {/* ── Numbered pages, for anything that cannot press a button ─────────
          "Load more" appends rows that have no URL of their own, so on its own
          it would leave pages two onward unreachable by a crawler — and by
          anyone who has arrived without JavaScript. These are the real links,
          kept in the markup and out of the way. They are NOT aria-hidden:
          reachable by keyboard and screen reader is the point of them. */}
      {totalPages > 1 && (
        <nav aria-label="All pages" className="sr-only">
          <Pagination currentPage={page} totalPages={totalPages} />
        </nav>
      )}
    </>
  )
}
