'use client'
// src/app/size-guide/FitCheckForm.tsx

import { useState } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import Field, { SubmitButton } from '@/components/UI/Field'
import { submitContactForm } from '@/app/actions/contact'

/**
 * The fit check request.
 *
 * This form had no `action` and no `onSubmit`, and its submit control was a
 * `type="button"` — so six fields were filled in, the button was pressed, and
 * nothing happened at all. No error, no network request, no message. There was
 * a comment in the file reading "you can wire this form up to your existing
 * contact action later".
 *
 * It goes to that action now. The dimensions are composed into the message
 * body rather than added as new fields, because `submitContactForm` already
 * carries the honeypot, the rate limit, the zod validation and the mail
 * transport — and a second action that did the same thing differently is how
 * one of them quietly stops working.
 */
export default function FitCheckForm() {
  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('pending')
    setError('')

    const form = e.currentTarget
    const fd = new FormData(form)

    const name = String(fd.get('name') ?? '').trim()
    const [firstName, ...rest] = name.split(/\s+/)

    const cm = (key: string) => {
      const v = String(fd.get(key) ?? '').trim()
      return v ? `${v}cm` : 'not given'
    }

    const message = [
      'Fit check request from the size guide.',
      '',
      `Sofa they are looking at: ${String(fd.get('product') ?? '').trim() || 'not given'}`,
      `Door width: ${cm('doorWidth')}`,
      `Hallway width: ${cm('hallWidth')}`,
      `Ceiling height: ${cm('ceilingHeight')}`,
      '',
      'Obstacles:',
      String(fd.get('obstacles') ?? '').trim() || 'none mentioned',
    ].join('\n')

    // Rebuilt rather than mutated: the action reads specific keys, and passing
    // it the raw form would send it five it does not know about and none of
    // the three it needs.
    const payload = new FormData()
    payload.set('firstName', firstName ?? '')
    payload.set('lastName', rest.join(' '))
    payload.set('email', String(fd.get('email') ?? ''))
    payload.set('orderNumber', '')
    payload.set('message', message)
    // The honeypot, carried through. A bot filling every input on the page
    // fills this one too, and the action drops the message silently.
    payload.set('company_website', String(fd.get('company_website') ?? ''))

    const res = await submitContactForm(payload)

    if (res.error) {
      setError(res.error)
      setState('idle')
    } else {
      setState('done')
      form.reset()
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-md border border-sage-700 bg-sage-50 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-sage-700">
          <Check aria-hidden="true" className="h-6 w-6 text-calico-50" strokeWidth={3} />
        </span>
        <p className="m-0 mt-4 font-display text-h3 font-semibold text-ink-900">
          We have your measurements
        </p>
        <p className="m-0 mx-auto mt-2 max-w-[36ch] text-body-sm leading-relaxed text-ink-700">
          Someone will go through them and come back to you, usually the same working day. If it
          is urgent, call us on 07476 616022 instead of waiting.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="hover-link mt-5 text-caption font-semibold text-ember-700"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-rust-700 bg-rust-50 px-4 py-3 text-body-sm text-rust-700"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required autoComplete="name" disabled={state === 'pending'} />
        <Field label="Email address" name="email" type="email" required autoComplete="email" disabled={state === 'pending'} />
      </div>

      <Field
        label="Which sofa are you looking at?"
        name="product"
        disabled={state === 'pending'}
        hint="The name from the product page, if you have picked one."
      />

      <p className="m-0 mt-2 border-b border-calico-300 pb-2 font-data text-eyebrow uppercase tracking-[0.14em] text-ink-500">
        Your measurements, in centimetres
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Door width" name="doorWidth" type="number" min={0} inputMode="numeric" disabled={state === 'pending'} />
        <Field label="Hallway width" name="hallWidth" type="number" min={0} inputMode="numeric" disabled={state === 'pending'} />
        <Field label="Ceiling height" name="ceilingHeight" type="number" min={0} inputMode="numeric" disabled={state === 'pending'} className="col-span-2 sm:col-span-1" />
      </div>

      <Field
        label="Anything in the way?"
        name="obstacles"
        type="textarea"
        rows={3}
        disabled={state === 'pending'}
        hint="Stairs, a tight turn on the landing, a radiator by the door — anything worth knowing before the day."
      />

      {/* Hidden from people, filled in by bots. See the action's honeypot. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <SubmitButton
        idle="Send my measurements"
        pending="Sending"
        done="Sent"
        state={state}
        className="mt-2"
      />

      <p className="m-0 text-caption leading-relaxed text-ink-500">
        We use these to answer your question and nothing else. See our{' '}
        <a href="/privacy" className="hover-link font-semibold text-ember-700 no-underline">
          privacy policy
        </a>.
      </p>
    </form>
  )
}
