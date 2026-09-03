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
  parseSort,
  parsePrice,
  categoryPriceRange,
} from './productQuery'
import ProductGrid from './ProductGrid'
import CategoryFilters from './CategoryFilters'
import { ProductGridSkeleton, FilterSidebarSkeleton } from './Skeletons'
import CategoryHero, { type CategoryChip } from '@/components/Category/CategoryHero'
import SortSelect from '@/components/Category/SortSelect'
import ActiveFilterChips, { type Chip } from '@/components/Category/ActiveFilterChips'
import CategoryCopy from '@/components/Category/CategoryCopy'
import { CATEGORY_COPY } from '@/constants/categorySeo'

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
  const minPrice = parsePrice(sp.min)
  const maxPrice = parsePrice(sp.max)
  // A sorted listing is the same rows in a different order, which is a
  // duplicate as far as an index is concerned — so it is kept out of one
  // exactly like a filtered view is.
  const sorted = parseSort(sp.sort) !== 'featured'
  const filtered = hasActiveFilters({ style, material, color, minPrice, maxPrice }) || sorted

  const basePath = `/shop/${decodedCategory}`

  // Each page of a listing is its own canonical. Pointing page 2 at page 1
  // tells Google the deeper products are duplicates and it drops them.
  // Page 1 stays parameter-free so /shop/x and /shop/x?page=1 do not compete.
  const path = page > 1 ? `${basePath}?page=${page}` : basePath

  // The DB category name still titles the page itself. What goes in <title>
  // and the description is written for the search result instead - see
  // src/constants/categorySeo.ts for why the two are not the same string.
  //
  // A category with no entry falls back to its DB name, so adding a category in
  // the admin panel gives a working page immediately rather than a broken one.
  // It just does not get the tuned title until somebody writes it.
  const copy = CATEGORY_COPY[decodedCategory]
  const baseTitle = copy?.title ?? name

  const title = page > 1 ? `${baseTitle} - Page ${page}` : baseTitle
  const description =
    copy?.description ??
    `Shop our ${name.toLowerCase()} at UK Sofa Shop. Free delivery across UK Mainland in 2-4 working days, and cash on delivery.`

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
  const minPrice = parsePrice(sp.min)
  const maxPrice = parsePrice(sp.max)
  const sort     = parseSort(sp.sort)

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
      minPrice,
      maxPrice,
    })
    const lastPage = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
    if (currentPage > lastPage) notFound()
  }
  // ── What the hero says about this category ──────────────────────────────
  // The count and range describe the CATEGORY, not the filtered view: a hero
  // that changed its own summary every time a facet was ticked would be
  // describing the results rather than the section.
  const heroFilters = { categoryId: categoryData?.id ?? null }

  const [heroCount, heroRange, siblingRows] = await Promise.all([
    countMatchingProducts(supabase, heroFilters),
    categoryPriceRange(supabase, heroFilters),
    supabase.from('categories').select('slug, name, parent_id').order('name'),
  ])

  // Categories alongside this one — the same level of the tree, so the row
  // offers a sideways move rather than a jump up or down it.
  const allCategories = (siblingRows.data ?? []) as { slug: string; name: string; parent_id: string | null }[]
  const currentRow = allCategories.find(c => c.slug === decodedCategory)
  const level = currentRow?.parent_id ?? null

  const siblings: CategoryChip[] = [
    { slug: 'all', name: 'All sofas' },
    ...allCategories
      .filter(c => (c.parent_id ?? null) === level)
      .map(c => ({ slug: c.slug, name: c.name })),
  ]

  // Re-fetching on a filter change should show the skeleton again rather than
  // freezing the old results, so the boundary is keyed on what it depends on.
  const gridKey = [decodedCategory, currentPage, style, material, color, minPrice, maxPrice, sort].join('|')

  // Everything narrowing the listing, as one list, so the chip row and the
  // hrefs that remove them come from a single description of the state.
  const basePath = `/shop/${encodeURIComponent(decodedCategory)}`
  const chips: Chip[] = []
  if (style) chips.push({ keys: ['style'], params: [['style', style]], label: style })
  if (material) chips.push({ keys: ['material'], params: [['material', material]], label: material })
  if (color) chips.push({ keys: ['color'], params: [['color', color]], label: color })
  if (minPrice !== undefined || maxPrice !== undefined) {
    const pairs: [string, string][] = []
    if (minPrice !== undefined) pairs.push(['min', String(minPrice)])
    if (maxPrice !== undefined) pairs.push(['max', String(maxPrice)])
    chips.push({
      keys: ['min', 'max'],
      params: pairs,
      label: `£${minPrice ?? heroRange.from ?? 0} – £${maxPrice ?? heroRange.to ?? 0}`,
    })
  }

  // The prose under the grid, on the canonical view of the category only.
  //
  // Page 2 and every filtered view are noindex already, so repeating the same
  // four paragraphs across them would buy nothing - and it would put identical
  // copy on a dozen URLs, which is the exact signal the noindex is there to
  // avoid sending. It is also simply not what those pages are for: somebody who
  // has ticked "chenille" and gone to page 2 has finished reading the intro.
  const introCopy = CATEGORY_COPY[decodedCategory]
  const showIntro = Boolean(introCopy) && currentPage === 1 && !hasActiveFilters({
    style, material, color, minPrice, maxPrice,
  }) && sort === 'featured'

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
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }} />

      <CategoryHero
        title={pageTitle}
        slug={decodedCategory}
        image={categoryData?.image_url ?? null}
        count={heroCount}
        priceFrom={heroRange.from}
        priceTo={heroRange.to}
        siblings={siblings}
      />

      {/* Main content */}
      <div className="relative mx-auto max-w-shell px-4 pb-12 pt-6 sm:px-6 lg:pb-16 lg:pt-8">

        {/* Sidebar is exactly 220px, the grid takes the remaining 1fr. */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[220px_1fr] lg:gap-8">

          <div className="w-full">
            <Suspense fallback={<FilterSidebarSkeleton />}>
              <CategoryFilters
                categoryId={categoryData?.id ?? null}
                style={style}
                material={material}
                color={color}
                minPrice={minPrice}
                maxPrice={maxPrice}
              />
            </Suspense>
          </div>

          <div className="w-full min-w-0">
            {/* Sort sits with the results rather than with the filters: it
                does not change WHICH sofas are shown, and putting it inside
                the filter sheet would hide it from everyone on a phone.

                The caption used to print SORT_LABELS[sort] — the same words
                the select next to it already displayed, twice on one row. It
                carries the section mark instead, so the controls row is
                anchored the way every other heading on the site is. */}
            <div className="mb-4 flex items-end justify-between gap-4 lg:mb-5">
              <span className="min-w-0 flex-1">
                <span className="eyebrow m-0 flex items-center gap-2.5 text-ember-700">
                  <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
                  Sort
                </span>
                <span
                  aria-hidden="true"
                  className="mt-2.5 block h-px w-full"
                  style={{ backgroundImage: 'var(--grad-rule)', opacity: 0.4 }}
                />
              </span>
              <SortSelect value={sort} />
            </div>

            <ActiveFilterChips
              basePath={basePath}
              chips={chips}
              sort={sort === 'featured' ? undefined : sort}
            />

            <Suspense key={gridKey} fallback={<ProductGridSkeleton />}>
              <ProductGrid
                categoryId={categoryData?.id ?? null}
                categorySegment={category}
                page={currentPage}
                style={style}
                material={material}
                color={color}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sort={sort}
              />
            </Suspense>
          </div>
        </div>

        {showIntro && introCopy && <CategoryCopy copy={introCopy} />}
      </div>
    </div>
  )
}
