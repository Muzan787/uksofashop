'use client'
// src/components/Layout/MainLayoutWrapper.tsx
import { usePathname } from 'next/navigation'
import Header from "./Header"
import Footer from "./Footer"
import MobileNav from "./Mobilenav"
import PWAPromptManager from "@/components/Admin/PWAPromptManager"
import ImageGuard from "@/components/UI/ImageGuard"
import SmoothScroll from "@/components/Motion/SmoothScroll"
import ScrollProgress from "@/components/Motion/ScrollProgress"
import ViewTransitions from "@/components/Motion/ViewTransitions"
import PageFade from "@/components/Motion/PageFade"
import Cursor from "@/components/Motion/Cursor"
import BrandEntrance from "@/components/Motion/BrandEntrance"
import WhatsAppFab from "./WhatsAppFab"
import ChatWidget from "@/components/Chat/ChatWidget"
import type { NavCategory } from '@/utils/navigation'

export default function MainLayoutWrapper({
  children,
  categories,
  chatEnabled,
}: {
  children: React.ReactNode
  /** Fetched once in the root layout. Was a client query in both consumers. */
  categories: NavCategory[]
  /** Whether the server has an API key for the assistant. The root layout decides. */
  chatEnabled?: boolean
}) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')
  const isCheckout = pathname?.startsWith('/checkout')

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
      {/* Storefront only, on purpose: the owner saving his own product shots
          out of the admin panel is not the thing this exists to stop. */}
      <ImageGuard />
      <ScrollProgress />
      <ViewTransitions />
      <Cursor />
      <Header categories={categories} />
      <main id="main-content" className="flex-grow">
        <PageFade>{children}</PageFade>
      </main>
      <Footer categories={categories} />

      {/* WhatsApp is a permanent support escape hatch on every customer-facing
          route, including checkout. The dedicated checkout WhatsApp handoffs
          remain too; this button is for somebody who simply wants to ask us a
          question without hunting for the right form control. */}
      <WhatsAppFab />
      {/* Keep the AI assistant out of checkout for now. WhatsApp is the human
          contact route we explicitly want present there; chat can stay focused
          on browsing/product questions elsewhere. */}
      {!isCheckout && chatEnabled && <ChatWidget />}
      <MobileNav />
    </SmoothScroll>
  )
}
