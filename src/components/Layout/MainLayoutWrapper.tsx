'use client'
// src/components/Layout/MainLayoutWrapper.tsx
import { usePathname } from 'next/navigation'
import Header from "./Header"
import Footer from "./Footer"
import MobileNav from "./Mobilenav"
import PWAPromptManager from "@/components/Admin/PWAPromptManager"
import SmoothScroll from "@/components/Motion/SmoothScroll"
import ScrollProgress from "@/components/Motion/ScrollProgress"
import ViewTransitions from "@/components/Motion/ViewTransitions"
import PageFade from "@/components/Motion/PageFade"
import Cursor from "@/components/Motion/Cursor"
import BrandEntrance from "@/components/Motion/BrandEntrance"
import WhatsAppFab from "./WhatsAppFab"
import type { NavCategory } from '@/utils/navigation'

export default function MainLayoutWrapper({
  children,
  categories,
}: {
  children: React.ReactNode
  /** Fetched once in the root layout. Was a client query in both consumers. */
  categories: NavCategory[]
}) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  // If it's an admin route, return ONLY the raw content (Admin layout handles its own UI)
  if (isAdmin) {
    return (
      <main id="main-content" className="flex-grow">
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
  // Lenis and the progress rail are mounted here rather than in the root
  // layout so the admin panel keeps plain, native scrolling. Someone editing
  // twenty product variants does not want inertia between them.
  return (
    <SmoothScroll>
      {/* Suppresses the browser install prompt for shoppers only. It used to
          sit in the root layout, which also suppressed it in /admin - so the
          owner could never be offered the admin app either. */}
      <BrandEntrance />
      <PWAPromptManager />
      <ScrollProgress />
      <ViewTransitions />
      <Cursor />
      <Header categories={categories} />
      {/* The bottom-navigation clearance is NOT here any more — it moved to the
          last row of the Footer, which is the element that actually sits under
          that bar. On <main> it protected nothing (the footer follows it) and,
          because <main> carries no background, it painted 68px of page ground
          between the last section and the footer — a bright strip across the
          bottom of every dark-footed page. */}
      <main id="main-content" className="flex-grow">
        <PageFade>{children}</PageFade>
      </main>
      <Footer categories={categories} />
      {/* Storefront only, and mounted here rather than on the homepage so it
          exists on the product page too — which is where somebody actually has
          a question about fabric, size or delivery. It hides itself on the
          first screen of every page and stands down wherever a page pins its
          own bar to the bottom of the viewport. */}
      <WhatsAppFab />
      <MobileNav />
    </SmoothScroll>
  )
}