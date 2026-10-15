// src/app/admin/leads/MessagesTab.tsx
//
// Messages (admin upgrade I2): what people sent through the contact form and
// the size guide's fit check, stored as well as emailed (decision 10). Opens
// on the new ones; Show all brings back the replied and closed.
import Link from 'next/link'
import { Inbox, Mail, Package } from 'lucide-react'
import { setContactMessageStatus } from '@/app/actions/messages'
import ConfirmSubmit from '@/components/Admin/ConfirmSubmit'
import { dualTimeText } from '@/utils/adminTime'
import { leadsHref } from '@/utils/leadsTabs'

export interface ContactMessage {
  id: string
  created_at: string
  name: string
  email: string
  order_number: string | null
  message: string
  status: string
  status_changed_at: string | null
}

const STATE: Record<string, { label: string; style: string }> = {
  new: { label: 'New', style: 'border-orange-200 bg-orange-50 text-orange-800' },
  replied: { label: 'Replied', style: 'border-green-200 bg-green-50 text-green-800' },
  closed: { label: 'Closed without reply', style: 'border-stone-200 bg-stone-100 text-stone-600' },
}

const button = 'inline-flex min-h-11 items-center rounded-sm px-4 text-sm font-bold disabled:opacity-60'

function StatusButton({ id, status, show, children, className }: { id: string; status: string; show: string; children: React.ReactNode; className: string }) {
  return (
    <form action={setContactMessageStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="show" value={show} />
      <ConfirmSubmit className={className}>{children}</ConfirmSubmit>
    </form>
  )
}

export default function MessagesTab({ messages, showAll }: { messages: ContactMessage[]; showAll: boolean }) {
  const show = showAll ? 'all' : ''
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-stone-600">
          {showAll ? 'Every message, newest first.' : 'Messages nobody has answered yet. Reply by email, then mark it replied.'}
        </p>
        <Link href={leadsHref('messages', { show: showAll ? null : 'all' })} className="inline-flex min-h-11 items-center text-sm font-semibold text-stone-900 underline">
          {showAll ? 'Only new ones' : 'Show all'}
        </Link>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="m-0 font-semibold text-stone-700">{showAll ? 'No messages yet' : 'No new messages'}</p>
          <p className="m-0 mt-1 text-sm text-stone-500">Messages from the contact form appear here, as well as in the inbox.</p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {messages.map(m => {
            const state = STATE[m.status] ?? STATE.new
            const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to UK Sofa Shop${m.order_number ? ` (order ${m.order_number})` : ''}`)}`
            return (
              <li key={m.id} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-base font-semibold text-stone-900">{m.name}</p>
                  <span className={`inline-flex items-center rounded-pill border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${state.style}`}>
                    {state.label}
                  </span>
                </div>
                <p className="m-0 mt-1 text-xs text-stone-500">
                  {dualTimeText(m.created_at)}
                  {m.status !== 'new' && m.status_changed_at && ` · ${state.label.toLowerCase()} ${dualTimeText(m.status_changed_at)}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a href={reply} className="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-blue-700">
                    <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{m.email}</span>
                  </a>
                  {m.order_number && (
                    <Link href={`/admin/orders?q=${encodeURIComponent(m.order_number)}`} className="inline-flex min-h-11 items-center gap-1.5 text-stone-700 underline">
                      <Package className="h-4 w-4 shrink-0" aria-hidden="true" /> Order {m.order_number}
                    </Link>
                  )}
                </div>
                <p className="m-0 mt-2 whitespace-pre-line break-words rounded-sm bg-stone-50 p-3 text-sm text-stone-800">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.status === 'new' ? (
                    <>
                      <StatusButton id={m.id} status="replied" show={show} className={`${button} bg-stone-900 text-white`}>Mark replied</StatusButton>
                      <StatusButton id={m.id} status="closed" show={show} className={`${button} border border-stone-200 bg-white text-stone-600`}>Close without reply</StatusButton>
                    </>
                  ) : (
                    <StatusButton id={m.id} status="new" show={show} className={`${button} border border-stone-200 bg-white text-stone-600`}>Mark as new</StatusButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
