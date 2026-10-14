'use client'
// src/app/admin/orders/LegacyHashRedirect.tsx
//
// Before each order had its own page, links pointed at its card in the list:
// /admin/orders#<order id>. Old emails, bookmarks and chat messages still
// carry them, and the server never sees the part after #, so this sends them
// on to the order's page from the browser.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ORDER_HASH = /^#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export default function LegacyHashRedirect() {
  const router = useRouter()
  useEffect(() => {
    const match = ORDER_HASH.exec(window.location.hash)
    if (match) router.replace(`/admin/orders/${match[1].toLowerCase()}`)
  }, [router])
  return null
}
