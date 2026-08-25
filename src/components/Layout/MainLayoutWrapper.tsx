'use client'
// src/components/Layout/MainLayoutWrapper.tsx
import { usePathname } from 'next/navigation'
import Header from "./Header"
import Footer from "./Footer"
import MobileNav from "./Mobilenav"
import PWAPromptManager from "@/components/Admin/PWAPromptManager"

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  // If it's an admin route, return ONLY the raw content (Admin layout handles its own UI)
  if (isAdmin) {
    return (
      <main className="flex-grow">
        {children}
      </main>
    )
  }

  // If it's a normal storefront route, return the full website UI.
  //
  // The 3.4s EntryAnimation splash that used to mount here has been removed.
  // It rendered a fixed full-screen curtain with 42 animated particles on every
  // storefront route, locked body scroll for its whole duration, and held the
  // largest contentful paint behind it - so a visitor arriving on a paid click
  // waited 3.4s before seeing a single product.
  return (
    <>
      {/* Suppresses the browser install prompt for shoppers only. It used to
          sit in the root layout, which also suppressed it in /admin - so the
          owner could never be offered the admin app either. */}
      <PWAPromptManager />
      <Header />
      <main className="flex-grow pb-bottom-nav lg:pb-0">
        {children}
      </main>
      <Footer categories={[]} />
      <MobileNav />
    </>
  )
}