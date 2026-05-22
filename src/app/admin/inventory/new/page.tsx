// src/app/admin/inventory/new/page.tsx
import { createClient } from '@/utils/supabase/server'
import AddProductForm from '@/components/Admin/AddProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const ACCENT = '#d4871a'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('id, name').order('name')

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/admin/inventory"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: '#fff', border: '1px solid #e8e2da', borderRadius: 8, textDecoration: 'none', color: '#78716c', transition: 'all 0.15s' }}>
          <ArrowLeft style={{ width: 15, height: 15 }} />
        </Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>Add New Product</h1>
          <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>Create a product with variants below</p>
        </div>
      </div>
      <AddProductForm categories={categories || []} />
    </div>
  )
}