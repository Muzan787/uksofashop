// src/app/checkout/page.tsx
import CheckoutClient from '@/components/Checkout/CheckoutClient'

export const metadata = {
  title: 'Checkout | UK Sofa Shop',
  description: 'Complete your order — Cash on Delivery available.',
}

export default function CheckoutPage() {
  return <CheckoutClient />
}