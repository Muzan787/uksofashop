'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { placeOrder } from '@/app/actions/checkout'
import { Loader2, CheckCircle, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutForm() {
  const { cartItems, totalAmount, clearCart } = useCart()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState('')

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')

    const itemsToSave = cartItems.map(item => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price
    }))

    const result = await placeOrder(formData, itemsToSave, totalAmount)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else if (result?.success) {
      setSuccess(true)
      setOrderId(result.orderId || '')
      clearCart()
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-2xl shadow-sm border border-stone-200">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-stone-900 mb-2">Order Confirmed!</h2>
        <p className="text-stone-600 mb-6">
          Thank you for your purchase. Your Cash on Delivery order has been received.
        </p>
        <div className="bg-stone-50 p-4 rounded-lg inline-block text-left mb-8 border border-stone-200">
          <p className="text-sm text-stone-500">Order Reference:</p>
          <p className="font-mono font-bold text-stone-900 text-xl tracking-widest">{orderId}</p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href={`/track-order?code=${orderId}`} className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition text-center">
            Track Order
          </Link>
          <Link href="/" className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 transition text-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-stone-200 text-center">
        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-stone-300" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Your cart is empty</h2>
        <p className="text-stone-500 mb-8 max-w-sm">
          Looks like you haven't added any furniture yet. Let's find the perfect piece for your home.
        </p>
        <Link href="/shop/all" className="bg-stone-900 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-stone-800 transition active:scale-95">
          Browse Collection
        </Link>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200">
      <h2 className="text-2xl font-bold text-stone-900 mb-6">Shipping Details</h2>
      
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
          <input type="text" name="customerName" required className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
          <input type="email" name="customerEmail" required className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="john@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Phone Number</label>
          <input type="tel" name="customerPhone" required className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="07123 456789" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Full Shipping Address</label>
        <textarea name="shippingAddress" rows={3} required className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="123 Sofa Street, London, SW1A 1AA"></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Special Instructions (Optional)</label>
        <textarea name="specialInstructions" rows={2} className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="e.g. Leave by the back door, narrow hallway, etc."></textarea>
      </div>

      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-6">
        <div className="flex justify-between items-center font-bold text-lg text-stone-900">
          <span>Total to pay (Cash on Delivery):</span>
          <span className="text-amber-700">£{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <button type="submit" disabled={isPending} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-stone-800 transition disabled:opacity-70 flex justify-center items-center gap-2">
        {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Place Order'}
      </button>
      <p className="text-xs text-stone-500 text-center mt-4">
        By placing this order, you agree to pay the delivery driver via cash or card upon arrival.
      </p>
    </form>
  )
}