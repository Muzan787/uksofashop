import type { Metadata } from 'next'
// src/app/admin/catalogue/page.tsx
//
// The Catalogue hub (admin upgrade K, the phone bar's Catalogue tab): products
// with how many need attention, categories, ranges and fabrics, each a tap
// away, and Add a product.
import Link from 'next/link'
import { ChevronRight, FolderTree, Layers, Package, Palette, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { needsAttention, type ListProduct } from '@/utils/catalogue'

export const metadata: Metadata = { title: 'Catalogue' }
export const dynamic = 'force-dynamic'

export default async function CataloguePage() {
  const supabase = await createClient()
  const head = { count: 'exact' as const, head: true }
  const [{ data: products }, categories, groups, fabrics, collections] = await Promise.all([
    supabase.from('products').select('title, is_active, is_featured, custom_made, size_label, gallery_images, specifications, product_variants(sku, color, color_hex, image_url, is_active)'),
    supabase.from('categories').select('id', head),
    supabase.from('variant_groups').select('id', head),
    supabase.from('fabrics').select('id', head),
    supabase.from('fabric_collections').select('id', head),
  ])
  const all = ((products ?? []) as unknown as Omit<ListProduct, 'variant_group'>[]).map(p => ({ ...p, variant_group: null }))
  const hidden = all.filter(p => !p.is_active).length
  const attention = all.filter(needsAttention).length

  const rows = [
    {
      href: '/admin/inventory', icon: Package, title: 'Products',
      note: `${all.length} in all · ${hidden} hidden`,
      warn: attention ? `${attention} need attention` : null,
      warnHref: '/admin/inventory?show=attention',
    },
    { href: '/admin/categories', icon: FolderTree, title: 'Categories', note: `${categories.count ?? 0} categories, in the shop's menu` },
    { href: '/admin/catalogue/ranges', icon: Layers, title: 'Ranges', note: `${groups.count ?? 0} ranges: sizes and styles of one sofa` },
    { href: '/admin/catalogue/fabrics', icon: Palette, title: 'Fabrics', note: `${fabrics.count ?? 0} fabrics in ${collections.count ?? 0} collections` },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Catalogue</h1>
          <p className="m-0 mt-1 text-sm text-stone-500">What the shop sells, and how it is arranged.</p>
        </div>
        <Link href="/admin/inventory/new" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-orange-500 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-600">
          <Plus className="h-5 w-5" aria-hidden="true" /> Add a product
        </Link>
      </header>

      <ul className="m-0 list-none divide-y divide-stone-200 overflow-hidden rounded-md border border-stone-200 bg-white p-0 shadow-sm">
        {rows.map(r => (
          <li key={r.href}>
            <Link href={r.href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50">
              <r.icon className="h-5 w-5 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-stone-900">{r.title}</span>
                <span className="block text-sm text-stone-500">{r.note}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
            </Link>
            {'warn' in r && r.warn && (
              <Link href={r.warnHref!} className="mx-4 mb-3 inline-flex min-h-11 items-center rounded-pill border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-800">
                {r.warn}: a missing photo or size
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
