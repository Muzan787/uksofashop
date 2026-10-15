import type { Metadata } from 'next'
// src/app/admin/inventory/page.tsx
//
// The product list (admin upgrade K1): each product's photo, type, size,
// colour swatches and flags (hidden, featured, made to order, no photo, no
// size); search by name, range, colour or SKU; filters by type and by
// shown, hidden or needs attention; totals; and Add a product. A card opens
// the editor; the eye hides or shows it straight away.
import Link from 'next/link'
import { CheckCircle2, Eye, EyeOff, LayoutGrid, Plus, Search } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { activateProduct, deleteProduct } from '@/app/actions/inventory'
import ConfirmSubmit from '@/components/Admin/ConfirmSubmit'
import { percentOff, pounds } from '@/utils/pricing'
import { matchesSearch, needsAttention, productFlags, productSize, type ListProduct, type ProductFlag } from '@/utils/catalogue'

export const metadata: Metadata = { title: 'Products' }
export const dynamic = 'force-dynamic'

const SHOW = [
  { key: 'all', label: 'All' },
  { key: 'shown', label: 'Shown' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'attention', label: 'Needs attention' },
] as const

const FLAG: Record<ProductFlag, { label: string; style: string }> = {
  hidden: { label: 'Hidden', style: 'border-stone-300 bg-stone-100 text-stone-700' },
  featured: { label: 'Featured', style: 'border-orange-200 bg-orange-50 text-orange-800' },
  'made-to-order': { label: 'Made to order', style: 'border-amber-200 bg-amber-50 text-amber-800' },
  'no-photo': { label: 'No photo', style: 'border-red-200 bg-red-50 text-red-800' },
  'no-size': { label: 'No size', style: 'border-red-200 bg-red-50 text-red-800' },
}

type Row = ListProduct & {
  id: string
  base_price: number
  was_price: number | null
  category_id: string | null
  product_categories: { category_id: string }[]
  variant_groups: { name: string } | null
}

type SearchParams = Promise<{ q?: string; type?: string; show?: string; deleted?: string }>

