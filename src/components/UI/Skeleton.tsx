// src/components/UI/Skeleton.tsx

/**
 * A block standing in for something that has not arrived.
 *
 * One component, shaped by the caller, rather than the four different
 * placeholder styles the site had: the listing used Tailwind's animate-pulse
 * on a hardcoded hex, the checkout its own, the filters a third. A pulse and a
 * shimmer at different rhythms in the same viewport reads as two things
 * loading badly rather than one thing loading.
 *
 * `animate-shimmer` is the token — 2.5s linear, defined once in globals.css.
 * Under prefers-reduced-motion the global block caps iteration count to 1, so
 * it makes a single pass and stops; capping only the duration would restart it
 * every 0.01ms and turn a slow drift into a strobe.
 *
 * The gradient is inline because it is painted from palette variables and has
 * to move with the animation.
 */
export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-shimmer bg-calico-200 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--color-calico-200) 0%, var(--color-calico-100) 40%, var(--color-calico-200) 80%)',
        backgroundSize: '1000px 100%',
      }}
    />
  )
}

/**
 * The product card's placeholder, built to the real card's measurements.
 *
 * It matters that these agree: the 4:5 well, two lines of 16px title, the 17px
 * price and the 16px swatch dots. A placeholder that is a different shape from
 * the thing it stands in for makes the page jump as the content lands.
 */
export function CardSkeleton() {
  return (
    <div className="w-full">
      {/* Square, because the card is. These have to agree or the whole listing
          jumps as the products arrive — which is exactly what happened when
          the card moved to a square frame to match the photographs and this
          was left at 4:5. */}
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="mt-3">
        <Skeleton className="h-[15px] w-full rounded-sm" />
        <Skeleton className="mt-[7px] h-[15px] w-2/3 rounded-sm" />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Skeleton className="h-[17px] w-16 rounded-sm" />
          <Skeleton className="h-[13px] w-10 rounded-sm" />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-4 rounded-pill" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** A line of text. `lines` of them, the last one short, as prose runs. */
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 rounded-sm ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}
