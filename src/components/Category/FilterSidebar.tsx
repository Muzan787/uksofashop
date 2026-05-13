'use client'
// src/components/Category/FilterSidebar.tsx
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

const ACCENT = '#d4871a'

interface Props { availableStyles: string[]; availableMaterials: string[] }

export default function FilterSidebar({ availableStyles, availableMaterials }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()
  const [open, setOpen] = useState(false)

  const toggle = useCallback((key: string, val: string) => {
    const params = new URLSearchParams(sp.toString())
    params.get(key) === val ? params.delete(key) : params.set(key, val)
    params.delete('page')
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false })
  }, [sp, router, pathname])

  const hasFilters = sp.get('style') || sp.get('material')

  const clearAll = () => {
    const params = new URLSearchParams()
    router.push(pathname, { scroll: false })
  }

  const groups = [
    { key: 'style',    label: 'Style',    options: availableStyles    },
    { key: 'material', label: 'Material', options: availableMaterials },
  ].filter(g => g.options.length > 0)

  const inner = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT }}>
          Filters
        </span>
        {hasFilters && (
          <button onClick={clearAll}
            style={{ fontSize: 10, color: '#a8a29e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear all
          </button>
        )}
      </div>

      {groups.map(({ key, label, options }) => (
        <div key={key} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#78716c', marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {options.map(opt => {
              const active = sp.get(key) === opt.toLowerCase()
              return (
                <button key={opt} onClick={() => toggle(key, opt.toLowerCase())}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: 'none', cursor: 'pointer',
                    padding: '6px 10px', borderRadius: 6, textAlign: 'left',
                    background: active ? `${ACCENT}12` : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${active ? ACCENT : '#d6d3d1'}`,
                    background: active ? ACCENT : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {active && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>}
                  </span>
                  <span style={{ fontSize: 12, color: active ? '#1c1917' : '#57534e', fontWeight: active ? 600 : 400 }}>
                    {opt}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden"
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 16px', borderRadius: 8,
          border: `1.5px solid ${hasFilters ? ACCENT : '#e7e5e4'}`,
          background: hasFilters ? `${ACCENT}10` : '#fff',
          fontSize: 12, fontWeight: 600,
          color: hasFilters ? ACCENT : '#57534e',
          cursor: 'pointer', marginBottom: 16,
        }}
      >
        <SlidersHorizontal style={{ width: 14, height: 14 }} />
        Filters {hasFilters && '•'}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)} />
          <div style={{
            width: 280, background: '#fff', padding: '24px 20px',
            overflowY: 'auto', animation: 'slideInRight 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1917' }}>Filters</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: 16, height: 16, color: '#78716c' }} />
              </button>
            </div>
            {inner}
            <button onClick={() => setOpen(false)}
              style={{ width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block" style={{ width: 200, flexShrink: 0, paddingRight: 28 }}>
        {inner}
      </aside>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
    </>
  )
}