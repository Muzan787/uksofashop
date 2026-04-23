'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Check, Truck, Wallet, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { Database } from '@/types/supabase'
import { useCart } from '@/context/CartContext'
import toast from 'react-hot-toast'

type Product = Database['public']['Tables']['products']['Row']
type Variant = Database['public']['Tables']['product_variants']['Row']

interface VariantSelectorProps {
  product: Product
  variants: Variant[]
}

export default function VariantSelector({ product, variants }: VariantSelectorProps) {
  const { addToCart } = useCart()

  // 1. Extract unique materials
  const uniqueMaterials = Array.from(new Set(variants.map(v => v.material || 'Standard')))
  
  const [selectedMaterial, setSelectedMaterial] = useState<string>(uniqueMaterials[0] || 'Standard')
  
  // 2. Filter colors based on the selected material
  const availableVariants = variants.filter(v => (v.material || 'Standard') === selectedMaterial)
  
  const [selectedColor, setSelectedColor] = useState<string>(
    availableVariants.length > 0 ? availableVariants[0].color! : ''
  )

  // 3. Find the exact matching variant
  const selectedVariant = variants.find(
    v => (v.material || 'Standard') === selectedMaterial && v.color === selectedColor
  ) || availableVariants[0]

  // Automatically switch to a valid color if the user clicks a material that doesn't have their currently selected color
  const handleMaterialChange = (material: string) => {
    setSelectedMaterial(material)
    const colorsForNewMaterial = variants.filter(v => (v.material || 'Standard') === material)
    
    if (!colorsForNewMaterial.find(v => v.color === selectedColor)) {
      setSelectedColor(colorsForNewMaterial[0]?.color || '')
    }
  }

  const displayPrice = product.base_price + (selectedVariant?.price_adjustment || 0)
  const displayImage = selectedVariant?.image_url || '/placeholder.svg'

  const handleAddToCart = () => {
    if (!selectedVariant) return

    addToCart({
      variant_id: selectedVariant.id,
      quantity: 1,
      price: displayPrice,
      title: product.title,
      color: `${selectedVariant.color} ${selectedVariant.material}`,
      image_url: displayImage
    })
    
    toast.success(`${product.title} added to cart!`, { icon: '🛋️' });
    if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="relative aspect-square bg-stone-50 rounded-2xl overflow-hidden shadow-sm">
        <Image 
          src={displayImage} 
          alt={`${product.title} in ${selectedColor} ${selectedMaterial}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-opacity duration-300"
        />
      </div>

      <div className="flex flex-col justify-center">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{product.title}</h1>
        <p className="text-2xl font-semibold text-stone-800 mt-4">£{displayPrice.toFixed(2)}</p>

        {variants.length > 0 && (
          <div className="mt-8 space-y-6">
            
            {/* MATERIAL SELECTOR */}
            {uniqueMaterials.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">
                  Material: <span className="font-normal text-stone-600 capitalize">{selectedMaterial}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {uniqueMaterials.map(material => (
                    <button
                      key={material}
                      onClick={() => handleMaterialChange(material)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                        selectedMaterial === material 
                          ? 'border-stone-900 bg-stone-900 text-white shadow-md' 
                          : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {material}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COLOR SELECTOR */}
            <div>
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">
                Colour: <span className="font-normal text-stone-600 capitalize">{selectedColor}</span>
              </h3>
              <div className="flex flex-wrap gap-4">
                {availableVariants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedColor(variant.color!)}
                    className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center focus:outline-none transition-all duration-200 ${
                      selectedColor === variant.color 
                        ? 'border-stone-900 scale-110 shadow-md' 
                        : 'border-transparent ring-1 ring-stone-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: variant.color_hex || variant.color?.toLowerCase() || '#e2e8f0' }}
                    title={variant.color || ''}
                  >
                    {selectedColor === variant.color && (
                      <Check className="w-5 h-5 text-white drop-shadow-md mix-blend-difference" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4 text-stone-600 leading-relaxed">
          <p>{product.description}</p>
        </div>

        {/* ... (Keep existing Add to Cart & Trust Signals logic) */}
        <div className="mt-10">
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-stone-200 md:relative md:bg-transparent md:border-none md:p-0 z-40">
            <button
              onClick={handleAddToCart}
              className="w-full bg-stone-900 text-white flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-lg hover:bg-stone-800 transition-all active:scale-[0.98] disabled:bg-stone-300 disabled:cursor-not-allowed shadow-lg md:shadow-none"
              disabled={selectedVariant?.stock_quantity === 0}
            >
              <ShoppingCart className="w-5 h-5" />
              {selectedVariant?.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}