import { createClient } from '@/utils/supabase/server'
import { confirmCustomerOrder } from '@/app/actions/orders'
import { notFound } from 'next/navigation'
import { CheckCircle, AlertTriangle, Package } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Params = Promise<{ id: string }>

export default async function ConfirmOrderPage(props: { params: Params }) {
  const params = await props.params;
  const supabase = await createClient();

  // Fetch the order and its items
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        price_at_time_of_purchase,
        product_variants ( color, image_url, products ( title ) )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !order) notFound();

  // Ensure order is not null for TypeScript
  const confirmedOrder = order;

  // If the order is already confirmed (or further along), show a success message immediately
  if (confirmedOrder.status !== 'pending_cod') {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center bg-stone-50 px-4 py-16">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-stone-200 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Order Already Confirmed</h1>
          <p className="text-stone-600 mb-6">
            Thank you! This order has been confirmed and is currently being processed.
          </p>
          <Link href={`/track-order?code=${confirmedOrder.id.substring(0, 8).toUpperCase()}`} className="bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition inline-block">
            Track My Order
          </Link>
        </div>
      </main>
    )
  }

  // Next.js 15 Server Action handler
  async function handleConfirm() {
    "use server"
    await confirmCustomerOrder(confirmedOrder.id)
  }

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        
        <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-amber-900">Action Required: Confirm Your Order</h1>
            <p className="text-amber-800 text-sm mt-1">Please review your items below and confirm your order so we can begin processing it for delivery.</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-6">
            <div>
              <p className="text-sm text-stone-500">Order Reference</p>
              <p className="font-mono font-bold text-stone-900 text-lg tracking-wider">{confirmedOrder.id.substring(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-500">Total to pay on delivery</p>
              <p className="font-bold text-amber-700 text-xl">£{confirmedOrder.total_amount.toFixed(2)}</p>
            </div>
          </div>

          <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" /> Order Summary
          </h3>
          
          <div className="space-y-4 mb-8">
            {confirmedOrder.order_items.map((item: any, i: number) => (
              <div key={i} className="flex gap-4 items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="relative w-16 h-16 bg-stone-200 rounded-lg overflow-hidden shrink-0">
                  <Image src={item.product_variants.image_url || '/placeholder.svg'} alt="Product" fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-stone-900 line-clamp-1">{item.product_variants.products.title}</h4>
                  <p className="text-sm text-stone-500">Colour: {item.product_variants.color}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-500">Qty: {item.quantity}</p>
                  <p className="font-medium text-stone-900">£{item.price_at_time_of_purchase.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-8 text-sm text-stone-600">
            <strong>Shipping To:</strong><br/>
            {confirmedOrder.customer_name}<br/>
            {confirmedOrder.shipping_address}
          </div>

          <form action={handleConfirm}>
            <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-stone-800 transition-all active:scale-[0.98]">
              Yes, I Confirm My Order
            </button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-4">By clicking confirm, you commit to paying via Cash or Card upon delivery.</p>
        </div>

      </div>
    </main>
  )
}