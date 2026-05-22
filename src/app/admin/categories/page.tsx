// src/app/admin/categories/page.tsx
import { createClient } from '@/utils/supabase/server'
import AddCategoryForm from '@/components/Admin/AddCategoryForm'
import { deleteCategory } from '@/app/actions/categories'
import { Trash2, Tags, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const ACCENT = '#d4871a'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>Categories</h1>
        <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>{categories?.length || 0} categories</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>

        {/* Category list */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0ede8', fontSize: 12, fontWeight: 700, color: '#1c1917', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Tags style={{ width: 14, height: 14, color: ACCENT }} />
            All Categories
          </div>

          {(!categories || categories.length === 0) ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#a8a29e', fontSize: 13 }}>
              No categories yet — add one using the form.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {categories.map((cat, i) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < categories.length - 1 ? '1px solid #fafaf9' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f5f0e8', border: '1px solid #e8e2da' }}>
                    <Image src={cat.image_url || '/placeholder.svg'} alt={cat.name} fill sizes="42px" style={{ objectFit: 'cover' }} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>{cat.name}</div>
                    <div style={{ fontSize: 10, color: '#a8a29e', fontFamily: 'monospace', marginTop: 1 }}>/{cat.slug}</div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Link href={`/shop/${cat.slug}`} target="_blank"
                      style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 7px', background: '#f5f0e8', border: '1px solid #e8e2da', borderRadius: 6, color: '#78716c', transition: 'all 0.15s', textDecoration: 'none' }}
                      onMouseEnter={(e: any) => { e.currentTarget.style.background = ACCENT + '14'; e.currentTarget.style.color = ACCENT; }}
                      onMouseLeave={(e: any) => { e.currentTarget.style.background = '#f5f0e8'; e.currentTarget.style.color = '#78716c'; }}
                    >
                      <ExternalLink style={{ width: 12, height: 12 }} />
                    </Link>
                    <form action={async (fd) => { 'use server'; await deleteCategory(fd) }}>
                      <input type="hidden" name="categoryId" value={cat.id} />
                      <button type="submit"
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 7px', background: 'transparent', border: '1px solid #e8e2da', borderRadius: 6, cursor: 'pointer', color: '#d6d3d1', transition: 'all 0.15s' }}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d6d3d1'; e.currentTarget.style.borderColor = '#e8e2da'; }}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add form */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
          <div style={{ height: 3, background: ACCENT }} />
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0ede8', fontSize: 12, fontWeight: 700, color: '#1c1917' }}>Add New Category</div>
          <div style={{ padding: '18px' }}>
            <AddCategoryForm />
          </div>
        </div>
      </div>
    </div>
  )
}