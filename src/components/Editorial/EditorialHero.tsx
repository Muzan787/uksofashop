// src/components/Editorial/EditorialHero.tsx

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { blurDataURL, darkened } from '@/utils/cloudinary'

interface Props {
  eyebrow: string
  title: string
  /** One or two sentences. Anything longer belongs in the column below. */
  lede?: string
  /** Behind the type, darkened and gradiented. */
  image?: string
  /** Trailing crumb is the current page, so it is not given as a link. */
  breadcrumb?: { label: string; href: string }[]
  /** Sits under the lede — a "last updated" stamp, a count, a price range. */
  meta?: React.ReactNode
  children?: React.ReactNode
}

/**
 * The top of every content page.
 *
 * There were eleven of these and no two agreed. Some were 32px of padding with
 * a 40px icon tile, some were `py-16 md:py-24`, one was centred and the rest
 * were not; the eyebrow was Ember 700 on Ink 900 on all of them, which is
 * 2.4:1 and unreadable. This is 44vh, left-aligned, and the eyebrow is
 * Ember 300 — the ember made for dark grounds.
 */
export default function EditorialHero({
  eyebrow, title, lede, image, breadcrumb, meta, children,
}: Props) {
  return (
    <header className="relative flex min-h-[44vh] flex-col justify-end overflow-hidden bg-ink-900 pb-10 pt-28 sm:pb-14">
      {image && (
        <>
          <Image
            src={darkened(image)}
            alt=""
            fill
            sizes="100vw"
            priority
            placeholder="blur"
            blurDataURL={blurDataURL(image)}
            className="object-cover"
          />
          {/* A gradient, not a flat tint. The type sits at the bottom, so that
              is the only part that has to carry the contrast. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(25,28,27,0.94) 0%, rgba(25,28,27,0.62) 50%, rgba(25,28,27,0.3) 100%)' }}
          />
        </>
      )}

      <div className="relative mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 font-data text-caption uppercase tracking-[0.1em]">
              {breadcrumb.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 text-calico-300/50" />}
                  <Link href={crumb.href} className="hover-link text-calico-300 no-underline">
                    {crumb.label}
                  </Link>
                </li>
              ))}
              <li className="flex items-center gap-1" aria-current="page">
                <ChevronRight aria-hidden="true" className="h-3 w-3 text-calico-300/50" />
                <span className="text-ember-300">{title}</span>
              </li>
            </ol>
          </nav>
        )}

        <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-300">
          {eyebrow}
        </p>

        <h1 className="m-0 mt-4 max-w-[18ch] font-display text-display-l font-semibold leading-[0.98] text-calico-50">
          {title}
        </h1>

        {lede && (
          <p className="m-0 mt-5 max-w-[52ch] text-lead leading-relaxed text-calico-300">
            {lede}
          </p>
        )}

        {meta && <div className="mt-6">{meta}</div>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  )
}
