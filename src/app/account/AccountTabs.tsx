'use client'
// src/app/account/AccountTabs.tsx
import { useState } from 'react'
import Link from 'next/link'
import { Star, Trash2, Package } from 'lucide-react'
import { toggleWishlist } from '@/app/actions/wishlist'
// Import your existing ProductCard if available, otherwise using a simple layout below
// import ProductCard from '@/components/ProductCard'

export default function AccountTabs({ orders, reviews, wishlist }: any) {
  const [activeTab, setActiveTab] = useState('orders')

  const handleRemoveWishlist = async (productId: string) => {
    await toggleWishlist(productId)
  }

  return (
    <div>
      {/* Tabs Navigation */}
      <div className="flex border-b border-[#f0ede8] mb-8">
        {['orders', 'reviews', 'wishlist'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${
              activeTab === tab 
                ? 'border-b-2 border-[#d4871a] text-[#d4871a]' 
                : 'text-[#a8a29e] hover:text-[#57534e]'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-[#f0ede8] overflow-hidden">
          {orders.length > 0 ? (
            <table className="w-full text-left text-sm text-[#57534e]">
              <thead className="bg-[#fcfbf9] border-b border-[#f0ede8] text-xs uppercase tracking-wider text-[#a8a29e]">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede8]">
                {orders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 capitalize">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100">{order.status || 'Processing'}</span>
                    </td>
                    <td className="px-6 py-4">£{order.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#a8a29e] flex flex-col items-center">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p>You haven't placed any orders yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review: any) => (
              <div key={review.id} className="bg-white p-6 rounded-xl border border-[#f0ede8] shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-[#d4871a] text-[#d4871a]' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${review.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {review.is_approved ? 'Published' : 'Pending Approval'}
                  </span>
                </div>
                <p className="text-[#44403c] text-sm mt-2">{review.comment}</p>
                {review.image_url && (
                  <img src={review.image_url} alt="Review" className="w-24 h-24 object-cover rounded-lg mt-4" />
                )}
                {review.product && (
                  <Link href={`/shop/all/${review.product.slug}`} className="text-xs text-[#d4871a] hover:underline mt-4 inline-block">
                    Product: {review.product.title}
                  </Link>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-[#a8a29e] py-8">You haven't left any reviews yet.</p>
          )}
        </div>
      )}

      {/* Wishlist Tab */}
      {activeTab === 'wishlist' && (
        <div>
          {wishlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-[#f0ede8] shadow-sm relative group">
                  <button 
                    onClick={() => handleRemoveWishlist(item.product_id)}
                    className="absolute top-6 right-6 z-10 p-2 bg-white rounded-full shadow hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {/* Render your ProductCard here, or a fallback design */}
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-4" />
                  <h3 className="font-playfair font-bold text-lg text-[#1c1917]">{item.product.title}</h3>
                  <p className="text-[#d4871a] font-semibold mt-1">£{item.product.base_price}</p>
                  <Link href={`/shop/all/${item.product.slug}`} className="block mt-4 text-center w-full py-2 bg-[#1c1917] text-white text-xs font-bold uppercase rounded hover:bg-[#d4871a] transition-colors">
                    View Product
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#a8a29e] py-8">Your wishlist is currently empty.</p>
          )}
        </div>
      )}
    </div>
  )
}