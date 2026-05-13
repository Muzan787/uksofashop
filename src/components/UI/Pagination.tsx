'use client'
// src/components/UI/Pagination.tsx
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ACCENT = '#d4871a'

export default function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const pathname = usePathname()
  const sp = useSearchParams()

  const url = (p: number) => {
    const params = new URLSearchParams(sp.toString())
    params.set('page', p.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  // Build page numbers with ellipsis
  const pages: (number | '…')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  const btn = (content: React.ReactNode, href: string | null, active = false, disabled = false) => {
    const style: React.CSSProperties = {
      minWidth: 36, height: 36, borderRadius: 7,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: active ? 700 : 500,
      border: `1.5px solid ${active ? ACCENT : disabled ? '#f0ede8' : '#e7e5e4'}`,
      background: active ? ACCENT : 'transparent',
      color: active ? '#fff' : disabled ? '#d6d3d1' : '#57534e',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
      padding: '0 8px',
    }
    if (!href || disabled) return <div style={style}>{content}</div>
    return <Link href={href} style={style}>{content}</Link>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 40 }}>
      {btn(<ChevronLeft style={{ width: 14, height: 14 }} />, currentPage > 1 ? url(currentPage - 1) : null, false, currentPage <= 1)}
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ width: 24, textAlign: 'center', color: '#a8a29e', fontSize: 12 }}>…</span>
          : btn(p, url(p as number), p === currentPage)
      )}
      {btn(<ChevronRight style={{ width: 14, height: 14 }} />, currentPage < totalPages ? url(currentPage + 1) : null, false, currentPage >= totalPages)}
    </div>
  )
}