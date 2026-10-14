'use client'
// src/app/admin/orders/[id]/delivery-note/PrintNoteButton.tsx
import { Printer } from 'lucide-react'

export default function PrintNoteButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-700"
    >
      <Printer className="h-4 w-4" aria-hidden="true" /> Print
    </button>
  )
}
