import type { Metadata } from 'next'
// src/app/admin/inventory/[id]/edit/page.tsx
//
// One product in the editor (admin upgrade K2), with Hide or Show, Copy as a
// new product, and Delete - which only a product that has never been ordered
// can do, after typing DELETE.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import ProductEditor from '@/components/Admin/ProductEditor'
import DeleteProduct from '@/components/Admin/DeleteProduct'
import ConfirmSubmit from '@/components/Admin/ConfirmSubmit'
import { activateProduct, deleteProduct } from '@/app/actions/inventory'
import { canonicalProductPath } from '@/utils/productUrl'
import { EDITOR_PRODUCT_SELECT, loadEditorOptions, toEditorInitial, type EditorSource } from '../../editorData'

export const metadata: Metadata = { title: 'Edit product' }
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function EditProductPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await props.params
  const sp = await props.searchParams
  if (!UUID.test(id)) notFound()
  const supabase = await createClient()

  const [{ data: product }, options, { data: tierRow }, { data: shopPath }] = await Promise.all([
    supabase.from('products').select(EDITOR_PRODUCT_SELECT).eq('id', id).maybeSingle(),
    loadEditorOptions(supabase),
    supabase.from('offer_product_tiers').select('tier').eq('product_id', id).maybeSingle(),
    supabase.from('products').select('slug, categories!products_category_id_fkey(slug), product_categories(categories(slug))').eq('id', id).maybeSingle(),
  ])
  if (!product) notFound()
  const source = product as unknown as EditorSource

  const variantIds = source.product_variants.map(v => v.id)
  const [{ count: orderLines }, { count: reviewCount }] = await Promise.all([
    variantIds.length
      ? supabase.from('order_items').select('id', { count: 'exact', head: true }).in('variant_id', variantIds)
      : Promise.resolve({ count: 0 }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('product_id', id),
  ])
  const ordered = (orderLines ?? 0) > 0
  const shopHref = shopPath ? canonicalProductPath(shopPath as unknown as Parameters<typeof canonicalProductPath>[0]) : null

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start gap-3">
        <Link href="/admin/inventory" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100" aria-label="Back to products">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold text-stone-900 lg:text-3xl">{source.title}</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">{source.is_active === false ? 'Hidden from the shop.' : 'In the shop.'}</p>
        </div>
      </div>

      {sp.saved === '1' && (
        <p role="status" className="m-0 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Saved. The shop shows it from the next visit.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {shopHref && source.is_active !== false && (
          <a href={shopHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> See it in the shop
          </a>
        )}
        <Link href={`/admin/inventory/new?from=${source.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700">
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy as a new product
        </Link>
        <form action={source.is_active === false ? activateProduct : deleteProduct}>
          <input type="hidden" name="productId" value={source.id} />
          <ConfirmSubmit className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700">
            {source.is_active === false ? <><Eye className="h-4 w-4" aria-hidden="true" /> Show in the shop</> : <><EyeOff className="h-4 w-4" aria-hidden="true" /> Hide from the shop</>}
          </ConfirmSubmit>
        </form>
      </div>

      <ProductEditor mode="edit" initial={toEditorInitial(source, tierRow?.tier ?? null)} {...options} />

      <DeleteProduct id={source.id} title={source.title} ordered={ordered} reviews={reviewCount ?? 0} />
    </div>
  )
}
