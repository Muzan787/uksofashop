// src/components/Auth/AuthShell.tsx

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { blurDataURL, darkened } from '@/utils/cloudinary'

/** The room, on the other half of the screen. */
const PHOTOGRAPH =
  'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255172/Home-Page-Furniture-Background-Image-3_dxl0qo.avif'

interface Props {
  eyebrow: string
  heading: string
  line: string
  children: React.ReactNode
  /** Sits under the form — the link to the other of login/signup. */
  footer: React.ReactNode
}

/**
 * Signing in and signing up.
 *
 * Both were a 400px card floating in the middle of an empty cream page, with a
 * 3px ember stripe across the top and a 40px black tile holding a padlock. It
 * looked like a bank's login, on a site that sells furniture.
 *
 * The photograph is not decoration here: it is the only thing on either page
 * that says what the account is for. It carries no text, so it is marked
 * `alt=""` and hidden below the large breakpoint rather than being loaded and
 * squashed into a banner on a phone.
 */
export default function AuthShell({ eyebrow, heading, line, children, footer }: Props) {
  return (
    <div className="grid min-h-screen bg-calico-50 lg:grid-cols-2">
      {/* ── The photograph ──────────────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <Image
          src={darkened(PHOTOGRAPH)}
          alt=""
          fill
          sizes="50vw"
          priority
          placeholder="blur"
          blurDataURL={blurDataURL(PHOTOGRAPH)}
          className="object-cover"
          style={{ objectPosition: 'center 45%' }}
        />
        {/* A gradient rather than a flat scrim: the text sits at the bottom,
            so that is the only part that has to be darkened for it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(25,28,27,0.92) 0%, rgba(25,28,27,0.35) 45%, rgba(25,28,27,0.1) 100%)' }}
        />

        <div className="absolute inset-x-0 bottom-0 p-12">
          <Link href="/" className="no-underline">
            <span className="font-display text-h3 font-semibold text-calico-50">
              UK Sofa <span className="text-ember-300">Shop</span>
            </span>
          </Link>
          <p className="m-0 mt-5 max-w-[26ch] font-display text-h2 font-semibold leading-tight text-calico-50">
            Sofas made in Lancashire, paid for at your front door.
          </p>
          <p className="m-0 mt-4 font-data text-caption uppercase tracking-[0.16em] text-calico-300">
            Free delivery · Nothing to pay now
          </p>
        </div>
      </div>

      {/* ── The form ────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center px-5 py-16 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-[420px]">
          <Link
            href="/"
            className="hover-link inline-flex items-center gap-1.5 text-caption text-ink-500 no-underline lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to the shop
          </Link>

          <p className="m-0 mt-8 font-data text-eyebrow uppercase tracking-[0.16em] text-ember-700 lg:mt-0">
            {eyebrow}
          </p>
          <h1 className="m-0 mt-3 font-display text-h1 font-semibold leading-[1.05] text-ink-900">
            {heading}
          </h1>
          <p className="m-0 mt-3 max-w-[40ch] text-body-sm leading-relaxed text-ink-500">
            {line}
          </p>

          <div className="mt-9">{children}</div>

          <div className="mt-8 border-t border-calico-300 pt-6">{footer}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * One field arriving, 70ms after the one above it.
 *
 * Inside a motion-safe guard rather than applied unconditionally: `both` holds
 * an element at the keyframe's start for the length of its delay, so under
 * reduced motion an unguarded version would leave the form blank for a third
 * of a second and then produce all of it at once.
 */
export function Stagger({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div
      className="motion-safe:animate-[fadeUp_var(--dur-settle)_var(--ease-out-expo)_both]"
      style={{ animationDelay: `calc(${index} * var(--stagger-step))` }}
    >
      {children}
    </div>
  )
}
