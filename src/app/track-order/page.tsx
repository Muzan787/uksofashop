// src/app/track-order/page.tsx
'use client'

import { useState } from 'react';
import { Package, Search, ChevronRight } from 'lucide-react';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // Future integration: Fetch order status from Supabase here
    setTimeout(() => setIsSearching(false), 1500); // Mock loading state
  };

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center bg-stone-50 px-4 py-16">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-6">
          <Package className="w-6 h-6 text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Track Your Order</h1>
        <p className="text-stone-500 mb-8 text-sm">
          Enter your Order Reference number below to see the current status of your delivery.
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
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" 
              placeholder="e.g. 123e4567-e89b..." 
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

        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
          <p className="text-sm text-stone-500">
            Can't find your order number? Check your confirmation email or contact our support team.
          </p>
        </div>
      </div>
    </main>
  );
}