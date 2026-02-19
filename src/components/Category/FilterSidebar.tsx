// src/components/Category/FilterSidebar.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

// Hardcoded for demonstration, but you could dynamically generate these from your database
const FILTER_OPTIONS = {
  style: ['Modern', 'Mid-Century', 'Traditional', 'Minimalist'],
  material: ['Velvet', 'Leather', 'Linen', 'Boucle'],
}

export default function FilterSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Creates a new URL string with the updated query parameters
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      
      // Toggle logic: If the filter is already applied, remove it. Otherwise, set it.
      if (params.get(name) === value) {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      
      return params.toString()
    },
    [searchParams]
  )

  const handleFilterClick = (key: string, value: string) => {
    const queryString = createQueryString(key, value)
    // Push the new URL without triggering a full page reload (shallow routing)
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  return (
    <aside className="w-full md:w-64 flex-shrink-0 pr-8">
      <h2 className="text-lg font-bold text-slate-900 mb-6">Filters</h2>

      {Object.entries(FILTER_OPTIONS).map(([filterKey, options]) => (
        <div key={filterKey} className="mb-8">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
            {filterKey}
          </h3>
          <div className="space-y-3">
            {options.map((option) => {
              const isActive = searchParams.get(filterKey) === option.toLowerCase()
              return (
                <label key={option} className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleFilterClick(filterKey, option.toLowerCase())}
                    className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <span className={`ml-3 text-sm transition-colors ${isActive ? 'text-slate-900 font-medium' : 'text-slate-600 group-hover:text-slate-900'}`}>
                    {option}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </aside>
  )
}