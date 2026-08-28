// src/app/search/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { Search, PackageSearch } from 'lucide-react'
import EmptyState from '@/components/UI/EmptyState'
import ProductCard from '@/components/Product/ProductCard'


export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search sofas, corner settees, recliners and fabric ranges at UK Sofa Shop.',
  robots: { index: false, follow: true },
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>
const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges

export default async function SearchPage(props: { searchParams: SearchParams }) {
  const sp    = await props.searchParams
  const query = typeof sp.q === 'string' ? sp.q.trim() : ''
  const supabase = await createClient()

  let products: any[] = []
  if (query) {
    const { data } = await supabase
      .from('products')
      .select('id, title, slug, base_price, average_rating, review_count, product_variants(image_url, price_adjustment), product_categories!inner(categories(slug, name))')
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(24)
    if (data) products = data
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-calico-50)' }}>

      {/* Header */}
      <div data-ground="dark" style={{ background: 'var(--color-ink-900)', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 'var(--container-shell)', margin: '0 auto', padding: '32px 16px 24px' }}>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-eyebrow)', color: 'var(--color-ember-300)', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Search Results</div>
          <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-calico-50)', lineHeight: 1.1 }}>
            {query
              ? <><span style={{ color: 'var(--color-ember-300)' }}>&quot;{query}&quot;</span> — {products.length} {products.length === 1 ? 'result' : 'results'}</>
              : 'Search Our Collection'
            }
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--container-shell)', margin: '0 auto', padding: '24px 16px 64px' }}>

        {/* Search box (client fallback — just a form that hits ?q=) */}
        <form method="GET" action="/search" style={{ marginBottom: 24 }}>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--color-ink-500)', pointerEvents: 'none' }} />
            <input name="q" defaultValue={query} placeholder="Search sofas, fabric, style…"
              className="focus-ring-inset"
              style={{ width: '100%', height: 48, padding: '12px 48px 12px 32px', fontSize: 'var(--text-body-sm)', border: `1.5px solid var(--color-ember-700)`, borderRadius: 'var(--radius-sm)', background: 'var(--color-calico-50)', color: 'var(--color-ink-900)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <button type="submit"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: ACCENT, border: 'none', borderRadius: 'var(--radius-sm)', height: 40, minWidth: 44, padding: '0 12px', cursor: 'pointer', color: 'var(--color-ink-900)', fontSize: 'var(--text-caption)', fontWeight: 700 }}>
              Go
            </button>
          </div>
        </form>

        {!query && (
          <EmptyState
            icon={Search}
            heading="What are you after?"
            line="Type above — a style, a colour, a size — and we will look."
            action={{ label: 'Browse every sofa', href: '/shop/all' }}
          />
        )}

        {query && products.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            heading={`Nothing for "${query}"`}
            line={`Try a different spelling, or a broader word — “corner” rather than “corner sofa bed”.`}
            action={{ label: 'Browse every sofa', href: '/shop/all' }}
          />
        )}

        {products.length > 0 && (
          <>
            <h2 className="sr-only">Matching sofas</h2>

            {/* The shared card. This grid used to draw its own — a 3:4 well
                where every other card on the site is 4:5, no blur placeholder,
                a fixed sizes="200px" inside a track that grows past 400px, and
                a price that ignored the variant adjustment. */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product, i) => {
                const variant = product.product_variants?.[0] ?? null
                const catSlug = product.product_categories?.[0]?.categories?.slug ?? 'all'
                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    slug={product.slug}
                    price={Number(product.base_price) + Number(variant?.price_adjustment ?? 0)}
                    href={`/shop/${catSlug}/${product.slug}`}
                    image={variant?.image_url ?? null}
                    reviewCount={product.review_count}
                    averageRating={product.average_rating}
                    delayMs={Math.min(i, 5) * 70}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}