import type { Metadata } from 'next'
// src/app/admin/categories/page.tsx
//
// Categories (admin upgrade K5): each one opens to its edit form - parent,
// order, shown, photo, introduction and search words - and there is a form to
// add one. Deleting is refused, with the reason, while products or
// sub-categories still use it.
import Link from 'next/link'
import { ArrowLeft, EyeOff, FolderOpen } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import CategoryForm, { type CategoryRow } from '@/components/Admin/CategoryForm'

export const metadata: Metadata = { title: 'Categories' }
export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const [{ data }, { data: links }] = await Promise.all([
    supabase.from('categories').select('id, name, slug, parent_id, sort, is_active, image_url, intro, search_words').order('sort').order('name'),
    supabase.from('product_categories').select('category_id'),
  ])
  const categories = (data ?? []) as CategoryRow[]
  const counts = new Map<string, number>()
  for (const l of links ?? []) counts.set(l.category_id, (counts.get(l.category_id) ?? 0) + 1)
  const parentName = new Map(categories.map(c => [c.id, c.name]))

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start gap-3">
        <Link href="/admin/catalogue" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100" aria-label="Back to the catalogue">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Categories</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">Where products live in the shop&apos;s menu. Tap one to change it.</p>
        </div>
      </div>

      <details className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-bold text-orange-700">+ Add a category</summary>
        <div className="mt-3 border-t border-stone-100 pt-3">
          <CategoryForm categories={categories} />
        </div>
      </details>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-stone-200 bg-white px-4 py-12 text-center shadow-sm">
          <FolderOpen className="mb-3 h-10 w-10 text-stone-300" aria-hidden="true" />
          <p className="m-0 font-bold text-stone-900">No categories yet</p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {categories.map(c => (
            <li key={c.id}>
              <details className="rounded-md border border-stone-200 bg-white shadow-sm">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-3">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail: behind auth, never indexed.
                    <img src={c.image_url} alt="" className="h-12 w-12 shrink-0 rounded-sm object-cover" />
                  ) : <span className="h-12 w-12 shrink-0 rounded-sm bg-stone-100" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-stone-900">{c.name}</span>
                    <span className="block truncate text-xs text-stone-500">
                      /shop/{c.slug} · {counts.get(c.id) ?? 0} products{c.parent_id ? ` · inside ${parentName.get(c.parent_id) ?? '?'}` : ''} · order {c.sort}
                    </span>
                  </span>
                  {!c.is_active && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-700">
                      <EyeOff className="h-3 w-3" aria-hidden="true" /> Hidden
                    </span>
                  )}
                </summary>
                <div className="border-t border-stone-100 p-3">
                  <CategoryForm category={c} categories={categories} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
