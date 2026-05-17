// src/app/confirm-order/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { CheckCircle, MessageCircle, Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function ConfirmOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch the order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return notFound()

  const shortCode = order.id.substring(0, 8).toUpperCase()

  // 2. Automatically update the status from 'pending_cod' to 'confirmed'
  if (order.status === 'pending_cod') {
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', id)
  }

  // 3. Set up the WhatsApp URL
  const whatsappNumber = "447123456789" // <-- CHANGE THIS TO YOUR ACTUAL BUSINESS WHATSAPP NUMBER!
  const whatsappMessage = encodeURIComponent(`I have a query regarding my order! (Order Ref: #${shortCode})`)
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-[#f0ede8] overflow-hidden">
        
        {/* Header Header */}
        <div className="bg-[#1c1917] p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          <CheckCircle className="w-16 h-16 text-[#d4871a] mx-auto mb-4 relative z-10" />
          <h1 className="text-3xl font-playfair font-bold text-white relative z-10">Order Confirmed!</h1>
          <p className="text-gray-400 mt-2 relative z-10">Thank you for verifying your details, {order.customer_name}.</p>
        </div>

        {/* Order Details */}
        <div className="p-8">
          <div className="bg-[#fef9f0] border border-[#d4871a]/20 rounded-xl p-6 mb-8 text-center">
            <p className="text-xs font-bold text-[#a8a29e] uppercase tracking-widest mb-1">Order Reference</p>
            <p className="font-mono text-3xl font-bold text-[#1c1917] tracking-wider mb-4">#{shortCode}</p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-[#57534e]">
              <Package className="w-4 h-4 text-[#d4871a]" />
              Status: <span className="font-bold text-[#16a34a] uppercase tracking-wider">Confirmed</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between border-b border-[#f0ede8] pb-4">
              <span className="text-[#78716c]">Total Amount (COD)</span>
              <span className="font-bold text-[#1c1917]">£{order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-[#f0ede8] pb-4">
              <span className="text-[#78716c]">Shipping Address</span>
              <span className="font-medium text-[#1c1917] text-right max-w-[200px] truncate">{order.shipping_address}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 rounded-xl font-bold tracking-wide hover:bg-[#1fb355] transition-colors shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-5 h-5" />
              Any Queries? (WhatsApp Us)
            </a>

            <Link 
              href="/account"
              className="w-full flex items-center justify-center gap-2 bg-[#f5f5f4] text-[#1c1917] py-4 rounded-xl font-bold tracking-wide hover:bg-[#e7e5e4] transition-colors"
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