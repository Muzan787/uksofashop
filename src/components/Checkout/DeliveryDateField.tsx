'use client'
// src/components/Checkout/DeliveryDateField.tsx
//
// "When would you like it?" on the delivery form.
//
// Two answers. The first is the one every order gave before this existed -
// as soon as we can, which the site promises as 2-4 days (5-7 in the areas
// that pay a distance charge) - and it
// stays the default, so nobody who does not care is made to pick a day. The
// second opens a calendar for anyone who does: away next week, decorating,
// waiting for the old sofa to go.
//
// A NATIVE DATE INPUT, on purpose. On a phone that is the platform's own
// picker - the iOS wheel, Android's calendar - which every customer already
// knows how to use, and which greys out the days below `min` for us. A
// custom calendar drawn in React would be prettier on a desktop and worse in
// every hand this shop's customers actually hold.
//
// The rules come from utils/delivery.ts, where place_order's twin lives:
// nothing sooner than four days from today (Muaz, 2026-09-18 - the workshop
// and the van need the notice), or the end of the 5-7 day window in a charged
// area; nothing beyond 180 days; and never a Monday, when the vans do not go
// out (2026-10-17). A native date input cannot grey out one weekday, so a
// Monday is answered the moment it is picked rather than at the submit.
// The date is a request the team confirms on the phone, and the copy says so.

import { CalendarDays, Clock } from 'lucide-react'
import {
  earliestPreferredDeliveryDate, latestPreferredDeliveryDate,
  formatPreferredDeliveryDate, isValidPreferredDeliveryDate, isNoDeliveryDay,
} from '@/utils/delivery'
import { PROMISES } from '@/constants/promises'
import { useShopSettings } from '@/components/ShopSettingsProvider'
import { useCart } from '@/context/CartContext'
import { isRomaProduct } from '@/constants/romaAvailability'

interface Props {
  /** YYYY-MM-DD, or '' for as soon as possible. */
  value: string
  onChange: (value: string) => void
  /** Whether the calendar is open, so a customer can choose "a day" before picking one. */
  choosing: boolean
  onChoosing: (choosing: boolean) => void
  error?: string
  /** The checked postcode is in a charged area, which takes 5-7 days. */
  far?: boolean
}

export default function DeliveryDateField({ value, onChange, choosing, onChoosing, error, far = false }: Props) {
  const { cartItems } = useCart()
  const hasRoma = cartItems.some(item => isRomaProduct(item.title))
  // The days Admin -> Settings allows, the same ones place_order accepts.
  const shop = useShopSettings()
  const min = earliestPreferredDeliveryDate(undefined, shop, far)
  const max = latestPreferredDeliveryDate(undefined, shop)
  const chosen = value && isValidPreferredDeliveryDate(value, undefined, shop, far) ? formatPreferredDeliveryDate(value) : null
  const monday = Boolean(value) && isNoDeliveryDay(value)
  const shown = error ?? (monday ? 'We don’t deliver on Mondays. Please choose another day.' : undefined)
  const asap = far
    ? `${shop.farWindowFromDays}–${shop.farWindowToDays} days to your area`
    : PROMISES.delivery.timingShort

  const option =
    'flex min-h-14 flex-1 cursor-pointer items-center gap-3 rounded-sm border-[1.5px] px-4 py-3 text-left ' +
    'transition-[border-color,background-color] duration-swift ease-out-expo'

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 font-data text-eyebrow font-bold uppercase tracking-[0.15em] text-ink-500">
        Delivery day
      </p>

      <div role="radiogroup" aria-label="Delivery day" className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          role="radio"
          aria-checked={!choosing}
          onClick={() => { onChoosing(false); onChange('') }}
          className={`${option} ${!choosing ? 'border-ember-500 bg-ember-500/10' : 'border-calico-300 bg-calico-50'}`}
        >
          <Clock aria-hidden="true" className={`h-4 w-4 shrink-0 ${!choosing ? 'text-ember-700' : 'text-ink-500'}`} />
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-ink-900">As soon as possible</span>
            <span className="block text-caption text-ink-500">{hasRoma ? 'Roma models: approximately 10–14 days, subject to confirmation' : asap}</span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={choosing}
          onClick={() => onChoosing(true)}
          className={`${option} ${choosing ? 'border-ember-500 bg-ember-500/10' : 'border-calico-300 bg-calico-50'}`}
        >
          <CalendarDays aria-hidden="true" className={`h-4 w-4 shrink-0 ${choosing ? 'text-ember-700' : 'text-ink-500'}`} />
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-ink-900">Choose a day</span>
            <span className="block text-caption text-ink-500">{hasRoma ? 'Requested date subject to Roma availability' : <>Any day but Monday, from {formatPreferredDeliveryDate(min)}</>}</span>
          </span>
        </button>
      </div>

      {choosing && (
        <div className="mt-3">
          <label htmlFor="preferredDeliveryDate" className="sr-only">Preferred delivery date</label>
          {/* 16px text, like every other field: a phone zooms the page when a
              focused field is smaller, and a zoomed date picker is a mess.
              min/max are what make the platform picker grey out the days we
              cannot do, so the customer is never offered one and then told no. */}
          <input
            id="preferredDeliveryDate"
            name="preferredDeliveryDate"
            type="date"
            value={value}
            min={min}
            max={max}
            onChange={e => onChange(e.target.value)}
            aria-invalid={shown ? true : undefined}
            aria-describedby="preferredDeliveryDate-hint"
            className={`h-14 w-full rounded-sm border-[1.5px] bg-calico-50 px-4 text-[16px] text-ink-900 outline-none transition-[border-color] duration-swift ease-out-expo focus:border-ember-700 ${
              shown ? 'border-rust-700' : 'border-calico-300'
            }`}
          />
          {shown ? (
            <p role="alert" className="mt-1 text-caption text-rust-700">{shown}</p>
          ) : (
            <p id="preferredDeliveryDate-hint" className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              {hasRoma
                ? <>Roma models take approximately 10–14 days. {chosen && <>Your requested date is <strong className="font-semibold text-ink-900">{chosen}</strong>. </>}We’ll confirm availability and delivery timing before dispatch.</>
                : chosen
                ? <>Requested for <strong className="font-semibold text-ink-900">{chosen}</strong>. We ring beforehand to agree the time slot.</>
                : <>Earliest is {formatPreferredDeliveryDate(min)}. We deliver Tuesday to Sunday, weekends included. We ring beforehand to agree the time slot.</>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
