// src/app/admin/layout.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AdminSidebarClient from '@/components/Admin/AdminSidebarClient'
import { currentAdminEmail } from '@/utils/auth'

// Applies to every page under /admin. robots.txt already disallows the path,
// but that only asks crawlers not to fetch it - noindex is what keeps it out
// of the index if a URL is ever discovered another way.
export const metadata: Metadata = {
  title: {
    template: '%s | Admin',
    default: 'Admin',
  },
  robots: { index: false, follow: false },
  // The owner's installable app, scoped to /admin. Overrides the customer
  // manifest inherited from the root layout, so installing from inside the
  // admin panel gives an app that opens the dashboard rather than the shop.
  manifest: '/admin/manifest.webmanifest',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The second of four checks (proxy, this layout, each server action, the
  // database). proxy.ts already turns non-admins away; this one means a gap
  // in the proxy's matcher can never render the panel on its own.
  const adminEmail = await currentAdminEmail()
  if (adminEmail === null) notFound()

  return (
    <div className="min-h-screen bg-zinc-50 print:min-h-0 print:bg-white">
      <AdminSidebarClient email={adminEmail} />

      {/* lg:ml-64 creates room for the desktop sidebar. On phones the bottom
          padding clears the tab bar - its height plus the safe area it pads
          itself by - so the last thing on a page is never behind it. When
          printing, the menus are hidden and the page takes the full sheet. */}
      <main className="lg:ml-64 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8 min-h-screen pt-4 px-4 lg:p-10 max-w-7xl mx-auto print:ml-0 print:min-h-0 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  )
}