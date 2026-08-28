'use client'
// src/components/UI/Pagination.tsx
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ACCENT = 'var(--color-ember-500)'      // fills: buttons, rules, icons, badges

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

  // Takes a key, because most of these are produced inside the map below and
  // React was warning about it on every listing render.
  const btn = (
    key: string,
    content: React.ReactNode,
    href: string | null,
    active = false,
    disabled = false,
  ) => {
    const style: React.CSSProperties = {
      minWidth: 36, height: 36, borderRadius: 'var(--radius-sm)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 'var(--text-caption)', fontWeight: active ? 700 : 500,
      border: `1.5px solid ${active ? ACCENT : disabled ? 'var(--color-calico-300)' : 'var(--color-calico-300)'}`,
      background: active ? ACCENT : 'transparent',
      color: active ? 'var(--color-calico-50)' : disabled ? 'var(--color-calico-300)' : 'var(--color-ink-500)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all var(--dur-swift) var(--ease-out-expo)',
      textDecoration: 'none',
      padding: '0 8px',
    }
    if (!href || disabled) return <div key={key} style={style}>{content}</div>
    return <Link key={key} href={href} style={style}>{content}</Link>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
      {btn('prev', <ChevronLeft style={{ width: 14, height: 14 }} />, currentPage > 1 ? url(currentPage - 1) : null, false, currentPage <= 1)}
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ width: 24, textAlign: 'center', color: 'var(--color-ink-500)', fontSize: 'var(--text-caption)' }}>…</span>
          : btn(`p${p}`, p, url(p as number), p === currentPage)
      )}
      {btn('next', <ChevronRight style={{ width: 14, height: 14 }} />, currentPage < totalPages ? url(currentPage + 1) : null, false, currentPage >= totalPages)}
    </div>
  )
}