'use client'

import { useState } from 'react'
import { Check, ChevronDown, Loader2, Tag } from 'lucide-react'
import type { OfferQuote } from '@/types/offers'

interface Props {
  value: string
  onChange: (value: string) => void
  quote: OfferQuote | null
  pending: boolean
  error: string
  onApply: () => void
}

/**
 * Small by design: the checkout's payment and delivery facts stay dominant.
 * Applying a code never calculates money here; onApply asks the server for the
 * database quote and this component only renders the returned result.
 */
export default function OfferCode({ value, onChange, quote, pending, error, onApply }: Props) {
  const [open, setOpen] = useState(Boolean(quote?.valid))

  if (!open) {
    return (
      <div className="mb-4 border-t border-calico-300 pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover-link inline-flex min-h-11 items-center gap-2 rounded-sm border-0 bg-transparent px-0 text-caption font-semibold text-ember-700"
          aria-expanded="false"
        >
          <Tag aria-hidden="true" className="h-3.5 w-3.5" />
          Have an offer code?
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 border-t border-calico-300 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-data text-eyebrow font-bold uppercase tracking-[0.15em] text-ink-500">
          Offer code
        </span>
        {!quote?.valid && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 border-0 bg-transparent px-1 text-caption font-semibold text-ink-500"
          >
            Hide
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (!pending) onApply()
          }}
          placeholder="Enter code"
          aria-label="Offer code"
          className="h-11 min-w-0 flex-1 rounded-sm border-[1.5px] border-calico-300 bg-calico-50 px-3 font-data text-body-sm uppercase text-ink-900 outline-none transition-colors duration-swift focus:border-ember-700"
        />
        <button
          type="button"
          onClick={onApply}
          disabled={pending || value.trim().length === 0}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm border-0 bg-ink-900 px-4 text-caption font-bold text-calico-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
          Apply
        </button>
      </div>

      <div aria-live="polite" className="min-h-5 pt-2">
        {error && <p className="m-0 text-caption text-rust-700">{error}</p>}
        {!error && quote?.valid && (
          <p className={`m-0 flex items-start gap-2 text-caption ${quote.discountAmount > 0 ? 'text-sage-700' : 'text-ink-500'}`}>
            <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{quote.message}</span>
          </p>
        )}
      </div>
    </div>
  )
}
