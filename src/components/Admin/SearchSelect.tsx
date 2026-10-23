'use client'
// src/components/Admin/SearchSelect.tsx
//
// A dropdown you can type into, for the admin lists that have grown past the
// length a <select> can usefully hold.
//
// WHY. The order forms pick a sofa out of every live colourway of every live
// product and a fabric out of the whole library. On a phone a native select
// of that length is a spinning wheel you scroll with a thumb, and the labels
// ("Verona 3 Seater · Grey Velvet · VER-3S-GRY") are long enough that the ones
// you are choosing between look identical until you are on top of them.
//
// Typing narrows it instead, on every word: "verona grey" matches that line
// whichever order the words come in, and so does a SKU or a fabric code. Each
// word has to appear somewhere in the row, which is the behaviour people
// expect from a search box and not what a substring match on the whole phrase
// gives.
//
// A native <select> is still the right control for a short, fixed list - how
// an order was taken, AM or PM - and those are left alone.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface SearchOption {
  id: string
  label: string
  /** A second line under the label: a price, a collection. Also searched. */
  hint?: string
}

/**
 * How many rows the list shows at once. Enough that a loose search still
 * finds what you meant, short enough that it is not a scroll in itself.
 */
const SHOWN = 30

export default function SearchSelect({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = 'Search…',
  emptyOptionLabel,
  fallbackLabel,
  className = '',
}: {
  options: SearchOption[]
  /** The chosen option's id, or '' for none. */
  value: string
  onChange: (id: string) => void
  ariaLabel: string
  placeholder?: string
  /** When given, the first row clears the choice - "No fabric chosen". */
  emptyOptionLabel?: string
  /** What to show for a value that is not in the list any more. */
  fallbackLabel?: string
  className?: string
}) {
  const listId = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = options.find(o => o.id === value)
  const chosenText = selected?.label ?? (value ? fallbackLabel ?? '' : '')

  const rows = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const matched = words.length === 0
      ? options
      : options.filter(o => {
          const haystack = `${o.label} ${o.hint ?? ''}`.toLowerCase()
          return words.every(w => haystack.includes(w))
        })
    const head: SearchOption[] = emptyOptionLabel !== undefined && words.length === 0
      ? [{ id: '', label: emptyOptionLabel }]
      : []
    return [...head, ...matched.slice(0, SHOWN)]
  }, [options, query, emptyOptionLabel])

  // Closing on an outside tap rather than on blur: a blur handler fires
  // before the click on a row lands, which swallowed every selection made
  // with a mouse.
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('touchstart', away)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('touchstart', away)
    }
  }, [open])

  const pick = (option: SearchOption) => {
    onChange(option.id)
    setQuery('')
    setOpen(false)
  }

  const field =
    'w-full rounded-sm border border-stone-300 bg-white py-2 pl-9 pr-8 text-sm text-stone-900 ' +
    'focus:border-stone-900 focus:outline-none focus:ring-0'

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={`${field} min-h-11`}
        placeholder={chosenText || placeholder}
        value={open ? query : chosenText}
        onFocus={() => { setOpen(true); setActive(0) }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(rows.length - 1, a + 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
          else if (e.key === 'Enter') {
            if (open && rows[active]) { e.preventDefault(); pick(rows[active]) }
          }
          else if (e.key === 'Escape') { setOpen(false); setQuery('') }
        }}
      />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full z-30 m-0 mt-1 max-h-64 list-none overflow-y-auto overscroll-contain rounded-sm border border-stone-300 bg-white p-0 shadow-lg"
        >
          {rows.length === 0 ? (
            <li className="px-3 py-3 text-sm text-stone-500">Nothing matches that.</li>
          ) : (
            rows.map((o, i) => (
              <li key={o.id || 'none'} id={`${listId}-${i}`} role="option" aria-selected={o.id === value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={`block w-full px-3 py-2.5 text-left text-sm ${i === active ? 'bg-stone-100' : 'bg-white'} ${o.id === value ? 'font-bold text-stone-900' : 'text-stone-800'}`}
                >
                  <span className="block leading-snug">{o.label}</span>
                  {o.hint && <span className="mt-0.5 block text-xs text-stone-500">{o.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
