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
 * The whole section used to be rendered at opacity:0 and revealed by an
 * IntersectionObserver — so a visitor whose JavaScript failed, or whose
 * browser never fired the observer, was left with a blank space where the only
 * social proof on the page should be. That is the same bug the homepage fixed
 * by moving its reveals out of JavaScript, and this is the same fix: every
 * card is painted on the first frame, and the two animations here (the section
 * lift and the distribution bars) are CSS scroll-driven, applied only inside
 * an @supports block. Where the browser cannot drive them the content is
 * simply there, finished. Nothing waits on a capability to become visible.
 */
export default function Reviews({ productId, reviews, isLoggedIn }: Props) {
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  // Highest rating first, so the chart reads 5 down to 1 the way people expect.
  const distribution = [5, 4, 3, 2, 1].map(stars => {
    const n = reviews.filter(r => Math.round(r.rating) === stars).length;
    return { stars, n, percent: count ? (n / count) * 100 : 0 };
  });

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="reveal pt-10 lg:pt-14">
      {/* The site's one section heading. The border-top this used to carry is
          gone with it: the heading now opens with its own ember rule and
          closes with a hairline that fades toward the right margin, so a
          second full-width line above the whole thing was drawing the same
          boundary twice. */}
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

        {count > 0 ? (
          // CSS columns, not a grid: a masonry of cards whose heights differ by
          // whether they carry a photograph, without measuring anything.
          <div className="columns-1 gap-4 md:columns-2">
            {reviews.map(r => <Card key={r.id} review={r} />)}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--pdp-accent-line)] bg-[var(--pdp-accent-tint)] px-4 py-10 text-center">
            <p className="m-0 text-body-sm text-ink-500">
              No reviews for this sofa yet. If you have bought one, yours would be the first.
            </p>
          </div>
        )}
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
                  {/* scaleX rather than width: a transform is what the
                      scroll-driven keyframe animates, and it composites. */}
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
      {/* A review with a photograph leads with it, at a size worth looking at.
          These used to be an 80px thumbnail below the text — the most
          persuasive thing a customer can give us, shown at the size of an
          icon. */}
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

      {/* No account needed. The form used to be a login wall, which for a shop
          with a handful of reviews turned away exactly the people most likely
          to write one — everybody who bought as a guest. */}
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
        {/* The word, not just the count — it is what tells someone hovering
            the third star what "3" is going to mean. */}
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
