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
          background: '#f8f6f2',
          color: '#1c1917',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#fff',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 22px',
              fontSize: 24,
              color: '#d4871a',
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
            UK Sofa Shop is having a problem
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#57534e', margin: '0 0 28px' }}>
            Sorry — the site failed to load. Please try again in a moment, or call
            us on <a href="tel:+447476616022" style={{ color: '#d4871a', fontWeight: 600 }}>07476 616022</a> and
            we will help you directly.
          </p>

          <button
            onClick={reset}
            style={{
              background: '#1c1917',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 28px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>

          {error.digest && (
            <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 28 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
