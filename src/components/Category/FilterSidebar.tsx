'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface FilterSidebarProps {
  availableStyles: string[];
  availableMaterials: string[];
}

export default function FilterSidebar({ availableStyles, availableMaterials }: FilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
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
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const FILTER_OPTIONS = {
    ...(availableStyles.length > 0 && { style: availableStyles }),
    ...(availableMaterials.length > 0 && { material: availableMaterials }),
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