'use client'

import { useState, useEffect, Suspense } from 'react';
import { Package, Search, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { trackOrderByShortCode } from '@/app/actions/orders';
import { useSearchParams } from 'next/navigation';

function TrackOrderInterface() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const [orderId, setOrderId] = useState(codeParam || '');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);

  // Extract the tracking logic so it can be called safely without a form event
  const performTracking = async (codeToTrack: string) => {
    if (!codeToTrack.trim()) return;

    setIsSearching(true);
    setError('');
    setOrderData(null);

    const result = await trackOrderByShortCode(codeToTrack.trim());

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setOrderData(result.order);
    }
    
    setIsSearching(false);
  };

  // Run automatically if the URL has a ?code= parameter
  useEffect(() => {
    if (codeParam) {
      performTracking(codeParam);
    }
  }, [codeParam]);

  // Handle manual form submission
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    performTracking(orderId);
  };

  const StatusDisplay = ({ status }: { status: string }) => {
    // Added 'confirmed' to the config mapping
    const config: Record<string, any> = {
      pending_cod: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', text: 'Pending (Cash on Delivery)' },
      confirmed: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50', text: 'Order Confirmed' },
      processing: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', text: 'Processing' },
      shipped: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', text: 'Out for Delivery' },
      delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', text: 'Delivered' },
      cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', text: 'Cancelled' },
    };

    const current = config[status] || { icon: Package, color: 'text-stone-600', bg: 'bg-stone-50', text: 'Unknown Status' };
    const Icon = current.icon;

    return (
      <div className={`mt-8 p-6 rounded-xl border ${current.bg.replace('bg-', 'border-').replace('50', '200')} ${current.bg} flex flex-col items-center justify-center text-center`}>
        <Icon className={`w-12 h-12 mb-3 ${current.color}`} />
        <h3 className={`text-xl font-bold ${current.color.replace('text-', 'text-').replace('600', '900')}`}>
          {current.text}
        </h3>
        <p className="text-sm text-stone-600 mt-2">
          {status === 'pending_cod' && "We've received your order and are waiting for confirmation."}
          {status === 'confirmed' && "Your order has been confirmed and is being prepared."}
          {status === 'processing' && "We are getting your furniture ready for dispatch."}
          {status === 'shipped' && "Your furniture is on its way to you!"}
          {status === 'delivered' && "This order has been completed."}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
      <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-6">
        <Package className="w-6 h-6 text-amber-600" />
      </div>
      
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Track Your Order</h1>
      <p className="text-stone-500 mb-8 text-sm">
        Enter your 8-character Order Reference below to see the current status of your delivery.
      </p>

      <form onSubmit={handleTrack} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Order Reference
          </label>
          <input 
            type="text" 
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            maxLength={8}
            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none font-mono tracking-widest uppercase" 
            placeholder="e.g. A1B2C3D4" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSearching}
          className="w-full bg-stone-900 text-white py-3.5 rounded-lg font-medium hover:bg-stone-800 transition disabled:opacity-70 flex justify-center items-center gap-2"
        >
          {isSearching ? 'Searching...' : (
            <>Find Order <Search className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {orderData && (
        <div className="mt-6 border-t border-stone-100 pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-500 text-sm">Order Placed:</span>
            <span className="font-medium text-stone-900">{new Date(orderData.created_at).toLocaleDateString('en-GB')}</span>
          </div>
          
          <div className="space-y-3 mb-6">
            {orderData.order_items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-stone-50 pb-2 last:border-0 last:pb-0">
                <span className="text-stone-700">
                  {/* Added optional chaining here to prevent crashes if a variant was deleted */}
                  {item.quantity}x {item.product_variants?.products?.title || 'Product'} ({item.product_variants?.color || 'N/A'})
                </span>
                <span className="font-medium text-stone-900">£{item.price_at_time_of_purchase.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-lg font-bold text-stone-900">
            <span>Total:</span>
            <span>£{orderData.total_amount.toFixed(2)}</span>
          </div>

          <StatusDisplay status={orderData.status} />
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center bg-stone-50 px-4 py-16">
      <Suspense fallback={<div className="animate-pulse w-full max-w-md h-96 bg-stone-200 rounded-2xl"></div>}>
        <TrackOrderInterface />
      </Suspense>
    </main>
  );
}