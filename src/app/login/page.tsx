'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { login } from '@/app/actions/auth'
import { Lock, Loader2, Eye, EyeOff, Mail, LogIn } from 'lucide-react'
import Link from 'next/link'

const ACCENT = '#d4871a'

export default function LoginPage() {
  const [error, setPending_] = useState('')
  const [pending, setPending] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [focusedEmail, setFocusedEmail] = useState(false)
  const [focusedPw, setFocusedPw]       = useState(false)

  async function handleLogin(fd: FormData) {
    setPending(true); setPending_('')
    const res = await login(fd)
    if (res?.error) { setPending_(res.error); setPending(false) }
  }

  const inputStyle = (focused: boolean) => ({
    width: '100%', padding: '11px 14px 11px 40px', fontSize: 13,
    border: `1.5px solid ${focused ? ACCENT : '#e7e5e4'}`, borderRadius: 8,
    outline: 'none', background: '#fafaf9', color: '#1c1917',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <span className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: '#1c1917' }}>
              Vantage<span style={{ color: ACCENT }}> Group LTD</span>
            </span>
          </Link>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ede8', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ height: 3, background: ACCENT }} />
          <div style={{ padding: '28px 24px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0c0c0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock style={{ width: 18, height: 18, color: ACCENT }} />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', lineHeight: 1 }}>Welcome Back</h1>
                <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 3 }}>Sign in to your account</p>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form action={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: focusedEmail ? ACCENT : '#c4b9ad', transition: 'color 0.2s', pointerEvents: 'none' }} />
                  <input type="email" name="email" required disabled={pending}
                    placeholder="your@email.com"
                    onFocus={() => setFocusedEmail(true)} onBlur={() => setFocusedEmail(false)}
                    style={inputStyle(focusedEmail)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: focusedPw ? ACCENT : '#c4b9ad', transition: 'color 0.2s', pointerEvents: 'none' }} />
                  <input type={showPw ? 'text' : 'password'} name="password" required disabled={pending}
                    placeholder="••••••••"
                    onFocus={() => setFocusedPw(true)} onBlur={() => setFocusedPw(false)}
                    style={{ ...inputStyle(focusedPw), paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e', padding: 0 }}>
                    {showPw ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={pending}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 0', borderRadius: 8, border: 'none',
                  background: pending ? '#a8a29e' : '#0c0c0b', color: '#fff',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: pending ? 'wait' : 'pointer', marginTop: 4,
                  transition: 'background 0.2s ease',
                }}
              >
                {pending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <LogIn style={{ width: 14, height: 14 }} />}
                {pending ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 11, color: '#a8a29e', textDecoration: 'none' }}
            className="hover:text-stone-600 transition-colors">← Back to Store</Link>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}