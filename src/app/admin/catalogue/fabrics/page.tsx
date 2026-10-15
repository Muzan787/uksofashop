import type { Metadata } from 'next'
// src/app/admin/catalogue/fabrics/page.tsx
//
// Fabric collections and their colours (admin upgrade K5), which used to be
// edited by hand in the database: codes, swatches, shown, and whether it can
// be sent as a sample. A collection with fabrics in it, or a fabric that has
// been ordered or sent as a sample, can't be deleted - hide it instead.
import Link from 'next/link'
import { ArrowLeft, EyeOff, Palette } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { CollectionForm, FabricForm, type CollectionRow, type FabricRow } from '@/components/Admin/CatalogueForms'

export const metadata: Metadata = { title: 'Fabrics' }
export const dynamic = 'force-dynamic'

export default async function FabricsPage() {
  const supabase = await createClient()
  const [{ data: collectionRows }, { data: fabricRows }] = await Promise.all([
    supabase.from('fabric_collections').select('id, name, slug, description, supplier, supplier_handle, sort, is_active').order('sort').order('name'),
    supabase.from('fabrics').select('id, collection_id, code, name, supplier_title, hex, image_url, sort, is_active, is_swatchable').order('sort').order('code'),
  ])
  const collections = (collectionRows ?? []) as CollectionRow[]
  const fabrics = (fabricRows ?? []) as FabricRow[]
  const choices = collections.map(c => ({ id: c.id, name: c.name }))

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start gap-3">
        <Link href="/admin/catalogue" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100" aria-label="Back to the catalogue">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Fabrics</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">
            {fabrics.length} fabrics in {collections.length} collections. They are what made-to-order sofas are built in, and what samples are sent from.
          </p>
        </div>
      </div>

      <details className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-bold text-orange-700">+ Add a collection</summary>
        <div className="mt-3 border-t border-stone-100 pt-3"><CollectionForm /></div>
      </details>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-stone-200 bg-white px-4 py-12 text-center shadow-sm">
          <Palette className="mb-3 h-10 w-10 text-stone-300" aria-hidden="true" />
          <p className="m-0 font-bold text-stone-900">No fabric collections yet</p>
        </div>
      ) : collections.map(c => {
        const members = fabrics.filter(f => f.collection_id === c.id)
        return (
          <section key={c.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-3 shadow-sm" aria-labelledby={`col-${c.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`col-${c.id}`} className="m-0 text-lg font-bold text-stone-900">
                {c.name} <span className="text-sm font-normal text-stone-500">· {members.length} fabrics</span>
              </h2>
              {!c.is_active && <span className="inline-flex items-center gap-1 rounded-pill border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-700"><EyeOff className="h-3 w-3" aria-hidden="true" /> Hidden</span>}
            </div>
            <details className="rounded-sm border border-stone-200">
              <summary className="min-h-11 cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-stone-700">Edit the collection</summary>
              <div className="border-t border-stone-100 p-3"><CollectionForm collection={c} /></div>
            </details>
            <ul className="m-0 list-none divide-y divide-stone-100 p-0">
              {members.map(f => (
                <li key={f.id}>
                  <details>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-1 py-1.5">
                      {f.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail: behind auth, never indexed.
                        <img src={f.image_url} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-full border border-stone-200 object-cover" />
                      ) : <span className="h-9 w-9 shrink-0 rounded-full border border-stone-200" style={{ background: f.hex ?? '#e7e5e4' }} />}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-semibold text-stone-900">{f.name}</span> <span className="font-mono text-xs text-stone-500">{f.code}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-stone-500">
                        {[!f.is_active && 'Hidden', !f.is_swatchable && 'No samples'].filter(Boolean).join(' · ')}
                      </span>
                    </summary>
                    <div className="border-t border-stone-100 p-3"><FabricForm fabric={f} collectionId={c.id} collections={choices} /></div>
                  </details>
                </li>
              ))}
            </ul>
            <details className="rounded-sm border border-dashed border-stone-300">
              <summary className="min-h-11 cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-orange-700">+ Add a fabric to {c.name}</summary>
              <div className="border-t border-stone-100 p-3"><FabricForm collectionId={c.id} collections={choices} /></div>
            </details>
          </section>
        )
      })}
    </div>
  )
}
