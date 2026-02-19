// src/components/Checkout/CheckoutForm.tsx
'use client'

import { useState } from 'react'
import { submitCodOrder, CartItem } from '@/app/actions/checkout'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface CheckoutFormProps {
  cartItems: CartItem[]
  totalAmount: number
  onSuccess?: () => void // Callback to clear global cart state
}

export default function CheckoutForm({ cartItems, totalAmount, onSuccess }: CheckoutFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Client-side wrapper to handle the Server Action
  async function handleCheckout(formData: FormData) {
    setIsPending(true)
    setErrorMessage('')

    const result = await submitCodOrder(formData, cartItems, totalAmount)

    if (result?.error) {
      setErrorMessage(result.error)
    } else if (result?.success) {
      setIsSuccess(true)
      if (onSuccess) onSuccess()
    }
    
    setIsPending(false)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-xl text-green-800">
        <CheckCircle2 className="w-16 h-16 mb-4 text-green-600" />
        <h2 className="text-2xl font-bold">Order Placed!</h2>
        <p className="mt-2 text-center">Thank you for your order. You will pay £{totalAmount.toFixed(2)} upon delivery.</p>
      </div>
    )
  }

  return (
    <form action={handleCheckout} className="max-w-md mx-auto space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Cash on Delivery</h2>
      
      {errorMessage && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{errorMessage}</div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
        <input type="text" id="name" name="name" required disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 p-2 border" />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone Number</label>
        <input type="tel" id="phone" name="phone" required disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 p-2 border" />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-slate-700">Full Shipping Address</label>
        <textarea id="address" name="address" rows={3} required disabled={isPending}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 p-2 border" />
      </div>

      <button
        type="submit"
        disabled={isPending || cartItems.length === 0}
        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:bg-slate-400"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `Place Order (£${totalAmount.toFixed(2)})`}
      </button>
    </form>
  )
}