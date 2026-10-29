// src/app/admin/orders/[id]/delivery-note/DeliveryNote.tsx
//
// The driver's delivery note (admin upgrade H1), given the order page.tsx
// loaded. Only the note prints: the print rule hides everything else on the
// screen, whatever the admin layout or the shop puts around it.
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { OrderWithLines } from '../../orderData'
import { money, shortCode } from '../../OrderBits'
import PrintNoteButton from './PrintNoteButton'
import { deliveryNoteAccess } from '@/utils/deliveryNote'
import { postcodeOf } from '@/utils/orderWhatsApp'
import { formatUkMobile } from '@/utils/phone'
import { formatPreferredDeliveryDate } from '@/utils/delivery'
import { itemTitle } from '@/utils/orderItemTitle'
import { describeFinish } from '@/utils/orderFinish'
import { describeCustomisation } from '@/utils/productOptions'

const PRINT_ONLY_THE_NOTE = `
@media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #delivery-note, #delivery-note * { visibility: visible !important; }
  #delivery-note { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; box-shadow: none !important; padding: 0 !important; }
}`

export default function DeliveryNote({ order }: { order: OrderWithLines }) {
  const code = shortCode(order.id)
  const postcode = postcodeOf(order.shipping_address)
  const address = postcode
    ? order.shipping_address.replace(/,?\s*[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\s*$/i, '')
    : order.shipping_address
  const placed = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
    : ''
  const label = 'm-0 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{PRINT_ONLY_THE_NOTE}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Order #{code}
        </Link>
        <PrintNoteButton />
      </div>

      <article id="delivery-note" className="space-y-5 rounded-md border border-stone-200 bg-white p-5 text-stone-900 shadow-sm sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-stone-900 pb-4">
          <div>
            <p className="m-0 text-xl font-bold tracking-tight">UK Sofa Shop</p>
            <h1 className="m-0 mt-0.5 text-sm font-bold uppercase tracking-[0.18em] text-stone-600">Delivery note</h1>
          </div>
          <div className="sm:text-right print:text-right">
            <p className="m-0 font-mono text-xl font-bold">#{code}</p>
            {placed && <p className="m-0 text-sm text-stone-600">Ordered {placed}</p>}
          </div>
        </header>

        {order.is_test && (
          <p className="m-0 rounded-sm border-2 border-stone-900 px-3 py-2 text-center text-lg font-bold uppercase tracking-[0.2em]">
            Test order
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className={label}>Deliver to</p>
            <p className="m-0 mt-1 text-lg font-bold">{order.customer_name}</p>
            <p className="m-0 text-base">{formatUkMobile(order.customer_phone)}</p>
            <p className="m-0 mt-1 text-base">
              {address}{postcode && <>, <strong className="text-lg">{postcode}</strong></>}
            </p>
          </div>
          <div>
            <p className={label}>Delivery day</p>
            <p className="m-0 mt-1 text-base font-bold">
              {order.preferred_delivery_date ? formatPreferredDeliveryDate(order.preferred_delivery_date) : 'As agreed by phone'}
            </p>
            <dl className="m-0 mt-3 space-y-1.5">
              {deliveryNoteAccess(order).map(line => (
                <div key={line.label}>
                  <dt className={label}>{line.label}</dt>
                  <dd className="m-0 text-base">{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {order.special_instructions?.trim() && (
          <section className="rounded-sm border border-stone-300 p-3">
            <p className={label}>Customer&apos;s notes</p>
            <p className="m-0 mt-1 whitespace-pre-line text-base">{order.special_instructions}</p>
          </section>
        )}

        <section>
          <p className={label}>On the van</p>
          <ul className="m-0 mt-2 list-none divide-y divide-stone-200 border-y border-stone-200 p-0">
            {order.order_items.map(item => {
              const finish = describeFinish({ ...item, color: item.product_variants?.color })
              const build = describeCustomisation(item.customisation)
              return (
                <li key={item.id} className="py-2.5">
                  <p className="m-0 text-base font-bold">{item.quantity} × {itemTitle(item)}</p>
                  <p className="m-0 text-sm text-stone-700">
                    {[
                      finish.label && (finish.code ? `Fabric: ${finish.label} (${finish.code})` : `Colour: ${finish.label}`),
                      item.product_variants?.sku && `SKU ${item.product_variants.sku}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  {build.map(line => (
                    <p key={line.label} className="m-0 text-sm text-stone-700"><strong>{line.label}:</strong> {line.value}</p>
                  ))}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-sm border-2 border-stone-900 p-4">
          <p className={label}>What to collect</p>
          <p className="m-0 mt-1 text-3xl font-bold tabular-nums">{money(order.total_amount)}</p>
          <p className="m-0 mt-1 text-base">Cash or bank transfer, on delivery.</p>
        </section>

        <section>
          <p className={label}>Received in good condition</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-[2fr_1fr]">
            <div>
              <div className="h-10 border-b border-stone-900" />
              <p className="m-0 mt-1 text-xs text-stone-600">Customer&apos;s signature</p>
            </div>
            <div>
              <div className="h-10 border-b border-stone-900" />
              <p className="m-0 mt-1 text-xs text-stone-600">Date</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="h-10 border-b border-stone-900" />
            <p className="m-0 mt-1 text-xs text-stone-600">Name in capitals</p>
          </div>
        </section>
      </article>
    </div>
  )
}
