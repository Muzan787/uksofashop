'use client'
// src/components/Admin/ConfirmSubmit.tsx
//
// A submit button that asks first when `question` is set, and shows
// "Working…" while its form is being sent. Without JavaScript it is an
// ordinary submit button, so the form still works.
import { useFormStatus } from 'react-dom'

export default function ConfirmSubmit({
  children,
  question,
  className,
  name,
  value,
}: {
  children: React.ReactNode
  /** Asked before submitting; leave out to submit straight away. */
  question?: string
  className?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      onClick={e => {
        if (question && !window.confirm(question)) e.preventDefault()
      }}
      className={className}
    >
      {pending ? 'Working…' : children}
    </button>
  )
}
