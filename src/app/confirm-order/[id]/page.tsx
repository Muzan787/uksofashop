// src/app/confirm-order/[id]/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { CheckCircle, MessageCircle, Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'


export const metadata: Metadata = {
  title: 'Confirm Your Order',
  description:
    'Confirm the details of your order.',
  robots: { index: false, follow: false },
}

export default async function ConfirmOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch the order, and flip pending_cod -> confirmed if needed, via a
  // database function - the order's own uuid is the access token here (it's
  // unguessable), so this doesn't need a broad "anyone can read orders" policy.
  const { data: orders, error } = await supabase.rpc('confirm_order', { p_order_id: id })
  const order = orders?.[0]

  if (error || !order) return notFound()

  const shortCode = order.id.substring(0, 8).toUpperCase()

  // 3. Set up the WhatsApp URL
  const whatsappNumber = "447476616022" // <-- CHANGE THIS TO YOUR ACTUAL BUSINESS WHATSAPP NUMBER!
  const whatsappMessage = encodeURIComponent(`I have a query regarding my order! (Order Ref: #${shortCode})`)
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-calico-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-md shadow-e3 border border-calico-300 overflow-hidden">
        
        {/* Header Header */}
        <div className="bg-ink-900 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          <CheckCircle className="w-16 h-16 text-ember-700 mx-auto mb-4 relative z-10" />
          <h1 className="text-h1 font-display font-bold text-white relative z-10">Order Confirmed!</h1>
          <p className="text-gray-400 mt-2 relative z-10">Thank you for verifying your details, {order.customer_name}.</p>
        </div>

        {/* Order Details */}
        <div className="p-8">
          <div className="bg-calico-100 border border-ember-500/20 rounded-sm p-6 mb-8 text-center">
            <p className="eyebrow font-bold text-ink-500 tracking-widest mb-1">Order Reference</p>
            <p className="font-mono text-h1 font-bold text-ink-900 tracking-wider mb-4">#{shortCode}</p>
            
            <div className="flex items-center justify-center gap-2 text-body-sm text-ink-500">
              <Package className="w-4 h-4 text-ember-700" />
              Status: <span className="font-bold text-sage-700 uppercase tracking-wider">Confirmed</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between border-b border-calico-300 pb-4">
              <span className="text-ink-500">Total Amount (COD)</span>
              <span className="font-bold text-ink-900 font-data tnum">£{order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-calico-300 pb-4">
              <span className="text-ink-500">Shipping Address</span>
              <span className="font-medium text-ink-900 text-right max-w-[200px] truncate">{order.shipping_address}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-whatsapp text-white py-4 rounded-sm font-bold tracking-wide hover:bg-whatsapp-dark transition-colors shadow-e2 shadow-whatsapp/20"
            >
              <MessageCircle className="w-5 h-5" />
              Any Queries? (WhatsApp Us)
            </a>

            <Link 
              href="/account"
              className="w-full flex items-center justify-center gap-2 bg-calico-100 text-ink-900 py-4 rounded-sm font-bold tracking-wide hover:bg-calico-300 transition-colors"
            >
              View Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}