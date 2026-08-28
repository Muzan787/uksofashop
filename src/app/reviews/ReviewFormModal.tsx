'use client';
// src/app/reviews/ReviewFormModal.tsx

import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitGlobalReview } from '@/app/actions/reviews';
import { uploadToCloudinary } from '@/app/actions/upload';
import Modal from '@/components/UI/Modal';
import Field, { SubmitButton } from '@/components/UI/Field';

/**
 * The one dialog on the site that had no dialog in it.
 *
 * It was a plain fixed div: no role, no aria-modal, no focus trap, no Escape,
 * no scroll lock and no focus restore — so a screen reader never announced it
 * had opened, Tab walked straight out of it into the page behind, and the
 * page behind kept scrolling under the scrim. All of that is `Modal` now.
 *
 * The form beneath it was six hand-styled controls on `gray-*` and `red-*`
 * classes that predate the palette. Same fields, shared `Field`.
 */
export default function ReviewFormModal({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle');
  const [error, setError] = useState('');

  // No longer a redirect to /login. submitGlobalReview accepts guests now, so
  // sending them away to make an account was turning away the review AND the
  // reviewer. Signed in or not, the form opens.
  function close() {
    setOpen(false);
    setState('idle');
    setError('');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('pending');
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('rating', String(rating));

    try {
      // Photos are signed-in only: uploadToCloudinary signs a write to our own
      // Cloudinary account with the API secret and refuses guests.
      const imageUrl = file ? await uploadToCloudinary(file) : null;
      const result = await submitGlobalReview(formData, imageUrl);

      if (result.error) {
        setError(result.error);
        setState('idle');
      } else {
        setState('done');
        setTimeout(close, 3000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setState('idle');
    }
  }

  // The star the row is currently showing — the hovered one while a pointer is
  // over it, the chosen one otherwise.
  const shown = hovered ?? rating;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover-btn hover-btn-dark flex h-12 items-center justify-center rounded-sm bg-ink-900 px-6 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-calico-50"
      >
        Write a review
      </button>

      {open && (
        <Modal title="Share your experience" onClose={close} size="md">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {state === 'done' && (
              <p
                role="status"
                className="m-0 rounded-sm border border-sage-700 bg-sage-50 px-4 py-3 text-body-sm text-sage-700"
              >
                Thank you — your review is with us and will appear once it has been checked.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="m-0 rounded-sm border border-rust-700 bg-rust-50 px-4 py-3 text-body-sm text-rust-700"
              >
                {error}
              </p>
            )}

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 p-0 font-data text-caption uppercase tracking-[0.12em] text-ink-500">
                Rating
              </legend>
              <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                    aria-pressed={rating === star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onFocus={() => setHovered(star)}
                    onBlur={() => setHovered(null)}
                    className="flex h-11 w-11 items-center justify-center rounded-sm transition-transform duration-press ease-out-expo hover:scale-110"
                  >
                    <Star
                      aria-hidden="true"
                      className={`h-7 w-7 transition-colors duration-press ${
                        star <= shown ? 'fill-ember-500 text-ember-700' : 'fill-none text-calico-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            {!isLoggedIn && (
              <Field
                label="Your name"
                name="customerName"
                maxLength={80}
                hint="How you would like to be credited."
                autoComplete="name"
              />
            )}

            <Field
              label="Your review"
              name="comment"
              type="textarea"
              rows={5}
              required
              hint="What did you love about it?"
            />

            {isLoggedIn && (
              <Field
                label="Add a photo"
                name="photo"
                type="file"
                file={file}
                onFile={setFile}
                hint="Optional. A picture of it in your room helps more than anything we could write."
              />
            )}

            <SubmitButton
              idle="Submit review"
              pending="Sending"
              done="Sent"
              state={state}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
