'use client'
// src/components/Layout/MainLayoutWrapper.tsx
import { usePathname } from 'next/navigation'
import Header from "./Header"
import Footer from "./Footer"
import MobileNav from "./Mobilenav"
import EntryAnimation from "@/components/Entryanimation"

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

  // If it's a normal storefront route, return the full website UI
  return (
    <>
      <EntryAnimation />
      <Header />
      <main className="flex-grow pb-bottom-nav lg:pb-0">
        {children}
      </main>
      <Footer categories={[]} />
      <MobileNav />
    </>
  )
}