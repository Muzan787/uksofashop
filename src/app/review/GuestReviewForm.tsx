'use client'

// src/app/review/GuestReviewForm.tsx
//
// The interactive half of the guest review page. Kept separate so the page
// itself stays a server component.

import { useState } from 'react'
import { Star, CheckCircle } from 'lucide-react'
import Field, { SubmitButton } from '@/components/UI/Field'
import { submitGuestReview } from '@/app/actions/guest-review'

const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges
const ACCENT_TEXT = 'var(--color-ember-700)' // letterforms on a light ground

export default function GuestReviewForm({
  token,
  productTitle,
}: {
  token: string
  productTitle: string
}) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handle(formData: FormData) {
    if (rating < 1) {
      setError('Please choose a rating first.')
      return
    }
    setPending(true)
    setError('')

    formData.set('rating', String(rating))
    const res = await submitGuestReview(token, formData)

    if (res?.error) {
      setError(res.error)
      setPending(false)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-pill bg-calico-100 border border-ember-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6" style={{ color: ACCENT_TEXT }} />
        </div>
        <p className="text-body font-bold text-ink-900 mb-2">Thank you</p>
        <p className="text-body-sm text-ink-500 leading-relaxed">
          We read every review. Yours will appear on the site once it has been
          checked.
        </p>
      </div>
    )
  }

  return (
    <form action={handle} className="flex flex-col gap-4">
      <div>
        <label className="block eyebrow font-bold tracking-[0.16em] text-ink-500 mb-3">
          How would you rate it?
        </label>
        <div className="flex gap-2" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => { setRating(n); setError('') }}
              onMouseEnter={() => setHovered(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={rating === n}
              className="p-1 rounded active:scale-90 transition"
            >
              <Star
                className="w-8 h-8 transition-colors"
                style={{
                  fill: n <= (hovered || rating) ? ACCENT : 'transparent',
                  color: n <= (hovered || rating) ? ACCENT_TEXT : 'var(--color-calico-300)',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Your name"
        name="customerName"
        maxLength={80}
        hint="How you would like to be shown. Leave it blank to appear as Anonymous."
      />

      <Field
        label="Your review"
        name="comment"
        type="textarea"
        rows={5}
        maxLength={4000}
        hint={`Comfort, quality, how the delivery went — whatever would have helped you decide about the ${productTitle}.`}
      />

      {error && (
        <p className="text-body-sm text-rust-700" role="alert">{error}</p>
      )}

      <SubmitButton
        idle="Post my review"
        pending="Sending"
        done="Sent"
        state={pending ? 'pending' : 'idle'}
        className="!bg-ink-900 !text-calico-50"
      />
    </form>
  )
}
