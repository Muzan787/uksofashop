import type { Metadata } from 'next'
// src/app/admin/inventory/new/page.tsx
//
// A new product in the editor (admin upgrade K2). With ?from=<product id> it
// is a copy: everything except the SKUs, and it starts hidden.
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import ProductEditor from '@/components/Admin/ProductEditor'
import { EDITOR_PRODUCT_SELECT, blankEditorInitial, loadEditorOptions, toEditorInitial, type EditorSource } from '../editorData'

export const metadata: Metadata = { title: 'Add a product' }
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function NewProductPage(props: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await props.searchParams
  const supabase = await createClient()
  const options = await loadEditorOptions(supabase)

  let initial = blankEditorInitial()
  let copyOf: string | null = null
  if (from && UUID.test(from)) {
    const [{ data: source }, { data: tierRow }] = await Promise.all([
      supabase.from('products').select(EDITOR_PRODUCT_SELECT).eq('id', from).maybeSingle(),
      supabase.from('offer_product_tiers').select('tier').eq('product_id', from).maybeSingle(),
    ])
    if (source) {
      initial = toEditorInitial(source as unknown as EditorSource, tierRow?.tier ?? null, true)
      copyOf = (source as unknown as EditorSource).title
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start gap-3">
        <Link href="/admin/inventory" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100" aria-label="Back to products">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold text-stone-900 lg:text-3xl">{copyOf ? 'Copy of a product' : 'Add a product'}</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">
            {copyOf
              ? `Everything from ${copyOf} except the SKUs. Give each colourway its own SKU. It stays hidden until you tick "Shown in the shop".`
              : 'A product and its colourways. Save it hidden if it is not ready to sell.'}
          </p>
        </div>
      </div>
      <ProductEditor mode={copyOf ? 'copy' : 'new'} initial={initial} {...options} />
    </div>
  )
}
