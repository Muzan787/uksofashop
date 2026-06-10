'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, ArrowRight } from 'lucide-react'
import { toggleWishlist } from '@/app/actions/wishlist'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface WishlistItem {
  productId: string
  title: string
  slug: string
  categorySlug: string
  price: number
  imageUrl: string
}

export default function WishlistClient({ initialItems }: { initialItems: WishlistItem[] }) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleRemove = async (productId: string, title: string) => {
    setLoadingId(productId)
    try {
      const result = await toggleWishlist(productId)
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      // If successfully toggled off, remove from local state to update UI instantly
      if (!result.isWishlisted) {
        setItems((prev) => prev.filter((item) => item.productId !== productId))
        toast.success(`${title} removed from wishlist`)
      }
    } catch (error) {
      toast.error('An unexpected error occurred.')
    } finally {
      setLoadingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          You haven't saved any items yet. Explore our collections to find your perfect match.
        </p>
        <Link 
          href="/shop/sofas" 
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div 
            key={item.productId}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className="group relative flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link href={`/shop/${item.categorySlug}/${item.slug}`} className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden block">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </Link>
            
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                <Link href={`/shop/${item.categorySlug}/${item.slug}`}>
                  {item.title}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-gray-500 font-geist-mono">£{item.price.toFixed(2)}</p>
              
              <div className="mt-auto pt-4 flex items-center justify-between">
                <button
                  onClick={() => handleRemove(item.productId, item.title)}
                  disabled={loadingId === item.productId}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50 transition-colors"
                  aria-label={`Remove ${item.title} from wishlist`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{loadingId === item.productId ? 'Removing...' : 'Remove'}</span>
                </button>
                
                <Link
                  href={`/shop/${item.categorySlug}/${item.slug}`}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}