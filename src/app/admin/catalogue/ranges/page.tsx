import type { Metadata } from 'next'
// src/app/admin/catalogue/ranges/page.tsx
//
// Ranges (variant groups) on their own small screen (admin upgrade K5): the
// name, web address and what the style choice is called, and which products
// are in each. A range with products in it can't be deleted.
import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { RangeForm } from '@/components/Admin/CatalogueForms'

export const metadata: Metadata = { title: 'Ranges' }
export const dynamic = 'force-dynamic'

export default async function RangesPage() {
  const supabase = await createClient()
  const [{ data: groups }, { data: products }] = await Promise.all([
    supabase.from('variant_groups').select('id, name, slug, subgroup_title').order('name'),
    supabase.from('products').select('id, title, size_label, subgroup_label, variant_group_id, is_active').not('variant_group_id', 'is', null).order('title'),
  ])
  const byGroup = new Map<string, NonNullable<typeof products>>()
  for (const p of products ?? []) {
    const list = byGroup.get(p.variant_group_id as string) ?? []
    list.push(p)
    byGroup.set(p.variant_group_id as string, list)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start gap-3">
        <Link href="/admin/catalogue" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100" aria-label="Back to the catalogue">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Ranges</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">Sizes and styles of one sofa, shown together on its product page. New ranges are made from the product editor.</p>
        </div>
      </div>

      {(groups ?? []).length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-stone-200 bg-white px-4 py-12 text-center shadow-sm">
          <Layers className="mb-3 h-10 w-10 text-stone-300" aria-hidden="true" />
          <p className="m-0 font-bold text-stone-900">No ranges yet</p>
          <p className="m-0 mt-1 text-sm text-stone-500">Choose &quot;New range&quot; in a product&apos;s editor to start one.</p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {(groups ?? []).map(g => {
            const members = byGroup.get(g.id) ?? []
            return (
              <li key={g.id}>
                <details className="rounded-md border border-stone-200 bg-white shadow-sm">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-3">
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-stone-900">{g.name}</span>
                      <span className="block truncate text-xs text-stone-500">{members.length} {members.length === 1 ? 'product' : 'products'} · style choice: {g.subgroup_title}</span>
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-stone-100 p-3">
                    {members.length > 0 && (
                      <ul className="m-0 list-none space-y-1 p-0 text-sm">
                        {members.map(p => (
                          <li key={p.id}>
                            <Link href={`/admin/inventory/${p.id}/edit`} className="flex min-h-11 items-center justify-between gap-2 rounded-sm px-2 hover:bg-stone-50">
                              <span className="min-w-0 truncate font-semibold text-stone-800">{p.title}{p.is_active ? '' : ' (hidden)'}</span>
                              <span className="shrink-0 text-xs text-stone-500">{[p.size_label, p.subgroup_label].filter(Boolean).join(' · ')}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <RangeForm group={g} />
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
