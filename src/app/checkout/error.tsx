'use client'

// Route-level error boundary. Keeps a failure here from taking down the whole
// page, and keeps the site's header and footer in place around it.
import RootError from '@/app/error'

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RootError {...props} />
}
