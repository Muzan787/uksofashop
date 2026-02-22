// src/components/UI/Pagination.tsx
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Helper to create the correct URL for a specific page
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center space-x-2 mt-12">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link 
          href={createPageUrl(currentPage - 1)}
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      ) : (
        <div className="p-2 rounded-lg border border-stone-100 text-stone-300 cursor-not-allowed">
          <ChevronLeft className="w-5 h-5" />
        </div>
      )}

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isActive = page === currentPage
          return (
            <Link
              key={page}
              href={createPageUrl(page)}
              className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {page}
            </Link>
          )
        })}
      </div>

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link 
          href={createPageUrl(currentPage + 1)}
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <div className="p-2 rounded-lg border border-stone-100 text-stone-300 cursor-not-allowed">
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  )
}