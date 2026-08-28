'use client'

// src/app/global-error.tsx
//
// The last resort. This one replaces the root layout entirely, so it has to
// render its own <html> and <body> and cannot use anything from the layout -
// no fonts, no Tailwind base, no shared components. Styles are inline for that
// reason.
//
// Only fires when the root layout itself throws. error.tsx handles everything
// below it and keeps the site's chrome.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-calico-50)',
          color: 'var(--color-ink-900)',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-calico-50)',
              border: '1px solid var(--color-calico-300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 'var(--text-h2)',
              color: 'var(--color-ember-700)',
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700, margin: '0 0 12px' }}>
            UK Sofa Shop is having a problem
          </h1>

          <p style={{ fontSize: 'var(--text-body)', lineHeight: 1.65, color: 'var(--color-ink-500)', margin: '0 0 24px' }}>
            Sorry — the site failed to load. Please try again in a moment, or call
            us on <a href="tel:+447476616022" style={{ color: 'var(--color-ember-700)', fontWeight: 600 }}>07476 616022</a> and
            we will help you directly.
          </p>

          <button
            onClick={reset}
            style={{
              background: 'var(--color-ink-900)',
              color: 'var(--color-calico-50)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '16px 24px',
              fontSize: 'var(--text-body-sm)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>

          {error.digest && (
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-500)', marginTop: 24 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
