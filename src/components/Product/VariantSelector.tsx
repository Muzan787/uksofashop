'use client'

import { useState } from 'react'
import { ShoppingCart, Check, Truck, Wallet, ShieldCheck, Ruler, X, ChevronDown, ChevronUp } from 'lucide-react'
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

  // --- NEW STATES ---
  const [showDimensions, setShowDimensions] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

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

  // --- FIX: Safely Parse Dimensions ---
  let specs: Record<string, string> = {};
  if (typeof product.specifications === 'string') {
    try { specs = JSON.parse(product.specifications); } catch (e) {}
  } else if (typeof product.specifications === 'object' && product.specifications !== null) {
    specs = product.specifications as Record<string, string>;
  }
  const dimensions = specs?.dimensions?.trim() || '';

  // --- NEW: Description Truncation Logic ---
  const MAX_DESC_LENGTH = 150;
  const safeDescription = product.description || '';
  const isLongDescription = safeDescription.length > MAX_DESC_LENGTH;
  const displayDescription = isLongDescription && !isDescriptionExpanded 
    ? `${safeDescription.substring(0, MAX_DESC_LENGTH)}...` 
    : safeDescription;

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

        {/* --- UPDATED: Description Section --- */}
        <div className="mt-8">
          <div className="text-stone-600 leading-relaxed font-sans text-base whitespace-pre-wrap">
            {displayDescription}
          </div>
          {isLongDescription && (
            <button 
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1 transition-colors outline-none"
            >
              {isDescriptionExpanded ? (
                <>Show Less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Read More <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>

        {/* --- FIXED: View Dimensions Button --- */}
        {dimensions.length > 0 && (
          <div className="mt-6">
            <button 
              onClick={() => setShowDimensions(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl font-medium transition-colors"
            >
              <Ruler className="w-4 h-4 text-amber-600" />
              View Dimensions
            </button>
          </div>
        )}

        {/* Add to Cart & Trust Signals */}
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

          <div className="hidden md:grid grid-cols-1 gap-3 mt-6 p-5 bg-stone-50 rounded-xl border border-stone-100">
            <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
              <Truck className="w-5 h-5 text-amber-600" /> Free UK Mainland Delivery over £500
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
              <Wallet className="w-5 h-5 text-amber-600" /> Cash or Bank Transfer on Delivery Available
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
              <ShieldCheck className="w-5 h-5 text-amber-600" /> 1-Year Structural Guarantee
            </div>
          </div>
        </div>
      </div>

      {/* --- Dimensions Modal Popup --- */}
      {showDimensions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowDimensions(false)} 
          />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50">
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-amber-600" /> Product Dimensions
              </h3>
              <button 
                onClick={() => setShowDimensions(false)} 
                className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 text-stone-700 whitespace-pre-wrap leading-relaxed font-medium font-sans">
              {dimensions}
            </div>
            
            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <button 
                onClick={() => setShowDimensions(false)}
                className="w-full py-2.5 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}