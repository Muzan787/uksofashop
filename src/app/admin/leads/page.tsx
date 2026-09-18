import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Inbox, Mail, RotateCcw } from 'lucide-react'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { setLeadDone } from '@/app/actions/leads'
import {
  gbp,
  mailtoLink,
  recoveryBasketLines,
  recoveryBasketTotal,
  recoveryReminderEmail,
  recoveryReminderMessage,
} from '@/utils/recoveryLeadFormat'
import { formatUkMobile, whatsAppLink } from '@/utils/phone'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

type RecoveryLead = {
  id: string
  basket: unknown
  phone: string | null
  email: string | null
  whatsapp_opt_in: boolean
  email_opt_in: boolean
  updated_at: string
  done_at: string | null
}

/**
 * Waiting is the default, the same rule as orders and swatches: the list opens
 * on what still needs doing. Done keeps the last 90 days of concluded leads so
 * a mis-tap can be put back.
 */
const VIEWS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'done',    label: 'Done' },
] as const

type SearchParams = Promise<{ view?: string }>

/** "2 hours ago" - how long the lead has been waiting, at a glance. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

/** Pinned to London: the server renders in UTC, and this is read on a phone in Blackburn. */
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export default async function AdminLeadsPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams
  const view = sp.view === 'done' ? 'done' : 'waiting'

  // /admin is already protected by proxy.ts. The recovery table itself is
  // service-role only, so this server component uses the admin client and does
  // not expose any database credential to the browser.
  const admin = createUntypedAdminClient()
  const { data, error } = await admin
    .from('checkout_recovery_leads')
    .select('id, basket, phone, email, whatsapp_opt_in, email_opt_in, updated_at, done_at')
    .eq('status', view === 'done' ? 'done' : 'active')
    // Newest shopper activity first while waiting; most recently ticked first once done.
    .order(view === 'done' ? 'done_at' : 'updated_at', { ascending: false })
    .limit(500)

  if (error) {
    return (
      <div className="mx-auto max-w-6xl rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Could not load checkout leads right now.
      </div>
    )
  }

  const leads = (data ?? []) as RecoveryLead[]

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Checkout recovery</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">Leads</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Each of these asked for a reminder before leaving checkout. Tap WhatsApp or Email to send it —
            the message is already written, and you can change it before it goes. Tick Done once it&apos;s concluded.
          </p>
        </div>
        <p className="text-sm font-medium text-zinc-500">
          {leads.length} {leads.length === 1 ? 'lead' : 'leads'} {view === 'done' ? 'done' : 'waiting'}
        </p>
      </header>

      <div className="flex gap-2">
        {VIEWS.map(v => (
          <Link
            key={v.key}
            href={v.key === 'waiting' ? '/admin/leads' : `/admin/leads?view=${v.key}`}
            className={`shrink-0 rounded-sm px-3.5 py-2 text-xs font-bold transition ${
              view === v.key
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
            <Inbox className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-base font-bold text-zinc-900">
            {view === 'done' ? 'Nothing marked done yet' : 'No leads waiting'}
          </h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
            {view === 'done'
              ? 'Leads you tick off from the waiting list stay here for 90 days, in case one needs putting back.'
              : 'When an unfinished checkout opts in to a reminder, it appears here with the product details and a message ready to send.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {leads.map((lead) => {
            const lines = recoveryBasketLines(lead.basket)
            const total = recoveryBasketTotal(lines)

            // Only the channel they ticked. The other contact detail is not on
            // the row at all - the API stores each one only when it was opted in.
            const wa = lead.whatsapp_opt_in && lead.phone
              ? whatsAppLink(lead.phone, recoveryReminderMessage(lead.basket))
              : null
            const email = lead.email_opt_in && lead.email ? recoveryReminderEmail(lead.basket) : null
            const mailto = email && lead.email ? mailtoLink(lead.email, email.subject, email.body) : null

            return (
              <article key={lead.id} className="flex flex-col rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    {lead.done_at ? (
                      <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-whatsapp-dark">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done · {when(lead.done_at)}
                      </p>
                    ) : (
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-600">{ago(lead.updated_at)}</p>
                    )}
                    <p className="mt-0.5 text-sm text-zinc-500">{when(lead.updated_at)}</p>
                  </div>
                  {total !== null && (
                    <p className="text-lg font-bold text-zinc-900">{gbp(total)}</p>
                  )}
                </div>

                {/* What they were about to buy. Codes stay here, out of the message. */}
                {lines.length === 0 ? (
                  <p className="text-sm text-zinc-400">No product details</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 rounded-sm bg-zinc-50 px-4">
                    {lines.map((line, i) => (
                      <li key={i} className="flex items-start justify-between gap-4 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900">
                            {line.quantity > 1 && <span className="text-zinc-500">{line.quantity} × </span>}
                            {line.title}
                          </p>
                          {line.detail && <p className="text-zinc-600">{line.detail}</p>}
                          {(line.sku || line.fabricCode) && (
                            <p className="mt-0.5 font-mono text-xs text-zinc-400">
                              {[line.sku, line.fabricCode].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        {line.lineTotal !== null && (
                          <span className="shrink-0 font-medium text-zinc-900">{gbp(line.lineTotal)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* The reminder, one tap away, on whichever channel they chose. */}
                <div className="mt-4 flex gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-whatsapp/10 py-2.5 text-sm font-bold text-whatsapp-dark transition hover:bg-whatsapp/20 active:scale-[0.98]"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/></svg>
                      WhatsApp
                    </a>
                  )}
                  {mailto && (
                    <a
                      href={mailto}
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-zinc-900 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Email
                    </a>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {/* The details themselves, for when the buttons are not what you
                      need - reading a number out, or pasting it somewhere else. */}
                  <p className="min-w-0 break-all text-xs text-zinc-500">
                    {[lead.phone ? formatUkMobile(lead.phone) : null, lead.email].filter(Boolean).join(' · ')}
                  </p>

                  {/* Tick it off once it has concluded - bought on WhatsApp, or
                      said no. Nothing is deleted; it moves to the Done view. */}
                  <form action={setLeadDone} className="shrink-0">
                    <input type="hidden" name="id" value={lead.id} />
                    <input type="hidden" name="done" value={lead.done_at ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3.5 text-xs font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98]"
                    >
                      {lead.done_at ? (
                        <><RotateCcw className="h-4 w-4 text-zinc-400" aria-hidden="true" /> Reopen</>
                      ) : (
                        <><Check className="h-4 w-4 text-whatsapp-dark" aria-hidden="true" /> Done</>
                      )}
                    </button>
                  </form>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
