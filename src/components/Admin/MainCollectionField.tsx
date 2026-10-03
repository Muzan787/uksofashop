'use client'
// src/components/Admin/MainCollectionField.tsx
//
// Which part of the shop a product belongs to.
//
// Not a category. Categories answer "what shape of sofa is this" and decide
// the product's URL; this answers "which part of the shop is it from", and is
// what /collection is built out of. A product with none set is reachable
// everywhere else on the site but appears in no collection at all, which is
// why this is on the form rather than being inferred from origin or
// custom_made — those are claims about the sofa, and a shop that sells
// wardrobes cannot organise itself by them.
//
// Reads the list itself, the same way the variant-group picker beside it does,
// so neither product form had to change shape to carry it.

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Row {
  id: string
  name: string
  status: string
}

export default function MainCollectionField({ value }: { value?: string | null }) {
  const [collections, setCollections] = useState<Row[]>([])
  const [selected, setSelected] = useState(value ?? '')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('main_collections')
      .select('id, name, status')
      .order('position', { ascending: true })
      .then(({ data }) => { if (data) setCollections(data) })
  }, [])

  return (
    <div>
      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2" htmlFor="mainCollectionId">
        Main collection
      </label>
      <select
        id="mainCollectionId"
        name="mainCollectionId"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium"
      >
        <option value="">-- None — hidden from /collection --</option>
        {collections.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}{c.status === 'coming_soon' ? ' (not open yet)' : ''}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
        The top level of the Collections page — Imported Sofas, Made-To-Order Sofas, and the rooms
        opening later. Leave it unset and the product still sells, it just will not appear under any
        collection.
      </p>
    </div>
  )
}
