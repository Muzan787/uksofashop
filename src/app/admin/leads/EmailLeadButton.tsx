'use client'
// src/app/admin/leads/EmailLeadButton.tsx
//
// The Email button on a lead card. One tap sends the reminder from the server
// through the shop's own mailbox - no mail app, nothing to type - and the card
// says so, or says why not, right under the button.
//
// The reminder only ever goes once (admin upgrade I4; the database enforces
// it), so once it has gone the button is replaced by when it went.

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Check, Loader2, Mail } from 'lucide-react'
import { sendLeadReminderEmail, type SendReminderState } from '@/app/actions/leads'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-zinc-900 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
    >
      {pending
        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        : <Mail className="h-4 w-4" aria-hidden="true" />}
      {pending ? 'Sending…' : 'Email'}
    </button>
  )
}

function Sent({ label }: { label: string | null }) {
  return (
    <p className="flex min-h-11 flex-1 items-center gap-1.5 rounded-sm bg-zinc-50 px-3 text-xs font-medium text-whatsapp-dark">
      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label ? `Emailed ${label}` : 'Emailed'}. It only goes once.</span>
    </p>
  )
}

export default function EmailLeadButton({
  id,
  sentLabel,
}: {
  id: string
  /** "14 Oct 10:20 UK · 14 Oct 14:20 PK" when the reminder has already gone, otherwise null. */
  sentLabel: string | null
}) {
  const [state, action] = useActionState<SendReminderState, FormData>(sendLeadReminderEmail, { status: 'idle' })

  if (sentLabel || state.status === 'sent') return <Sent label={sentLabel} />

  return (
    <form action={action} className="flex flex-1 flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <SubmitButton />
      {state.status === 'error' && <p className="text-xs font-medium text-red-600">{state.message}</p>}
    </form>
  )
}
