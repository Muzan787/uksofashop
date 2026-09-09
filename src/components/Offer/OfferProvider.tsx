'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import {
  INACTIVE_OFFER_ENTITLEMENT,
  type PublicOfferEntitlement,
} from '@/types/offerEntitlement'

interface OfferContextValue extends PublicOfferEntitlement {
  ready: boolean
  setEntitlement: (state: PublicOfferEntitlement) => void
}

const OfferContext = createContext<OfferContextValue | null>(null)

export function OfferProvider({ children }: { children: React.ReactNode }) {
  const [entitlement, setEntitlement] = useState<PublicOfferEntitlement>(INACTIVE_OFFER_ENTITLEMENT)
  const [ready, setReady] = useState(false)

  const value = useMemo<OfferContextValue>(() => ({
    ...entitlement,
    ready,
    setEntitlement: state => {
      setEntitlement(state)
      setReady(true)
    },
  }), [entitlement, ready])

  return <OfferContext.Provider value={value}>{children}</OfferContext.Provider>
}

export function useOffer(): OfferContextValue {
  const value = useContext(OfferContext)
  if (!value) throw new Error('useOffer must be used within OfferProvider')
  return value
}
