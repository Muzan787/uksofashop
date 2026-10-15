'use client'
// src/components/Admin/DeleteProduct.tsx
//
// Delete a product for good (admin upgrade K2): only one that has never been
// ordered, and only after typing DELETE. The database refuses too
// (delete_product), so a product ordered a minute ago is still safe. A
// product that has been ordered, or has reviews, says so and can only be
// hidden.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteProductForGood } from '@/app/actions/catalogue'

export default function DeleteProduct({ id, title, ordered, reviews }: { id: string; title: string; ordered: boolean; reviews: number }) {
  const router = useRouter()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const blocked = ordered
    ? 'This product has been ordered, so it can only be hidden, never deleted. Its orders keep their details.'
    : reviews > 0
      ? `This product has ${reviews} review${reviews === 1 ? '' : 's'}. Hide it instead, so the reviews are kept.`
      : null

  return (
    <details className="rounded-md border border-red-200 bg-white p-4">
      <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-bold text-red-700">Delete this product</summary>
      <div className="mt-2 space-y-3 border-t border-red-100 pt-3">
        {blocked ? (
          <p className="m-0 text-sm text-stone-700">{blocked}</p>
        ) : (
          <>
            <p className="m-0 text-sm text-stone-700">
              This removes {title} and its colourways for good. It can&apos;t be undone. Type <strong>DELETE</strong> to confirm.
            </p>
            <label className="sr-only" htmlFor="confirm-delete">Type DELETE to confirm</label>
            <input id="confirm-delete" value={typed} onChange={e => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off"
              className="min-h-11 w-full rounded-sm border border-stone-300 px-3 text-base sm:max-w-xs" placeholder="DELETE" />
            <button
              type="button"
              disabled={typed.trim() !== 'DELETE' || busy}
              onClick={async () => {
                setBusy(true)
                setError('')
                const res = await deleteProductForGood(id, typed)
                setBusy(false)
                if (!res.ok) { setError(res.text); return }
                router.push(`/admin/inventory?deleted=${encodeURIComponent(title)}`)
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />} Delete for good
            </button>
            {error && <p role="alert" className="m-0 text-sm font-semibold text-red-700">{error}</p>}
          </>
        )}
      </div>
    </details>
  )
}
