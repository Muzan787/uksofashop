// src/components/Admin/AddCategoryForm.tsx
import { useState } from 'react' 
import { useRouter } from 'next/navigation'
import { addCategory } from '@/app/actions/categories'
import { Loader2, ImagePlus, CheckCircle } from 'lucide-react'

const ACCENT = '#d4871a'

const fieldStyle = (focused: boolean) => ({
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${focused ? ACCENT : '#e8e2da'}`,
  borderRadius: 8, outline: 'none', background: '#fafaf9',
  color: '#1c1917', fontFamily: 'inherit', boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s ease',
})

function Field({ label, name, placeholder, hint }: { label: string; name: string; placeholder: string; hint?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
        {label} <span style={{ color: ACCENT }}>*</span>
      </label>
      <input type="text" name={name} required placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={fieldStyle(focused)} />
      {hint && <p style={{ fontSize: 10, color: '#a8a29e', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

export default function AddCategoryForm() {
  const router     = useRouter()
  const [pending,   setPending]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [imageUrl,  setImageUrl]  = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET!)
    try {
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.secure_url) setImageUrl(data.secure_url)
      else throw new Error('Upload failed')
    } catch { alert('Image upload failed. Check Cloudinary settings.') }
    finally { setUploading(false) }
  }

  async function handleSubmit(fd: FormData) {
    setPending(true); setError('')
    const result = await addCategory(fd, imageUrl)
    if (result?.error) { setError(result.error); setPending(false) }
    else {
      const form = document.getElementById('cat-form') as HTMLFormElement
      form?.reset(); setImageUrl(''); setPending(false); router.refresh()
    }
  }

  return (
    <form id="cat-form" action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: '#dc2626' }}>{error}</div>}

      <Field label="Category Name" name="name" placeholder="e.g. Corner Sofas" />
      <Field label="URL Slug" name="slug" placeholder="e.g. corner-sofas" hint="Lowercase letters and hyphens only" />

      {/* Image upload */}
      <div>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
          Category Image
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fafaf9', border: '1.5px solid #e8e2da', borderRadius: 8 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: '1px solid #e8e2da', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#57534e', flexShrink: 0 }}>
            <ImagePlus style={{ width: 13, height: 13 }} />
            {uploading ? 'Uploading…' : 'Choose'}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
          {uploading && <Loader2 style={{ width: 14, height: 14, color: ACCENT, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
          {imageUrl && !uploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={imageUrl} alt="Preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e2da' }} />
              <CheckCircle style={{ width: 14, height: 14, color: '#16a34a' }} />
            </div>
          )}
          {!imageUrl && !uploading && <span style={{ fontSize: 11, color: '#d6d3d1' }}>No image selected</span>}
        </div>
      </div>

      <button type="submit" disabled={pending || uploading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 8, border: 'none', background: pending ? '#a8a29e' : '#0c0c0b', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', cursor: pending ? 'wait' : 'pointer', transition: 'background 0.2s' }}>
        {pending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : null}
        {pending ? 'Creating…' : 'Create Category'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}