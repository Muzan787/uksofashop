// src/app/delivery-returns/page.tsx
import { Truck, RotateCcw, ShieldCheck, MapPin } from 'lucide-react';

export default function DeliveryReturnsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Delivery & Returns</h1>
        <p className="text-stone-600 max-w-2xl mx-auto">
          Everything you need to know about getting your new furniture delivered safely and our hassle-free return policy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Delivery Section */}
        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
            <Truck className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-4">Delivery Information</h2>
          <div className="space-y-4 text-stone-600">
            <p>
              <strong className="text-stone-900">Free Mainland UK Delivery:</strong> We offer completely free delivery on all orders over £500 to addresses within Mainland UK. For orders under £500, a standard delivery fee applies.
            </p>
            <p>
              <strong className="text-stone-900">Estimated Timelines:</strong> In-stock items are typically delivered within 3-7 working days. Made-to-order items usually take 4-6 weeks.
            </p>
            <p>
              <strong className="text-stone-900">The Delivery Process:</strong> Our 2-man delivery team will bring the sofa to your room of choice. We will contact you 48 hours in advance to arrange a suitable 3-hour delivery window.
            </p>
            <p>
              <strong className="text-stone-900">Cash on Delivery:</strong> You can choose to pay the driver securely via cash or card terminal only once your furniture has arrived.
            </p>
          </div>
        </div>

        {/* Returns Section */}
        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
            <RotateCcw className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-4">Returns Policy</h2>
          <div className="space-y-4 text-stone-600">
            <p>
              <strong className="text-stone-900">30-Day Guarantee:</strong> We want you to be absolutely delighted with your purchase. If you're not, you can return standard items within 30 days of delivery.
            </p>
            <p>
              <strong className="text-stone-900">Condition of Goods:</strong> Items must be returned in their original condition. We cannot accept returns of items that have been damaged or altered after delivery.
            </p>
            <p>
              <strong className="text-stone-900">Collection Fee:</strong> If you wish to return an item, a standard collection fee of £50 will be deducted from your refund to cover the logistics costs.
            </p>
            <p>
              <strong className="text-stone-900">How to Initiate a Return:</strong> Simply email our support team at support@uksofashop.co.uk with your order number, and we will arrange a collection date.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}