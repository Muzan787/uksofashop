// src/app/checkout/page.tsx
import CheckoutClient from '@/components/Checkout/CheckoutClient'
import CheckoutTelemetry from '@/components/Checkout/CheckoutTelemetry'

export const metadata = {
  robots: { index: false, follow: false },
  title: 'Checkout',
  description: 'Complete your order — Cash on Delivery available.',
}

export default function CheckoutPage() {
  return (
    <>
      <CheckoutTelemetry />
      <CheckoutClient />
    </>
  )
}
