'use client'

// src/app/error.tsx
//
// Catches thrown errors anywhere under the root layout - a Supabase timeout, a
// malformed record, a network blip. Without this the visitor gets Next.js's
// unstyled default error page.
//
// The phone number is deliberate: someone who hits an error part-way through
// buying a sofa is worth a call, not a bounce.

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RotateCw, Home, Phone } from 'lucide-react'
import { PHONE_DISPLAY, PHONE_HREF } from '@/constants/contact'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Storefront error:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] bg-calico-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-pill bg-white border border-calico-300 shadow-e1 flex items-center justify-center mx-auto mb-6 text-ember-700">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="font-display text-h2 sm:text-h1 font-bold text-ink-900 mb-3">
          Something went wrong
        </h1>

        <p className="text-body text-ink-500 leading-relaxed mb-8">
          Sorry — that didn&apos;t load properly. It is usually temporary, so trying
          again often works. If you were in the middle of an order, please call us
          and we will take it over the phone.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-ink-900 text-white px-6 py-4 rounded-sm font-bold text-body-sm hover:bg-black active:scale-95 transition"
          >
            <RotateCw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white border border-calico-300 text-ink-900 px-6 py-4 rounded-sm font-bold text-body-sm hover:bg-stone-50 active:scale-95 transition"
          >
            <Home className="w-4 h-4" /> Back to the shop
          </Link>
        </div>

        <a
          href={PHONE_HREF}
          className="inline-flex items-center gap-2 text-ember-700 font-semibold text-body-sm hover:underline"
        >
          <Phone className="w-4 h-4" /> {PHONE_DISPLAY}
        </a>

        {error.digest && (
          <p className="text-caption text-ink-500 mt-8">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
