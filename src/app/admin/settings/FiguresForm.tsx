'use client'
// src/app/admin/settings/FiguresForm.tsx
//
// The shop's figures (admin upgrade M1), in four groups. The boxes are checked
// here first - a window can't end before it starts, the tiers stay in order -
// and the database checks them again when they save.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { saveShopFigures } from '@/app/actions/settings'
import { checkFigures, FIGURE_GROUPS, TIER_OF_FIELD, type FigureKey } from '@/utils/shopSettingsForm'
import type { OfferTier } from '@/utils/shopSettings'

const label = 'mb-1 block text-sm font-semibold text-stone-800'
const hint = 'mt-1 text-xs leading-relaxed text-stone-500'

export default function FiguresForm({ initial, tierCounts }: { initial: Record<FigureKey, string>; tierCounts: Record<OfferTier, number> }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string; field?: FigureKey | 'form' } | null>(null)
  const dirty = (Object.keys(initial) as FigureKey[]).some(k => values[k] !== initial[k])

  return (
    <form
      noValidate
      onSubmit={async e => {
        e.preventDefault()
        const checked = checkFigures(values)
        if (!checked.ok) { setMessage({ ok: false, text: checked.text, field: checked.field }); return }
        setBusy(true)
        const res = await saveShopFigures(values)
        setBusy(false)
        if (res.ok) {
          setMessage({ ok: true, text: 'Saved. Checkout uses the new figures from the next visit.' })
          router.refresh()
        } else {
          setMessage({ ok: false, text: res.text, field: res.field })
        }
      }}
      className="space-y-6"
    >
      {FIGURE_GROUPS.map(group => (
        <fieldset key={group.id} className="m-0 min-w-0 border-0 p-0">
          <legend className="p-0 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{group.title}</legend>
          <p className="m-0 mt-1 text-sm text-stone-500">{group.intro}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {group.fields.map(f => {
              const id = `figure-${f.key}`
              const wrong = message && !message.ok && message.field === f.key
              const tier = TIER_OF_FIELD[f.key]
              const note = tier
                ? `${tierCounts[tier]} ${tierCounts[tier] === 1 ? 'product' : 'products'} in this tier.`
                : f.hint
              return (
                <div key={f.key}>
                  <label htmlFor={id} className={label}>{f.label}</label>
                  <div className={`flex min-h-11 items-center rounded-sm border bg-white focus-within:border-orange-500 ${wrong ? 'border-red-500' : 'border-stone-200'}`}>
                    {f.kind === 'money' && <span className="pl-3 text-base text-stone-500" aria-hidden="true">£</span>}
                    <input
                      id={id}
                      inputMode={f.kind === 'money' ? 'decimal' : 'numeric'}
                      autoComplete="off"
                      value={values[f.key]}
                      onChange={e => { setValues(v => ({ ...v, [f.key]: e.target.value })); if (message) setMessage(null) }}
                      aria-invalid={wrong ? true : undefined}
                      aria-describedby={note ? `${id}-note` : undefined}
                      className="min-h-11 w-full min-w-0 flex-1 bg-transparent px-2 py-2 text-base tabular-nums text-stone-900 outline-none"
                    />
                    {f.unit && <span className="shrink-0 pr-3 text-sm text-stone-500">{f.unit}</span>}
                  </div>
                  {note && <p id={`${id}-note`} className={hint}>{note}</p>}
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
        <button type="submit" disabled={busy || !dirty} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-stone-900 px-5 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save figures
        </button>
        {dirty && !busy && (
          <button type="button" onClick={() => { setValues(initial); setMessage(null) }} className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100">
            Undo changes
          </button>
        )}
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </form>
  )
}
