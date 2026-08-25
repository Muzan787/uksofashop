'use client'

// src/app/review/GuestReviewForm.tsx
//
// The interactive half of the guest review page. Kept separate so the page
// itself stays a server component.

import { useState } from 'react'
import { Star, Loader2, CheckCircle } from 'lucide-react'
import { submitGuestReview } from '@/app/actions/guest-review'

const ACCENT = '#d4871a'

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
        <div className="w-12 h-12 rounded-full bg-[#fef9f0] border border-[#d4871a]/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6" style={{ color: ACCENT }} />
        </div>
        <p className="text-[17px] font-bold text-[#1c1917] mb-2">Thank you</p>
        <p className="text-[14px] text-[#57534e] leading-relaxed">
          We read every review. Yours will appear on the site once it has been
          checked.
        </p>
      </div>
    )
  }

  return (
    <form action={handle} className="flex flex-col gap-5">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#57534e] mb-3">
          How would you rate it?
        </label>
        <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
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
                  color: n <= (hovered || rating) ? ACCENT : '#d6d3d1',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="customerName"
          className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#57534e] mb-2"
        >
          Your name
        </label>
        <input
          id="customerName"
          name="customerName"
          type="text"
          maxLength={80}
          placeholder="How you would like to be shown"
          className="w-full border-[1.5px] border-[#e7e5e4] rounded-lg px-3.5 py-3 text-[15px] outline-none focus:border-[#d4871a] transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="comment"
          className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#57534e] mb-2"
        >
          Your review
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={5}
          maxLength={4000}
          placeholder={`What do you think of the ${productTitle}? Comfort, quality, how the delivery went — whatever would have helped you decide.`}
          className="w-full border-[1.5px] border-[#e7e5e4] rounded-lg px-3.5 py-3 text-[15px] outline-none focus:border-[#d4871a] transition-colors resize-y"
        />
      </div>

      {error && (
        <p className="text-[13px] text-red-600" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-[#1c1917] text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-black active:scale-[0.98] transition disabled:opacity-60"
      >
        {pending ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>) : 'Post my review'}
      </button>
    </form>
  )
}
