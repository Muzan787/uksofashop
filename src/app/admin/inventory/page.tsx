// src/app/admin/inventory/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Plus, Edit, Package, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { deleteProduct } from '@/app/actions/inventory'

export default async function InventoryPage() {
  const supabase = await createClient()

  // Fetch all products with their variants
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, title, base_price,
      product_variants ( id, color, stock_quantity )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
        <Link 
          href="/admin/inventory/new" 
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition"
        >
          <Plus className="w-5 h-5" /> Add New Sofa
        </Link>
      </div>

      {/* Inventory List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Product Title</th>
              <th className="p-4">Base Price</th>
              <th className="p-4">Total Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products?.map((product) => {
              // Calculate total stock across all color variants
              const totalStock = product.product_variants.reduce((acc, variant) => acc + (variant.stock_quantity || 0), 0)
              
              return (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{product.title}</td>
                  <td className="p-4 text-slate-600">£{product.base_price.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${totalStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <Package className="w-3 h-3" />
                      {totalStock} in stock
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-3">
                      {/* Placeholder for future edit functionality */}
                      <button className="text-slate-400 hover:text-blue-600 transition" title="Edit">
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      {/* New Delete Form */}
                      <form action={deleteProduct}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button 
                          type="submit" 
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}