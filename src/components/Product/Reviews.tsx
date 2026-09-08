'use client';
// src/components/Product/Reviews.tsx

import SectionHeading from '@/components/UI/SectionHeading';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, CheckCircle, ImagePlus, Loader2, Mail, Star } from 'lucide-react';
import { submitGlobalReview } from '@/app/actions/reviews';
import { uploadToCloudinary } from '@/app/actions/upload';
import { blurDataURL } from '@/utils/cloudinary';
import Stars from './Stars';
import type { Review } from './types';
import Field from '@/components/UI/Field';

interface Props {
  productId: string;
  reviews: Review[];
  isLoggedIn: boolean;
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * What customers said.
 *
 * Reviewed products keep the full summary, review list and submission form.
 * Zero-review products use a compact honest state first; the same form remains
 * one tap away, so no review data or submission path is removed simply because
 * the product has not collected social proof yet.
 */
export default function Reviews({ productId, reviews, isLoggedIn }: Props) {
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const [writeFirstOpen, setWriteFirstOpen] = useState(false);

  // Highest rating first, so the chart reads 5 down to 1 the way people expect.
  const distribution = [5, 4, 3, 2, 1].map(stars => {
    const n = reviews.filter(r => Math.round(r.rating) === stars).length;
    return { stars, n, percent: count ? (n / count) * 100 : 0 };
  });

  if (count === 0) {
    return (
      <section id="reviews" aria-labelledby="reviews-heading" className="reveal pt-10 lg:pt-14">
        <SectionHeading
          eyebrow="Customer reviews"
          heading="What customers say."
          emphasise="customers"
          level="section"
          className="mb-6 lg:mb-8"
        />
        <h2 id="reviews-heading" className="sr-only">Customer reviews</h2>

        <div className="border-y border-calico-300 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div className="max-w-[60ch]">
            <p className="m-0 text-body font-semibold text-ink-900">No reviews yet.</p>
            <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">
              No customer review has been published for this sofa yet. If you have bought one,
              you can be the first to share how it worked out.
            </p>
          </div>

          <button
            type="button"
            aria-expanded={writeFirstOpen}
            aria-controls="first-review-form"
            onClick={() => setWriteFirstOpen(open => !open)}
            className="hover-btn mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-pill border border-ink-900 px-5 py-2.5 text-body-sm font-semibold text-ink-900 sm:mt-0"
          >
            {writeFirstOpen ? 'Close review form' : 'Write the first review'}
          </button>
        </div>

        {writeFirstOpen && (
          <div id="first-review-form" className="mt-5 max-w-md">
            <ReviewForm productId={productId} isLoggedIn={isLoggedIn} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="reveal pt-10 lg:pt-14">
      <SectionHeading
        eyebrow="Customer reviews"
        heading="What customers say."
        emphasise="customers"
        level="section"
        className="mb-6 lg:mb-8"
      />
      <h2 id="reviews-heading" className="sr-only">Customer reviews</h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Summary count={count} average={average} distribution={distribution} />
          <ReviewForm productId={productId} isLoggedIn={isLoggedIn} />
        </div>

        <div className="columns-1 gap-4 md:columns-2">
          {reviews.map(r => <Card key={r.id} review={r} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
function Summary({ count, average, distribution }: {
  count: number;
  average: number;
  distribution: { stars: number; n: number; percent: number }[];
}) {
  if (!count) return null;

  return (
    <div className="rounded-md border border-calico-300 bg-calico-100 p-5">
      <div className="flex items-center gap-4">
        <p className="m-0 font-display text-[40px] font-semibold leading-none tabular-nums text-ink-900">
          {average.toFixed(1)}
        </p>
        <div>
          <Stars rating={Math.round(average)} size="lg" count={count} />
          <p className="m-0 mt-1.5 text-caption text-ink-500">
            {count} {count === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse">
        <caption className="sr-only">Ratings broken down by number of stars</caption>
        <tbody>
          {distribution.map(({ stars, n, percent }) => (
            <tr key={stars}>
              <th scope="row" className="whitespace-nowrap py-1 pr-3 text-left font-data text-caption font-normal tabular-nums text-ink-500">
                {stars} ★
              </th>
              <td className="w-full py-1">
                <span className="block h-2 overflow-hidden rounded-pill bg-calico-300">
                  <span
                    className="bar-fill block h-full origin-left rounded-pill bg-[var(--pdp-accent)]"
                    style={{ transform: `scaleX(${percent / 100})` }}
                  />
                </span>
              </td>
              <td className="py-1 pl-3 text-right font-data text-caption tabular-nums text-ink-500">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── One review ──────────────────────────────────────────────────────────────
function Card({ review }: { review: Review }) {
  const verified = Boolean(review.order_id);

  return (
    <article className="mb-4 break-inside-avoid rounded-md border border-calico-300 bg-calico-50 shadow-e1">
      {review.image_url && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-md bg-calico-200">
          <Image
            src={review.image_url}
            alt={`Photo from ${review.customer_name || 'a customer'}`}
            fill
            sizes="(max-width: 768px) 100vw, 340px"
            loading="lazy"
            placeholder="blur"
            blurDataURL={blurDataURL(review.image_url)}
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-[var(--pdp-accent)] text-body-sm font-semibold text-[var(--pdp-accent-on)]">
            {(review.customer_name || 'V').charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body-sm font-semibold text-ink-900">
              {review.customer_name || 'A customer'}
            </span>
            <Stars rating={review.rating} size="sm" />
          </span>
          <time
            dateTime={review.created_at}
            className="ml-auto shrink-0 font-data text-caption tabular-nums text-ink-500"
          >
            {DATE.format(new Date(review.created_at))}
          </time>
        </div>

        {verified && (
          <p className="m-0 mt-3 flex items-center gap-1.5 font-data text-caption text-sage-700">
            <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Verified buyer
          </p>
        )}

        {review.comment && (
          <p className="m-0 mt-3 text-body-sm leading-relaxed text-ink-700">{review.comment}</p>
        )}
      </div>
    </article>
  );
}

// ─── The form ────────────────────────────────────────────────────────────────
const STAR_LABELS = ['Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

function ReviewForm({ productId, isLoggedIn }: { productId: string; isLoggedIn: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  if (success) {
    return (
      <div className="rounded-md border border-calico-300 bg-calico-50 p-5 text-center">
        <CheckCircle aria-hidden="true" className="mx-auto h-7 w-7 text-sage-700" />
        <p className="m-0 mt-2 text-body-sm font-semibold text-ink-900">Thank you.</p>
        <p className="m-0 mt-1 text-caption text-ink-500">
          Your review has been submitted and is waiting to be approved.
        </p>
      </div>
    );
  }

  async function submit(fd: FormData) {
    setPending(true);
    setError('');
    fd.append('rating', String(rating));
    fd.append('productId', productId);

    try {
      const imageUrl = file ? await uploadToCloudinary(file) : null;
      const res = await submitGlobalReview(fd, imageUrl);
      if (res?.error) setError(res.error);
      else if (res?.success) setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setPending(false);
  }

  const shown = hovered || rating;

  return (
    <form action={submit} className="flex flex-col gap-5 rounded-md border border-calico-300 bg-calico-50 p-5">
      <p className="m-0 text-body font-semibold text-ink-900">Write a review</p>

      {!isLoggedIn && (
        <Field
          label="Your name"
          name="customerName"
          maxLength={80}
          autoComplete="given-name"
          hint="Leave it blank to appear as Anonymous."
        />
      )}

      {error && (
        <p role="alert" className="m-0 rounded-sm border border-rust-200 bg-rust-50 px-3 py-2 text-caption text-rust-700">
          {error}
        </p>
      )}

      <div>
        <p className="eyebrow mb-2 text-ink-500">Rating</p>
        <div
          role="radiogroup"
          aria-label="Rating"
          className="flex gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === rating}
              aria-label={`${s} ${s === 1 ? 'star' : 'stars'} — ${STAR_LABELS[s - 1]}`}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onFocus={() => setHovered(s)}
              onBlur={() => setHovered(0)}
              className="flex h-11 w-11 items-center justify-center rounded-sm"
            >
              <Star
                aria-hidden="true"
                className={`h-6 w-6 transition-transform duration-press ease-out-expo ${
                  s <= shown
                    ? 'scale-110 fill-[var(--pdp-accent)] text-[var(--pdp-accent)]'
                    : 'fill-transparent text-calico-300'
                }`}
              />
            </button>
          ))}
        </div>
        <p aria-live="polite" className="m-0 mt-2 text-caption text-ink-500">
          {STAR_LABELS[shown - 1]}
        </p>
      </div>

      <Field
        label="Your review"
        name="comment"
        type="textarea"
        rows={4}
        required
        hint="What did you think of this sofa?"
      />

      {isLoggedIn ? (
      <div>
        <span className="eyebrow mb-2 block text-ink-500">Add a photo (optional)</span>
        <label className="hover-tile flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-calico-300 bg-calico-50 p-3">
          <ImagePlus aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500" />
          <span className="truncate text-caption text-ink-500">{file ? file.name : 'Choose an image'}</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      ) : (
        <p className="m-0 flex gap-2 border-t border-calico-300 pt-4 text-caption leading-relaxed text-ink-500">
          <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pdp-accent-text)]" />
          <span>
            Reviewing from the link in your delivery email adds a{' '}
            <strong className="text-ink-900">Verified buyer</strong> mark and lets you attach a
            photo. <Link href="/contact" className="hover-link text-ink-900">Ask us to resend it</Link>.
          </span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="hover-btn flex h-12 items-center justify-center gap-2 rounded-sm bg-[var(--pdp-accent)] font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-[var(--pdp-accent-on)] disabled:opacity-70"
      >
        {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        Submit review
      </button>
    </form>
  );
}
