'use client'
// src/app/login/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { login } from '@/app/actions/auth'
import Field, { SubmitButton } from '@/components/UI/Field'
import AuthShell, { Stagger } from '@/components/Auth/AuthShell'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleLogin(fd: FormData) {
    setPending(true)
    setError('')
    // Where they were going before being asked to sign in (the admin proxy
    // sets it). Read here rather than with useSearchParams so the page stays
    // static; the action decides whether it is safe to follow.
    const next = new URLSearchParams(window.location.search).get('next')
    if (next) fd.set('next', next)
    const res = await login(fd)
    // An admin is sent on with a full page load, so no tag from this page
    // follows them into the admin. A customer is redirected by `login`
    // itself, so anything else reaching here is a failure.
    if (res && 'admin' in res && res.admin) { window.location.assign(res.admin); return }
    if (res?.error) { setError(res.error); setPending(false) }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      heading="Sign in"
      line="Your orders, where they have got to, and everything you have saved."
      footer={
        <p className="m-0 text-body-sm text-ink-500">
          No account yet?{' '}
          <Link href="/signup" className="hover-link font-semibold text-ember-700 no-underline">
            Create one
          </Link>
          {' '}— or{' '}
          <Link href="/track-order" className="hover-link font-semibold text-ember-700 no-underline">
            track an order without signing in
          </Link>.
        </p>
      }
    >
      <form action={handleLogin} className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-rust-700 bg-rust-50 px-4 py-3 text-body-sm text-rust-700 motion-safe:animate-[field-shake_300ms_var(--ease-out-expo)]"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Stagger index={0}>
          <Field label="Email address" name="email" type="email" required disabled={pending} autoComplete="email" />
        </Stagger>

        <Stagger index={1}>
          <Field label="Password" name="password" type="password" required disabled={pending} autoComplete="current-password" />
        </Stagger>

        <Stagger index={2}>
          <SubmitButton
            idle="Sign in"
            pending="Signing in"
            done="Signed in"
            state={pending ? 'pending' : 'idle'}
          />
        </Stagger>
      </form>
    </AuthShell>
  )
}
