'use client'
// src/app/signup/page.tsx

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { signUp, verifySignupOtp } from '@/app/actions/auth'
import Field, { SubmitButton } from '@/components/UI/Field'
import OtpInput from '@/components/UI/OtpInput'
import AuthShell, { Stagger } from '@/components/Auth/AuthShell'

export default function SignUpPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const otpForm = useRef<HTMLFormElement>(null)

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    setEmail(fd.get('email') as string)

    const res = await signUp(fd)
    if (res?.error) setError(res.error)
    else setStep(2)
    setPending(false)
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    fd.append('email', email)

    const res = await verifySignupOtp(fd)
    // On success it redirects; reaching here means it did not.
    if (res?.error) { setError(res.error); setPending(false) }
  }

  // Six digits in means the answer is complete, so there is nothing left to
  // press. requestSubmit rather than submit(), so the form's own handler runs.
  const submitOtp = useCallback(() => {
    otpForm.current?.requestSubmit()
  }, [])

  return (
    <AuthShell
      eyebrow={step === 1 ? 'New here' : 'One last thing'}
      heading={step === 1 ? 'Create an account' : 'Check your email'}
      line={
        step === 1
          ? 'It takes a minute, and it keeps your orders and saved sofas in one place.'
          : `We sent a six-digit code to ${email}. It is good for the next hour.`
      }
      footer={
        step === 1 ? (
          <p className="m-0 text-body-sm text-ink-500">
            Already have an account?{' '}
            <Link href="/login" className="hover-link font-semibold text-ember-700 no-underline">
              Sign in
            </Link>.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => { setStep(1); setError(''); setCode('') }}
            className="hover-link inline-flex items-center gap-1.5 text-body-sm text-ink-500"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Use a different email address
          </button>
        )
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-sm border border-rust-700 bg-rust-50 px-4 py-3 text-body-sm text-rust-700 motion-safe:animate-[field-shake_300ms_var(--ease-out-expo)]"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <Stagger index={0}>
            <Field label="Full name" name="fullName" required disabled={pending} autoComplete="name" />
          </Stagger>
          <Stagger index={1}>
            <Field label="Email address" name="email" type="email" required disabled={pending} autoComplete="email" />
          </Stagger>
          <Stagger index={2}>
            <Field
              label="Password"
              name="password"
              type="password"
              required
              disabled={pending}
              autoComplete="new-password"
              hint="At least six characters."
            />
          </Stagger>
          <Stagger index={3}>
            <SubmitButton
              idle="Create my account"
              pending="Creating your account"
              done="Account created"
              state={pending ? 'pending' : 'idle'}
            />
          </Stagger>
        </form>
      ) : (
        <form
          ref={otpForm}
          onSubmit={handleVerifyOtp}
          // Keyed on the step so the boxes animate in when this replaces the
          // sign-up form rather than appearing already in place.
          key="otp"
          className="flex flex-col gap-5"
        >
          <Stagger index={0}>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={submitOtp}
              disabled={pending}
              error={Boolean(error)}
              label="Your six-digit code"
            />
          </Stagger>

          <Stagger index={1}>
            <SubmitButton
              idle="Verify and finish"
              pending="Verifying"
              done="Verified"
              state={pending ? 'pending' : 'idle'}
              disabled={code.length < 6}
            />
          </Stagger>
        </form>
      )}
    </AuthShell>
  )
}
