'use client'
// src/components/Layout/VersionGuard.tsx
//
// Makes every visitor see the current release (Run 8, owner request): if the
// open page was built from an older deploy than the server now runs - kept
// alive by the browser cache or the PWA service worker - reload ONCE.
//   - checks on load and when the tab comes back into view;
//   - at most one reload per new release per tab (sessionStorage), so it can
//     never loop; does nothing if the build stamp is unknown;
//   - never during checkout typing: it skips /checkout, where a reload would
//     lose what the customer has entered.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const MINE = process.env.NEXT_PUBLIC_BUILD_STAMP ?? 'none'
const KEY = 'ukss_reloaded_for'

export default function VersionGuard() {
  const pathname = usePathname()
  useEffect(() => {
    if (MINE === 'none' || pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return
    let stopped = false
    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        if (!r.ok) return
        const { build } = await r.json() as { build?: string }
        if (stopped || !build || build === 'none' || build === MINE) return
        let done: string | null = null
        try { done = window.sessionStorage.getItem(KEY) } catch { /* private mode */ }
        if (done === build) return
        try { window.sessionStorage.setItem(KEY, build) } catch { /* private mode */ }
        window.location.reload()
      } catch { /* offline: keep the page */ }
    }
    void check()
    const onShow = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onShow)
    return () => { stopped = true; document.removeEventListener('visibilitychange', onShow) }
  }, [pathname])
  return null
}
