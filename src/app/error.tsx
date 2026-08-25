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
    <div className="min-h-[70vh] bg-[#f8f6f2] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-white border border-[#e7e5e4] shadow-sm flex items-center justify-center mx-auto mb-6 text-[#d4871a]">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1c1917] mb-3">
          Something went wrong
        </h1>

        <p className="text-[15px] text-[#57534e] leading-relaxed mb-8">
          Sorry — that didn&apos;t load properly. It is usually temporary, so trying
          again often works. If you were in the middle of an order, please call us
          and we will take it over the phone.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-[#1c1917] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-black active:scale-95 transition"
          >
            <RotateCw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white border border-[#e7e5e4] text-[#1c1917] px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-stone-50 active:scale-95 transition"
          >
            <Home className="w-4 h-4" /> Back to the shop
          </Link>
        </div>

        <a
          href={PHONE_HREF}
          className="inline-flex items-center gap-2 text-[#d4871a] font-semibold text-sm hover:underline"
        >
          <Phone className="w-4 h-4" /> {PHONE_DISPLAY}
        </a>

        {error.digest && (
          <p className="text-[11px] text-[#a8a29e] mt-8">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
