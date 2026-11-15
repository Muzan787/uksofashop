'use client'
// src/components/Home/HeroPriceChip.tsx
//
// The hero's price chip, offer-aware (Run 9). The figure follows the same rule
// checkout uses (utils/offers/amount.ts: £50 off a Made-To-Order product inside
// the visitor's own live window):
//   - live window + Made-To-Order: "£799 with BLACKFRIDAY · listed £849". No
//     was-price beside it, so the £799 can never read as a second markdown;
//   - otherwise (no window, ended, not yet known, or not Made-To-Order): the
//     chip exactly as before - the listed price, and the product's existing
//     was-price only where the catalogue has one.
// Until the offer state has loaded it shows the listed price, so nobody sees a
// figure flash that they cannot pay.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useOffer } from '@/components/Offer/OfferProvider'
import { useSeasonPhase } from '@/components/Season/useSeasonPhase'
import { MTO_OFFER_AMOUNT } from '@/utils/offers/amount'
import { OFFER_PUBLIC_CODE } from '@/utils/offers/constants'
import { seasonCode } from '@/utils/seasonal'

const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export default function HeroPriceChip({ productHref, productTitle, fromPrice, wasPrice, madeToOrder, className }: {
  productHref: string
  productTitle: string | null
  fromPrice: number
  wasPrice: number | null
  madeToOrder: boolean
  className: string
}) {
  const { active, ready } = useOffer()
  const code = seasonCode(useSeasonPhase()) ?? OFFER_PUBLIC_CODE
  const off = madeToOrder && ready && active ? Math.min(MTO_OFFER_AMOUNT, fromPrice) : 0
  const reduced = !off && typeof wasPrice === 'number' && wasPrice > fromPrice

  if (off > 0) {
    const pay = fromPrice - off
    return (
      <Link
        href={productHref}
        aria-label={`${productTitle ?? 'This sofa'}, ${money(pay)} with code ${code}, listed price ${money(fromPrice)}`}
        className={className}
        data-hero-offer="active"
      >
        <span className="font-data text-body font-semibold tabular-nums text-calico-50">{money(pay)}</span>
        <span className="flex flex-col leading-tight">
          <span className="eyebrow text-ember-300 max-sm:tracking-[0.06em]">with {code}</span>
          <span className="font-data text-caption tabular-nums text-calico-300 max-sm:text-[11px]">listed {money(fromPrice)}</span>
        </span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-ember-300" />
      </Link>
    )
  }

  return (
    <Link
      href={productHref}
      aria-label={[productTitle ?? 'This sofa', reduced ? `now ${money(fromPrice)}, was ${money(wasPrice!)}` : `from ${money(fromPrice)}`].join(', ')}
      className={className}
      data-hero-offer="none"
    >
      <span className="eyebrow text-calico-300">{reduced ? 'Now' : 'From'}</span>
      <span className="font-data text-body font-semibold tabular-nums text-calico-50">{money(fromPrice)}</span>
      {reduced && <s className="font-data text-caption tabular-nums text-calico-300">{money(wasPrice!)}</s>}
      <ArrowRight aria-hidden="true" className="h-4 w-4 text-ember-300" />
    </Link>
  )
}
