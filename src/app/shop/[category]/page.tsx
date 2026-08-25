// src/app/shop/[category]/page.tsx
import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { breadcrumbSchema, jsonLd } from '@/utils/schema'
import { LEGACY_CATEGORY_SLUGS } from '@/utils/productUrl'
import {
  ITEMS_PER_PAGE,
  parsePageParam,
  hasActiveFilters,
  countMatchingProducts,
} from './productQuery'
import ProductGrid from './ProductGrid'
import CategoryFilters from './CategoryFilters'
import { ProductGridSkeleton, FilterSidebarSkeleton } from './Skeletons'
import Link from 'next/link'
import Image from 'next/image'

type Params       = Promise<{ category: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export async function generateMetadata(
  props: { params: Params; searchParams: SearchParams },
): Promise<Metadata> {
  const { category } = await props.params
  const sp = await props.searchParams

  const decodedCategory = decodeURIComponent(category)

  const supabase = await createClient()

  const { data } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', decodedCategory)
    .limit(1)
    .maybeSingle()

  const name = data?.name ?? 'All Products'
  const page = parsePageParam(sp.page)

  const style    = typeof sp.style === 'string' ? sp.style : undefined
  const material = typeof sp.material === 'string' ? sp.material : undefined
  const color    = typeof sp.color === 'string' ? sp.color : undefined
  const filtered = hasActiveFilters({ style, material, color })

  const basePath = `/shop/${decodedCategory}`

  // Each page of a listing is its own canonical. Pointing page 2 at page 1
  // tells Google the deeper products are duplicates and it drops them.
  // Page 1 stays parameter-free so /shop/x and /shop/x?page=1 do not compete.
  const path = page > 1 ? `${basePath}?page=${page}` : basePath

  const title = page > 1 ? `${name} - Page ${page}` : name
  const description = `Shop our premium ${name.toLowerCase()} collection. Free delivery across UK Mainland. Cash on Delivery available.`

  return {
    title,
    description,
    alternates: { canonical: path },
    // A filtered view is a near-duplicate of the unfiltered one and there is a
    // combinatorial number of them, so keep them out of the index - but still
    // follow the links, because the product pages they lead to matter.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    // Overrides the root layout's card so a shared category link names the
    // category rather than the homepage.
    openGraph: { type: 'website', title, description, url: path },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CategoryPage(props: { params: Params; searchParams: SearchParams }) {
  const { category } = await props.params
  const decodedCategory = decodeURIComponent(category)

  const sp       = await props.searchParams

  // A category we have renamed. Sending a 308 keeps old links and any indexed
  // URLs working, and passes their ranking to the new slug. Filters and the
  // page number are carried across so a bookmarked filtered view survives.
  const renamedTo = LEGACY_CATEGORY_SLUGS[decodedCategory]
  if (renamedTo) {
    const qs = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        typeof v === 'string' ? [[k, v] as [string, string]] : [],
      ),
    ).toString()
    permanentRedirect(`/shop/${renamedTo}${qs ? `?${qs}` : ''}`)
  }

  const supabase = await createClient()

  let categoryData: { id: string; name: string; image_url?: string | null } | null = null

  if (decodedCategory !== 'all') {
    const { data } = await supabase
      .from('categories')
      .select('id, name, image_url')
      .eq('slug', decodedCategory)
      .limit(1)
      .maybeSingle()

    // notFound() rather than rendering a "not found" message inside a 200
    // response - a soft 404 gets indexed and burns crawl budget. This runs
    // before anything suspends, so the 404 status is real rather than a
    // client-side transition on top of a 200.
    if (!data) notFound()
    categoryData = data
  }

  const pageTitle = categoryData ? categoryData.name : 'All Sofas'

  const style    = typeof sp.style === 'string' ? sp.style : undefined
  const material = typeof sp.material === 'string' ? sp.material : undefined
  const color    = typeof sp.color === 'string' ? sp.color : undefined

  // Anything that is not a positive integer becomes page 1 rather than being
  // handed to range() as NaN or a negative number.
  const currentPage = parsePageParam(sp.page)

  // Whether the requested page exists has to be settled here, before anything
  // suspends - a notFound() raised inside a Suspense boundary arrives after the
  // 200 has already been committed and Google records it as a soft 404.
  //
  // Page 1 of an empty category is legitimate ("no products found"); page 5 of
  // a two-page listing is not, and left unchecked it lets a crawler walk an
  // unlimited number of empty pages.
  if (currentPage > 1) {
    const total = await countMatchingProducts(supabase, {
      categoryId: categoryData?.id ?? null,
      style,
      material,
      color,
    })
    const lastPage = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
    if (currentPage > lastPage) notFound()
  }

  // Re-fetching on a filter change should show the skeleton again rather than
  // freezing the old results, so the boundary is keyed on what it depends on.
  const gridKey = [decodedCategory, currentPage, style, material, color].join('|')

  // Matches the visual breadcrumb rendered below, which had no markup behind it.
  const breadcrumbLd = breadcrumbSchema(
    decodedCategory === 'all'
      ? [{ name: 'Home', path: '/' }, { name: 'All Sofas', path: '/shop/all' }]
      : [
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop/all' },
          { name: pageTitle, path: `/shop/${encodeURIComponent(decodedCategory)}` },
        ]
  )

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }} />

      {/* Hero banner */}
      <div className="relative bg-[#0c0c0b] overflow-hidden">
        {categoryData?.image_url && (
          <Image src={categoryData.image_url} alt={pageTitle} fill className="object-cover opacity-30" sizes="100vw" />
        )}
        <div className="relative max-w-[1100px] mx-auto px-4 pt-10 pb-8">
          <nav className="flex items-center gap-1.5 mb-3.5 flex-wrap">
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} className="flex items-center gap-1.5">
                <Link href={href} className="text-[11px] text-white/40 no-underline hover:text-white transition-colors">
                  {label}
                </Link>
                <span className="text-white/20 text-[10px]">›</span>
              </span>
            ))}
            <span className="text-[11px] text-[#d4871a] font-semibold">{pageTitle}</span>
          </nav>
          <div className="flex items-baseline justify-between flex-wrap gap-2.5">
            <div>
              <div className="text-[9px] text-[#d4871a] uppercase tracking-[0.22em] font-bold mb-1.5">
                Collection
              </div>
              <h1 className="font-playfair text-[clamp(26px,5vw,44px)] font-bold text-white leading-tight">
                {pageTitle}
              </h1>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-[#d4871a]" />
      </div>

      {/* Main content */}
      <div className="max-w-[1100px] mx-auto px-4 py-8 pb-20">

        {/* BULLETPROOF GRID: Sidebar is exactly 200px, Product grid gets the remaining 1fr */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-8 items-start">

          <div className="w-full">
            <Suspense fallback={<FilterSidebarSkeleton />}>
              <CategoryFilters categoryId={categoryData?.id ?? null} />
            </Suspense>
          </div>

          <div className="w-full min-w-0">
            <Suspense key={gridKey} fallback={<ProductGridSkeleton />}>
              <ProductGrid
                categoryId={categoryData?.id ?? null}
                categorySegment={category}
                page={currentPage}
                style={style}
                material={material}
                color={color}
              />
            </Suspense>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
