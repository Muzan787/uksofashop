// src/components/Product/VariantSelector.tsx
'use client'

import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { Database } from '@/types/supabase'

// Extracting types generated from Supabase
type Product = Database['public']['Tables']['products']['Row']
type Variant = Database['public']['Tables']['product_variants']['Row']

interface VariantSelectorProps {
  product: Product
  variants: Variant[]
}

export default function VariantSelector({ product, variants }: VariantSelectorProps) {
  // 1. Initialize state with the first variant (if available)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants.length > 0 ? variants[0] : null
  )

  // 2. Dynamically calculate price and image based on selection
  const displayPrice = product.base_price + (selectedVariant?.price_adjustment || 0)
  const displayImage = selectedVariant?.image_url || '/placeholder-sofa.jpg'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      
      {/* --- Image Gallery --- */}
      <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden shadow-sm">
        <img 
          src={displayImage} 
          alt={`${product.title} in ${selectedVariant?.color || 'default'}`}
          className="object-cover w-full h-full transition-opacity duration-300"
        />
      </div>

      {/* --- Product Details & Interactions --- */}
      <div className="flex flex-col justify-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{product.title}</h1>
        <p className="text-2xl font-semibold text-slate-800 mt-4">£{displayPrice.toFixed(2)}</p>

        {/* Variant Swatches (Colors/Materials) */}
        {variants.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Color: <span className="font-normal text-slate-600 capitalize">{selectedVariant?.color}</span>
            </h3>
            
            <div className="flex flex-wrap gap-4 mt-4">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center focus:outline-none transition-all duration-200 ${
                    selectedVariant?.id === variant.id 
                      ? 'border-slate-900 scale-110 shadow-md' 
                      : 'border-transparent ring-1 ring-gray-200 hover:scale-105'
                  }`}
                  // In a real app, map color names to hex codes, or use tailwind classes
                  style={{ backgroundColor: variant.color?.toLowerCase() || '#e2e8f0' }}
                  aria-label={`Select ${variant.color} variant`}
                >
                  {selectedVariant?.id === variant.id && (
                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4 text-slate-600 leading-relaxed">
          <p>{product.description}</p>
        </div>

        {/* --- Sticky Mobile Add to Cart --- */}
        {/* The 'fixed bottom-0' classes make it stick to the bottom on mobile, while 'md:relative' puts it back in normal flow on desktop */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 md:relative md:bg-transparent md:border-none md:p-0 md:mt-10 z-50">
          <button 
            className="w-full bg-slate-900 text-white flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg md:shadow-none"
            disabled={selectedVariant?.stock_quantity === 0}
          >
            <ShoppingCart className="w-5 h-5" />
            {selectedVariant?.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}