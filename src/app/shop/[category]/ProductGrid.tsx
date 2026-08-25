// src/app/shop/[category]/ProductGrid.tsx
//
// The slow half of the category page: the product query, the grid and the
// pagination. Split out of page.tsx so it can sit behind a Suspense boundary
// and stream in, while the hero and breadcrumb render immediately.

import Link from 'next/link'
import Image from 'next/image'
import { PackageSearch, Star, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Pagination from '@/components/UI/Pagination'
import { ITEMS_PER_PAGE, applyProductFilters } from './productQuery'

interface Props {
  /** null on /shop/all, where no category filter is applied. */
  categoryId: string | null
  /** The raw URL segment, reused when building product links. */
  categorySegment: string
  page: number
  style?: string
  material?: string
  color?: string
}

export default async function ProductGrid({
  categoryId,
  categorySegment,
  page,
  style,
  material,
  color,
}: Props) {
  const supabase = await createClient()

  const from = (page - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  // Same filters as the count in page.tsx, from one definition - see
  // productQuery.ts for why that matters.
  const query = applyProductFilters(
    supabase
      .from('products')
      .select(
        'id, title, slug, base_price, average_rating, review_count, product_variants!inner(image_url, material, color, price_adjustment, priority), product_categories!inner(category_id)',
        { count: 'exact' },
      )
      .eq('is_active', true),
    { categoryId, style, material, color },
  )

  const { data: products, count } = await query
    .order('created_at', { ascending: false })
    // Tell Supabase to sort the joined variants array by priority!
    .order('priority', { referencedTable: 'product_variants', ascending: true })
    .range(from, to)

  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-white rounded-xl border border-[#f0ede8]">
        <PackageSearch className="w-9 h-9 text-stone-300 mb-3.5" />
        <h3 className="text-[17px] font-bold text-stone-900 mb-2">No products found</h3>
        <p className="text-xs text-stone-500 max-w-[300px] mb-5 leading-relaxed">
          Try removing some filters or browse our full collection.
        </p>
        <Link
          href="/shop/all"
          className="inline-flex items-center gap-1.5 bg-[#d4871a] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold no-underline tracking-widest uppercase hover:bg-[#b67316] transition-colors"
        >
          Browse All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  return (
    <>
      {count !== null && (
        <p className="text-xs text-stone-500 mb-5">
          {count} {count === 1 ? 'product' : 'products'}
        </p>
      )}

      {/* STRICT GRID: 2 columns on mobile, 3 columns on tablet/desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mb-10 w-full">
        {products.map((product, i) => {
          let targetVariant = product.product_variants?.[0]

          if (color || material) {
            const match = product.product_variants?.find(v => {
              const colorMatch = color ? v.color?.toLowerCase() === color.toLowerCase() : true
              const matMatch = material ? v.material?.toLowerCase() === material.toLowerCase() : true
              return colorMatch && matMatch
            })
            if (match) targetVariant = match
          }

          const img = targetVariant?.image_url ?? null
          const displayPrice = product.base_price + (targetVariant?.price_adjustment || 0)

          return (
            <Link
              key={product.id}
              href={`/shop/${categorySegment}/${product.slug}`}
              className="group block w-full outline-none"
              style={{ opacity: 0, animation: `fadeUp 0.4s ease ${i * 40}ms forwards` }}
            >
              <div className="relative w-full aspect-square md:aspect-[3/4] bg-[#ede8df] rounded-[10px] overflow-hidden mb-3">
                {img ? (
                  <Image
                    src={img}
                    alt={product.title}
                    fill
                    sizes="(max-width:768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#e7e5e4]" />
                )}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

                <div className="hidden md:block absolute bottom-2 left-2 right-2 bg-white/95 rounded-md py-2 text-center text-[10px] font-bold tracking-[0.1em] uppercase text-stone-900 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Quick View
                </div>
              </div>

              <div className="w-full px-1">
                {/* Built-in Tailwind line-clamp ensures long text wraps neatly without breaking the layout */}
                <h3 className="text-[13px] font-bold text-stone-900 leading-snug mb-1.5 line-clamp-2 transition-colors duration-200 group-hover:text-[#d4871a]">
                  {product.title}
                </h3>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-extrabold text-stone-900">
                    £{displayPrice.toFixed(0)}
                  </span>
                  {(product.review_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-[11px] h-[11px] fill-[#d4871a] text-[#d4871a]" />
                      <span className="text-[10px] font-medium text-stone-500">
                        {(product.average_rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  )
}
