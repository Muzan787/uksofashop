// src/app/admin/inventory/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Plus, Edit3, EyeOff, Eye, LayoutGrid } from 'lucide-react'
import { deleteProduct, activateProduct } from '@/app/actions/inventory'
import Link from 'next/link'

export default async function InventoryPage() {
  const supabase = await createClient()

  // Fetch all products with their variants (removed stock tracking focus)
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, title, base_price, is_active,
      product_variants ( id, color )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">Inventory</h1>
          <p className="text-sm text-stone-500 mt-1">Manage your made-to-order catalog.</p>
        </div>
        <Link 
          href="/admin/inventory/new" 
          className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3.5 rounded-xl font-bold shadow-md hover:bg-orange-600 active:scale-95 transition"
        >
          <Plus className="w-5 h-5" /> Add New Sofa
        </Link>
      </div>

      {/* Cinematic Card Grid (Replaces the Table) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        
        {(!products || products.length === 0) && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-stone-200 shadow-sm">
            <LayoutGrid className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-xl font-bold text-stone-900">Catalog is empty</p>
            <p className="text-stone-500 text-sm mt-2 mb-6">Start building your storefront catalog.</p>
            <Link href="/admin/inventory/new" className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition">
              Create First Product
            </Link>
          </div>
        )}

        {products?.map((product) => {
          // Extract unique colors to show catalog variety instead of stock count
          const colors = Array.from(new Set((product.product_variants || []).map(v => v.color))).filter(Boolean);
          
          return (
            <div 
              key={product.id} 
              className={`bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col transition-all ${
                !product.is_active ? 'opacity-70 bg-stone-50 grayscale-[0.3]' : 'hover:shadow-md hover:border-stone-300'
              }`}
            >
              {/* Status Badge & Title */}
              <div className="flex justify-between items-start gap-3 mb-4">
                <h3 className="font-bold text-stone-900 text-lg leading-snug line-clamp-2">
                  {product.title}
                </h3>
                <div className="shrink-0 mt-1">
                  {product.is_active ? (
                    <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
                      Active
                    </span>
                  ) : (
                    <span className="bg-stone-200 text-stone-600 border border-stone-300 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
                      Hidden
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Details */}
              <div className="mb-6 space-y-1">
                <div className="text-3xl font-black text-stone-900 tracking-tight">
                  £{product.base_price.toFixed(2)}
                </div>
                <div className="text-sm text-stone-500 font-medium">
                  Made to Order • {colors.length} {colors.length === 1 ? 'Color' : 'Colors'}
                </div>
              </div>

              {/* Ergonomic Mobile Actions */}
              <div className="mt-auto pt-4 border-t border-stone-100 flex gap-2">
                <Link 
                  href={`/admin/inventory/${product.id}/edit`} 
                  className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-900 px-4 py-3 rounded-xl text-sm font-bold hover:bg-stone-200 active:scale-95 transition"
                >
                  <Edit3 className="w-4 h-4" /> Edit
                </Link>
                
                {/* Toggle Active/Hidden Button */}
                {product.is_active ? (
                  <form action={async (formData) => {
                    "use server";
                    await deleteProduct(formData);
                  }}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button 
                      type="submit" 
                      title="Hide Product from Storefront"
                      className="flex items-center justify-center bg-red-50 text-red-600 w-12 h-full rounded-xl hover:bg-red-100 active:scale-95 transition"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form action={async (formData) => {
                    "use server";
                    await activateProduct(formData);
                  }}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button 
                      type="submit" 
                      title="Show Product on Storefront"
                      className="flex items-center justify-center bg-green-50 text-green-600 w-12 h-full rounded-xl hover:bg-green-100 active:scale-95 transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}