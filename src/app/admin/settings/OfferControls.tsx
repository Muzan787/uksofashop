'use client'
// src/app/admin/settings/OfferControls.tsx
//
// The visitor offer's switch (admin upgrade M2) and its codes (M3).
// Off stops new windows only: a window already given runs to its own
// deadline. A code labels an order placed inside a window; the money off
// comes from the window, so a code on its own never gives a discount.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { addOfferCode, deleteOfferCode, setOfferCodeActive, setOfferEnabled } from '@/app/actions/settings'
import { normaliseOfferCode, offerCodeProblem } from '@/utils/shopSettingsForm'
import type { OfferCodeRow } from './SettingsView'

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-bold disabled:opacity-50'
const input = 'min-h-11 w-full rounded-sm border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-orange-500'

export default function OfferControls({ enabled, openWindows, codes }: { enabled: boolean; openWindows: number | null; codes: OfferCodeRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeLabel, setCodeLabel] = useState('')

  async function run(key: string, action: () => Promise<{ ok: true } | { ok: false; text: string }>, done: string) {
    setBusy(key)
    setMessage(null)
    const res = await action()
    setBusy(null)
    setMessage(res.ok ? { ok: true, text: done } : { ok: false, text: res.text })
    if (res.ok) router.refresh()
    return res.ok
  }

  const open = openWindows === null ? null : `${openWindows} ${openWindows === 1 ? 'visitor has' : 'visitors have'} a window open now.`

  return (
    <div className="space-y-5">
      <div className={`rounded-sm border p-3 ${enabled ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className={`m-0 font-bold ${enabled ? 'text-green-900' : 'text-amber-900'}`}>
          {enabled ? 'On: new visitors get the offer' : 'Off: no new visitor gets the offer'}
        </p>
        <p className="m-0 mt-1 text-sm text-stone-700">
          {open ? `${open} ` : ''}
          {enabled
            ? 'Turning it off stops new windows only; every window already given runs to its own deadline.'
            : 'Windows given before it went off still run to their own deadline. Turning it on gives new visitors a window again.'}
        </p>
        <button
          type="button"
          disabled={busy !== null}
          className={`${button} mt-3 ${enabled ? 'border border-stone-300 bg-white text-stone-800' : 'bg-stone-900 text-white'}`}
          onClick={() => {
            const question = enabled
              ? 'Turn the offer off? No new visitor will get a window. Windows already given still run to their own deadline.'
              : 'Turn the offer on? Each new visitor gets a window from their first visit.'
            if (!window.confirm(question)) return
            void run('switch', () => setOfferEnabled(!enabled), enabled ? 'The offer is off. Windows already given run to their deadline.' : 'The offer is on for new visitors.')
          }}
        >
          {busy === 'switch' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {enabled ? 'Turn the offer off' : 'Turn the offer on'}
        </button>
      </div>

      <div>
        <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Offer codes</h3>
        <p className="m-0 mt-1 text-sm text-stone-500">
          A code is accepted only inside a visitor&apos;s window, and labels the order. Orders keep their code, so deleting one never changes an order.
        </p>
        {codes.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-stone-500">No codes.</p>
        ) : (
          <ul className="m-0 mt-2 list-none divide-y divide-stone-100 p-0">
            {codes.map(c => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="m-0 font-mono font-bold text-stone-900">
                    {c.code}
                    {!c.is_active && <span className="ml-2 rounded-pill border border-stone-200 bg-stone-50 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-stone-600">Off</span>}
                  </p>
                  {c.label && <p className="m-0 text-xs text-stone-500">{c.label}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    className={`${button} border border-stone-300 bg-white text-stone-800`}
                    onClick={() => void run(`active-${c.code}`, () => setOfferCodeActive(c.code, !c.is_active), c.is_active ? `${c.code} is off.` : `${c.code} is on.`)}
                  >
                    {busy === `active-${c.code}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {c.is_active ? 'Turn off' : 'Turn on'}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    aria-label={`Delete ${c.code}`}
                    className={`${button} min-w-11 border border-red-200 bg-white px-3 text-red-700`}
                    onClick={() => {
                      if (!window.confirm(`Delete ${c.code}? Orders that used it keep it.`)) return
                      void run(`delete-${c.code}`, () => deleteOfferCode(c.code), `${c.code} is deleted.`)
                    }}
                  >
                    {busy === `delete-${c.code}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-3 grid gap-2 rounded-sm border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
          onSubmit={async e => {
            e.preventDefault()
            const normal = normaliseOfferCode(code)
            const problem = offerCodeProblem(normal)
            if (problem) { setMessage({ ok: false, text: problem }); return }
            const ok = await run('add', () => addOfferCode(normal, codeLabel), `${normal} is added.`)
            if (ok) { setCode(''); setCodeLabel('') }
          }}
        >
          <div>
            <label htmlFor="offer-code" className="mb-1 block text-sm font-semibold text-stone-800">New code</label>
            <input id="offer-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={24} autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${input} font-mono`} placeholder="e.g. WINTER20" />
          </div>
          <div>
            <label htmlFor="offer-code-label" className="mb-1 block text-sm font-semibold text-stone-800">Note (optional)</label>
            <input id="offer-code-label" value={codeLabel} onChange={e => setCodeLabel(e.target.value)} maxLength={80} autoComplete="off" className={input} placeholder="Where it's used" />
          </div>
          <button type="submit" disabled={busy !== null || code.trim() === ''} className={`${button} bg-stone-900 text-white`}>
            {busy === 'add' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Add code
          </button>
        </form>
      </div>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </div>
  )
}
