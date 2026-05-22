// src/components/Admin/AddProductForm.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct, VariantInput } from '@/app/actions/inventory'
import { Plus, Trash2, Loader2, ImagePlus, CheckCircle, ChevronDown } from 'lucide-react'
import { Database } from '@/types/supabase'

type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name'>
interface VariantState extends VariantInput { isUploading: boolean }

const ACCENT = '#d4871a'
const DARK = '#0c0c0b'

const input = (focused: boolean) => ({
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${focused ? ACCENT : '#e8e2da'}`,
  borderRadius: 8, outline: 'none', background: '#fafaf9',
  color: '#1c1917', fontFamily: 'inherit', boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s ease',
})

function Field({ label, name, type = 'text', placeholder, required = true, hint, textarea }: {
  label: string; name: string; type?: string; placeholder: string; required?: boolean; hint?: string; textarea?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
        {label} {required && <span style={{ color: ACCENT }}>*</span>}
      </label>
      {textarea ? (
        <textarea name={name} required={required} rows={3} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...input(focused), resize: 'vertical' }} />
      ) : (
        <input type={type} name={name} required={required} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={input(focused)} />
      )}
      {hint && <p style={{ fontSize: 10, color: '#a8a29e', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

export default function AddProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError]         = useState('')
  const [variants, setVariants]   = useState<VariantState[]>([
    { sku: '', color: '', color_hex: '#8B7355', material: '', stock: '10', priceAdjustment: '0', image_url: '', isUploading: false }
  ])

  const addVariantRow = () => setVariants(v => [...v, { sku: '', color: '', color_hex: '#8B7355', material: '', stock: '10', priceAdjustment: '0', image_url: '', isUploading: false }])
  const removeVariant = (i: number) => setVariants(v => v.filter((_, idx) => idx !== i))
  const updateVariant = (index: number, field: keyof VariantState, value: string | boolean) => {
    setVariants(prev => { const n = [...prev]; (n[index] as any)[field] = value; return n })
  }

  const handleImageUpload = async (index: number, file: File) => {
    updateVariant(index, 'isUploading', true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET!)
    try {
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.secure_url) updateVariant(index, 'image_url', data.secure_url)
      else throw new Error('Upload failed')
    } catch { alert('Image upload failed.') }
    finally { updateVariant(index, 'isUploading', false) }
  }

  async function handleSubmit(fd: FormData) {
    setIsPending(true); setError('')
    const result = await addProduct(fd, variants)
    if (result?.error) { setError(result.error); setIsPending(false) }
    else { router.push('/admin/inventory'); router.refresh() }
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>}

      {/* Product details card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ede8', fontSize: 12, fontWeight: 700, color: '#1c1917' }}>
          Product Details
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Field label="Product Title"  name="title"     placeholder="e.g. The Harrington Sofa" />
          <Field label="URL Slug"       name="slug"      placeholder="e.g. harrington-sofa" hint="Unique. Lowercase + hyphens only." />
          <Field label="Base Price (£)" name="basePrice" type="number" placeholder="799.00" />
          <Field label="Style (filter)" name="style"     placeholder="e.g. Modern" required={false} />

          {/* Categories */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
              Categories <span style={{ color: ACCENT }}>*</span>
            </label>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1.5px solid #e8e2da', borderRadius: 8, background: '#fafaf9', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categories.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#57534e' }}>
                  <input type="checkbox" name="categoryIds" value={c.id}
                    style={{ width: 14, height: 14, accentColor: ACCENT }} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Description + Dimensions */}
        <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <Field label="Description" name="description" placeholder="Describe this sofa…" textarea />
          <Field label="Dimensions" name="dimensions" placeholder={`Width: 220cm\nDepth: 95cm\nHeight: 88cm\nSeat Height: 45cm`} textarea required={false} />
        </div>
      </div>

      {/* Variants card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0ede8' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1c1917' }}>Colour Variants ({variants.length})</span>
          <button type="button" onClick={addVariantRow}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f5f0e8', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#57534e', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget.style.background = `${ACCENT}18`); (e.currentTarget.style.color = ACCENT); }}
            onMouseLeave={e => { (e.currentTarget.style.background = '#f5f0e8'); (e.currentTarget.style.color = '#57534e'); }}>
            <Plus style={{ width: 13, height: 13 }} /> Add Variant
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {variants.map((variant, index) => (
            <div key={index} style={{ background: '#fafaf9', borderRadius: 10, border: '1px solid #f0ede8', padding: '14px', position: 'relative' }}>

              {/* Colour indicator strip */}
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, borderRadius: '10px 0 0 10px', background: variant.color_hex || '#e7e5e4' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 10 }}>
                {/* SKU */}
                <VariantField label="SKU" placeholder="VR-001" value={variant.sku} onChange={v => updateVariant(index, 'sku', v)} />
                {/* Material */}
                <VariantField label="Material" placeholder="Velvet" value={variant.material} onChange={v => updateVariant(index, 'material', v)} />
                {/* Color swatch + name */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Colour</label>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <input type="color" value={variant.color_hex || '#8B7355'} onChange={e => updateVariant(index, 'color_hex', e.target.value)}
                      style={{ width: 34, height: 34, borderRadius: 6, border: '1.5px solid #e8e2da', padding: 2, cursor: 'pointer', background: '#fff', flexShrink: 0 }} />
                    <input type="text" placeholder="Pearl White" value={variant.color} onChange={e => updateVariant(index, 'color', e.target.value)} required
                      style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: '1.5px solid #e8e2da', borderRadius: 7, outline: 'none', background: '#fff', color: '#1c1917', fontFamily: 'inherit', minWidth: 0 }} />
                  </div>
                </div>
                {/* Stock */}
                <VariantField label="Stock" type="number" placeholder="10" value={variant.stock} onChange={v => updateVariant(index, 'stock', v)} />
                {/* Price adj */}
                <VariantField label="+£ Adjust" type="number" placeholder="0" value={variant.priceAdjustment} onChange={v => updateVariant(index, 'priceAdjustment', v)} />
              </div>

              {/* Image upload row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: '#fff', borderRadius: 8, border: '1px solid #f0ede8' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f5f0e8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#57534e', flexShrink: 0 }}>
                  <ImagePlus style={{ width: 13, height: 13 }} />
                  Upload Image
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleImageUpload(index, e.target.files[0]) }} />
                </label>
                {variant.isUploading && <Loader2 style={{ width: 14, height: 14, color: ACCENT, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
                {variant.image_url && !variant.isUploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={variant.image_url} alt="Preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e2da', flexShrink: 0 }} />
                    <CheckCircle style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>Uploaded</span>
                  </div>
                )}
                {!variant.image_url && !variant.isUploading && <span style={{ fontSize: 11, color: '#d6d3d1' }}>No image</span>}

                {/* Remove variant */}
                <button type="button" onClick={() => removeVariant(index)} disabled={variants.length === 1}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', padding: '6px 8px', background: 'transparent', border: '1px solid #e8e2da', borderRadius: 7, cursor: variants.length === 1 ? 'not-allowed' : 'pointer', color: '#d6d3d1', opacity: variants.length === 1 ? 0.4 : 1, transition: 'all 0.15s', flexShrink: 0 }}
                  onMouseEnter={e => { if (variants.length > 1) { (e.currentTarget.style.background = '#fef2f2'); (e.currentTarget.style.color = '#dc2626'); } }}
                  onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = '#d6d3d1'); }}
                >
                  <Trash2 style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={isPending || variants.some(v => v.isUploading)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0', borderRadius: 10, border: 'none', background: isPending ? '#a8a29e' : DARK, color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', cursor: isPending ? 'wait' : 'pointer', transition: 'background 0.2s', boxShadow: isPending ? 'none' : '0 4px 16px rgba(0,0,0,0.12)' }}>
        {isPending ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} /> : null}
        {isPending ? 'Saving Product…' : 'Save Product & Variants'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}

function VariantField({ label, type = 'text', placeholder, value, onChange }: {
  label: string; type?: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: `1.5px solid ${focused ? '#d4871a' : '#e8e2da'}`, borderRadius: 7, outline: 'none', background: '#fff', color: '#1c1917', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
    </div>
  )
}