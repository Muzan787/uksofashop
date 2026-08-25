// src/app/admin/layout.tsx
import type { Metadata } from 'next'
import AdminSidebarClient from '@/components/Admin/AdminSidebarClient'

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminSidebarClient />
      
      {/* lg:ml-64 creates room for the desktop sidebar.
        pb-24 ensures the mobile bottom nav doesn't overlap the content.
      */}
      <main className="lg:ml-64 pb-24 lg:pb-8 min-h-screen pt-4 px-4 lg:p-10 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}