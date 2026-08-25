// src/app/checkout/page.tsx
import CheckoutClient from '@/components/Checkout/CheckoutClient'

export const metadata = {
  robots: { index: false, follow: false },
  title: 'Checkout',
  description: 'Complete your order — Cash on Delivery available.',
}

export default function CheckoutPage() {
  return <CheckoutClient />
}