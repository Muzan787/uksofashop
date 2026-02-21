// src/app/checkout/page.tsx
'use client'

import CheckoutForm from '@/components/Checkout/CheckoutForm'
import { useCart } from '@/context/CartContext'
import Image from 'next/image'

export default function CheckoutPage() {
  const { cartItems, totalAmount } = useCart()

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-8">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <CheckoutForm />
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 sticky top-24">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                {cartItems.map((item, index) => (
                  <div key={`${item.variant_id}-${index}`} className="flex gap-4 border-b border-stone-100 pb-4">
                    <div className="w-20 h-20 bg-stone-100 rounded-lg overflow-hidden shrink-0 relative">
                      <Image 
                        src={item.image_url || '/placeholder-sofa.jpg'} 
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-stone-900 line-clamp-1">{item.title}</h4>
                      <p className="text-sm text-stone-500 mb-1">Color: {item.color}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-medium text-stone-600">Qty: {item.quantity}</span>
                        <span className="font-semibold text-stone-900">£{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {cartItems.length === 0 && (
                  <p className="text-stone-500 text-sm">Your cart is empty.</p>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-stone-200">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span>£{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Shipping</span>
                    <span className="text-green-600 font-medium">Free</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-stone-900 pt-3 border-t border-stone-200">
                    <span>Total</span>
                    <span>£{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}