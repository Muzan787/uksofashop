// src/app/admin/inventory/page.tsx
import { createClient } from '@/utils/supabase/server'
import { deleteProduct } from '@/app/actions/inventory'
import Link from 'next/link'
import { Plus, Edit, Package, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'

const ACCENT = '#d4871a'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, title, base_price, is_active, product_variants(id, color, color_hex, stock_quantity)')
    .order('created_at', { ascending: false })

  const totalProducts = products?.length || 0
  const activeProducts = products?.filter(p => p.is_active).length || 0
  const outOfStock = products?.filter(p => {
    const stock = (p.product_variants || []).reduce((a: number, v: any) => a + (v.stock_quantity || 0), 0)
    return stock === 0
  }).length || 0

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>Inventory</h1>
          <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>{totalProducts} products · {activeProducts} active</p>
        </div>
        <Link href="/admin/inventory/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#0c0c0b', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          <Plus style={{ width: 14, height: 14 }} /> Add New Sofa
        </Link>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {[
          { label: `${activeProducts} Active`, color: '#16a34a', bg: '#f0fdf4' },
          { label: `${totalProducts - activeProducts} Inactive`, color: '#78716c', bg: '#fafaf9' },
          ...(outOfStock > 0 ? [{ label: `${outOfStock} Out of Stock`, color: '#dc2626', bg: '#fef2f2' }] : []),
        ].map(p => (
          <div key={p.label} style={{ padding: '4px 12px', background: p.bg, borderRadius: 20, fontSize: 11, color: p.color, fontWeight: 700 }}>{p.label}</div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
        {(!products || products.length === 0) ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Package style={{ width: 36, height: 36, color: '#d6d3d1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1917', marginBottom: 6 }}>No products yet</p>
            <Link href="/admin/inventory/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: ACCENT, color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
              <Plus style={{ width: 13, height: 13 }} /> Add your first product
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f0ede8' }}>
                  {['Product', 'Status', 'Base Price', 'Variants & Stock', 'Actions'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.14em', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product, i) => {
                  const totalStock = (product.product_variants || []).reduce((a: number, v: any) => a + (v.stock_quantity || 0), 0)
                  const stockColor = totalStock > 10 ? '#16a34a' : totalStock > 0 ? '#d97706' : '#dc2626'
                  const stockBg    = totalStock > 10 ? '#f0fdf4' : totalStock > 0 ? '#fef9ec' : '#fef2f2'
                  return (
                    <tr key={product.id} style={{ borderBottom: i < products.length - 1 ? '1px solid #fafaf9' : 'none', opacity: product.is_active ? 1 : 0.55, transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Product */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>{product.title}</div>
                      </td>
                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: product.is_active ? '#f0fdf4' : '#f5f5f4', color: product.is_active ? '#16a34a' : '#78716c' }}>
                          {product.is_active ? <CheckCircle style={{ width: 10, height: 10 }} /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d6d3d1' }} />}
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Price */}
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 800, color: '#1c1917' }}>
                        £{product.base_price.toFixed(2)}
                      </td>
                      {/* Variants & Stock */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {/* Colour swatches */}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(product.product_variants || []).slice(0, 6).map((v: any) => (
                              <div key={v.id} title={v.color || ''} style={{ width: 14, height: 14, borderRadius: '50%', background: v.color_hex || '#e7e5e4', border: '1.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                            ))}
                            {(product.product_variants || []).length > 6 && (
                              <span style={{ fontSize: 10, color: '#a8a29e' }}>+{(product.product_variants || []).length - 6}</span>
                            )}
                          </div>
                          {/* Stock */}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: stockBg, color: stockColor, fontSize: 10, fontWeight: 700 }}>
                            {totalStock > 0 && totalStock <= 5 && <AlertTriangle style={{ width: 9, height: 9 }} />}
                            {totalStock} in stock
                          </span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <Link href={`/admin/inventory/${product.id}/edit`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f5f0e8', color: '#57534e', borderRadius: 7, textDecoration: 'none', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}
                            onMouseEnter={(e: any) => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e: any) => { e.currentTarget.style.background = '#f5f0e8'; e.currentTarget.style.color = '#57534e'; }}
                          >
                            <Edit style={{ width: 12, height: 12 }} /> Edit
                          </Link>
                          {product.is_active && (
                            <form action={async (fd) => { 'use server'; await deleteProduct(fd) }}>
                              <input type="hidden" name="productId" value={product.id} />
                              <button type="submit"
                                style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px', background: 'transparent', border: '1px solid #e8e2da', borderRadius: 7, cursor: 'pointer', color: '#d6d3d1', transition: 'all 0.15s' }}
                                onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
                                onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d6d3d1'; e.currentTarget.style.borderColor = '#e8e2da'; }}
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}