export default async function InventoryPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams
  const q = (sp.q ?? '').trim().slice(0, 80)
  const show = SHOW.some(s => s.key === sp.show) ? sp.show! : 'all'
  const supabase = await createClient()

  const [{ data }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, base_price, was_price, is_active, is_featured, custom_made, size_label, gallery_images, specifications, category_id, variant_groups(name), product_categories(category_id), product_variants(sku, color, color_hex, image_url, is_active, priority)')
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name').order('sort').order('name'),
  ])

  const all = ((data ?? []) as unknown as Omit<Row, 'variant_group'>[]).map(p => ({
    ...p,
    variant_group: p.variant_groups?.name ?? null,
    product_variants: [...(p.product_variants ?? [])].sort((a, b) =>
      ((a as { priority?: number | null }).priority ?? 99) - ((b as { priority?: number | null }).priority ?? 99)),
  })) as Row[]
  const type = (categories ?? []).some(c => c.id === sp.type) ? sp.type! : ''
  const categoryName = new Map((categories ?? []).map(c => [c.id, c.name]))

  const totals = {
    all: all.length,
    shown: all.filter(p => p.is_active).length,
    hidden: all.filter(p => !p.is_active).length,
    attention: all.filter(needsAttention).length,
  }

  const products = all.filter(p =>
    matchesSearch(p, q)
    && (!type || p.category_id === type || p.product_categories.some(c => c.category_id === type))
    && (show === 'all'
      || (show === 'shown' && p.is_active)
      || (show === 'hidden' && !p.is_active)
      || (show === 'attention' && needsAttention(p))))

  const href = (params: { show?: string; type?: string }) => {
    const s = new URLSearchParams()
    const nextShow = params.show ?? show
    const nextType = params.type ?? type
    if (q) s.set('q', q)
    if (nextShow !== 'all') s.set('show', nextShow)
    if (nextType) s.set('type', nextType)
    const qs = s.toString()
    return `/admin/inventory${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Products</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">
            {totals.all} in all · {totals.shown} shown · {totals.hidden} hidden · {totals.attention} need attention
          </p>
        </div>
        <Link href="/admin/inventory/new" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-orange-500 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-600">
          <Plus className="h-5 w-5" aria-hidden="true" /> Add a product
        </Link>
      </div>

      {sp.deleted && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {sp.deleted.slice(0, 120)} deleted.
        </p>
      )}

      <form action="/admin/inventory" method="get" role="search" className="flex gap-2">
        {show !== 'all' && <input type="hidden" name="show" value={show} />}
        {type && <input type="hidden" name="type" value={type} />}
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <input id="product-search" name="q" type="search" defaultValue={q} maxLength={80} autoComplete="off"
          placeholder="Name, range, colour or SKU"
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-stone-300 bg-white px-3 text-base text-stone-900 focus:border-stone-900 focus:outline-none" />
        <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-stone-900 px-4 text-sm font-bold text-white">
          <Search className="h-4 w-4" aria-hidden="true" /> Search
        </button>
      </form>

      <nav aria-label="Show" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
        {SHOW.map(s => (
          <Link key={s.key} href={href({ show: s.key })} aria-current={show === s.key ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-sm px-3.5 text-xs font-bold ${show === s.key ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>
            {s.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${show === s.key ? 'bg-white/15' : 'bg-stone-100 text-stone-500'}`}>{totals[s.key]}</span>
          </Link>
        ))}
      </nav>
      <nav aria-label="Type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
        <Link href={href({ type: '' })} aria-current={!type ? 'page' : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-pill border px-3.5 text-xs font-bold ${!type ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}>Every type</Link>
        {(categories ?? []).map(c => (
          <Link key={c.id} href={href({ type: c.id })} aria-current={type === c.id ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-pill border px-3.5 text-xs font-bold ${type === c.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}>{c.name}</Link>
        ))}
      </nav>

      {q && <p className="m-0 text-sm text-stone-600">{products.length} {products.length === 1 ? 'product matches' : 'products match'} &ldquo;{q}&rdquo;.</p>}

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-14 text-center shadow-sm">
          <LayoutGrid className="mb-3 h-10 w-10 text-stone-300" aria-hidden="true" />
          <p className="m-0 text-lg font-bold text-stone-900">{all.length ? 'No products here' : 'The catalogue is empty'}</p>
          <p className="m-0 mt-1 text-sm text-stone-500">{all.length ? 'Try another search or filter.' : 'Add the first product to start selling.'}</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => {
            const flags = productFlags(p)
            const shownVariants = p.product_variants.filter(v => v.is_active !== false)
            const photo = shownVariants.find(v => v.image_url)?.image_url ?? p.gallery_images?.[0] ?? null
            const swatches = shownVariants.slice(0, 8)
            const size = p.size_label ?? productSize(p)
            const off = p.was_price ? percentOff(p.base_price, p.was_price) : 0
            return (
              <li key={p.id} className={`flex flex-col overflow-hidden rounded-md border bg-white shadow-sm ${p.is_active ? 'border-stone-200' : 'border-stone-300 bg-stone-50'}`}>
                <Link href={`/admin/inventory/${p.id}/edit`} className="flex flex-1 gap-3 p-3 hover:bg-stone-50">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail: behind auth, never indexed.
                    <img src={photo} alt="" loading="lazy" className={`h-20 w-20 shrink-0 rounded-sm border border-stone-200 object-cover ${p.is_active ? '' : 'opacity-60'}`} />
                  ) : (
                    <span className="grid h-20 w-20 shrink-0 place-items-center rounded-sm border border-dashed border-red-300 bg-red-50 text-[10px] font-bold uppercase text-red-700">No photo</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="m-0 line-clamp-2 font-bold leading-snug text-stone-900">{p.title}</p>
                    <p className="m-0 mt-0.5 truncate text-xs text-stone-500">
                      {[p.category_id ? categoryName.get(p.category_id) : null, size].filter(Boolean).join(' · ') || 'No type or size'}
                    </p>
                    <p className="m-0 mt-1 flex flex-wrap items-baseline gap-x-2 tabular-nums">
                      <span className="font-black text-stone-900">{pounds(p.base_price)}</span>
                      {off >= 1 && <><span className="text-xs text-stone-400 line-through">{pounds(p.was_price!)}</span><span className="text-[10px] font-black uppercase text-orange-700">{off}% off</span></>}
                    </p>
                    {swatches.length > 0 && (
                      <p className="m-0 mt-1.5 flex flex-wrap items-center gap-1" aria-label={`Colours: ${shownVariants.map(v => v.color).filter(Boolean).join(', ')}`}>
                        {swatches.map(v => (
                          <span key={v.sku} title={v.color ?? v.sku} className="inline-block h-4 w-4 rounded-full border border-stone-300" style={{ background: v.color_hex ?? '#e7e5e4' }} />
                        ))}
                        {shownVariants.length > swatches.length && <span className="text-[10px] text-stone-500">+{shownVariants.length - swatches.length}</span>}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2 border-t border-stone-100 px-3 py-2">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {flags.length === 0
                      ? <span className="text-[11px] text-stone-400">Nothing to fix</span>
                      : flags.map(f => (
                        <span key={f} className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${FLAG[f].style}`}>{FLAG[f].label}</span>
                      ))}
                  </div>
                  <form action={p.is_active ? deleteProduct : activateProduct} className="shrink-0">
                    <input type="hidden" name="productId" value={p.id} />
                    <ConfirmSubmit className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm ${p.is_active ? 'bg-stone-100 text-stone-700' : 'bg-green-50 text-green-700'}`}>
                      {p.is_active
                        ? <><EyeOff className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Hide {p.title} from the shop</span></>
                        : <><Eye className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Show {p.title} in the shop</span></>}
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
