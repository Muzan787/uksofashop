// src/app/search/page.tsx
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Search, PackageSearch, Star, ArrowRight } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>
const ACCENT = '#d4871a'

export default async function SearchPage(props: { searchParams: SearchParams }) {
  const sp    = await props.searchParams
  const query = typeof sp.q === 'string' ? sp.q.trim() : ''
  const supabase = await createClient()

  let products: any[] = []
  if (query) {
    const { data } = await supabase
      .from('products')
      .select('id, title, slug, base_price, average_rating, review_count, product_variants(image_url), product_categories!inner(categories(slug, name))')
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(24)
    if (data) products = data
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2' }}>

      {/* Header */}
      <div style={{ background: '#0c0c0b', borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 24px' }}>
          <div style={{ fontSize: 9, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, marginBottom: 8 }}>Search Results</div>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
            {query
              ? <><em style={{ color: ACCENT, fontStyle: 'normal' }}>"{query}"</em> — {products.length} {products.length === 1 ? 'result' : 'results'}</>
              : 'Search Our Collection'
            }
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* Search box (client fallback — just a form that hits ?q=) */}
        <form method="GET" action="/search" style={{ marginBottom: 28 }}>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#a8a29e', pointerEvents: 'none' }} />
            <input name="q" defaultValue={query} placeholder="Search sofas, fabric, style…"
              style={{ width: '100%', padding: '11px 50px 11px 40px', fontSize: 13, border: `1.5px solid ${ACCENT}`, borderRadius: 8, outline: 'none', background: '#fff', color: '#1c1917', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <button type="submit"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: ACCENT, border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              Go
            </button>
          </div>
        </form>

        {!query && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Search style={{ width: 40, height: 40, color: '#d6d3d1', margin: '0 auto 14px' }} />
            <p style={{ fontSize: 14, color: '#78716c' }}>Type something above to search our collection.</p>
          </div>
        )}

        {query && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #f0ede8' }}>
            <PackageSearch style={{ width: 40, height: 40, color: '#d6d3d1', margin: '0 auto 14px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>No results for "{query}"</h2>
            <p style={{ fontSize: 13, color: '#78716c', maxWidth: 300, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Try a different spelling or browse our full collection.
            </p>
            <Link href="/shop/all" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', padding: '10px 20px', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Browse All Sofas <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        )}

        {products.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {products.map((product) => {
              const img     = product.product_variants?.[0]?.image_url ?? null
              const catSlug = product.product_categories?.[0]?.categories?.slug ?? 'all'
              return (
                <Link key={product.id} href={`/shop/${catSlug}/${product.slug}`} className="group block" style={{ textDecoration: 'none' }}>
                  <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', background: '#ede8df', marginBottom: 10 }}>
                    {img
                      ? <Image src={img} alt={product.title} fill sizes="200px" style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }} className="group-hover:scale-105" />
                      : <div style={{ position: 'absolute', inset: 0, background: '#e7e5e4' }} />
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.3s' }} className="group-hover:bg-black/8" />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}
                    className="group-hover:text-[#d4871a]">{product.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1c1917' }}>£{product.base_price.toFixed(0)}</span>
                    {(product.review_count ?? 0) > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#78716c' }}>
                        <Star style={{ width: 10, height: 10, fill: ACCENT, color: ACCENT }} />
                        {(product.average_rating ?? 0).toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}