// src/app/admin/leads/RemindersTab.tsx
//
// Basket reminders (admin upgrade I4): what used to be the whole Leads page.
// Each of these asked for a reminder before leaving checkout. WhatsApp opens
// the chat with the message already typed; Email sends it straight away, and
// only ever once; Done ticks it off once it's concluded.
//
// Waiting is the default, the same rule as orders and samples: the list opens
// on what still needs doing. Done keeps the last 90 days of concluded leads so
// a mis-tap can be put back.
import Link from 'next/link'
import { Check, Inbox, RotateCcw } from 'lucide-react'
import { setLeadDone } from '@/app/actions/leads'
import EmailLeadButton from './EmailLeadButton'
import { WhatsAppMark } from '@/app/admin/orders/OrderBits'
import { gbp, recoveryBasketLines, recoveryBasketTotal, recoveryReminderMessage } from '@/utils/recoveryLeadFormat'
import { formatUkMobile, whatsAppLink } from '@/utils/phone'
import type { LeadHold } from '@/utils/offers/leadHold'
import { formatOfferDeadline } from '@/utils/offers/deadline'
import { dualTimeText } from '@/utils/adminTime'
import { leadsHref } from '@/utils/leadsTabs'

export interface RecoveryLead {
  id: string
  /** UKSS-LD-... Minted by a column default, so it is never absent. */
  reference: string
  basket: unknown
  /** The shopper's visitor id - how their ad-offer window is found. */
  visitor_id: string | null
  phone: string | null
  email: string | null
  whatsapp_opt_in: boolean
  email_opt_in: boolean
  updated_at: string
  done_at: string | null
  reminder_emailed_at: string | null
}

const VIEWS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'done', label: 'Done' },
] as const

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

/** UK and Pakistan time together; the server renders in UTC, so the zones are named. */
const when = (iso: string | null) => dualTimeText(iso) ?? ''

export default function RemindersTab({ leads, holds, view }: { leads: RecoveryLead[]; holds: Map<string, LeadHold>; view: 'waiting' | 'done' }) {
  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-zinc-500">
        Each of these asked for a reminder before leaving checkout. WhatsApp opens the chat with the message already typed;
        Email sends it straight away, and only ever once. Tick Done once it&apos;s concluded.
      </p>

      <div className="flex gap-2">
        {VIEWS.map(v => (
          <Link
            key={v.key}
            href={leadsHref('reminders', { view: v.key === 'waiting' ? null : v.key })}
            aria-current={view === v.key ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-sm px-3.5 text-xs font-bold transition ${
              view === v.key ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-bold text-zinc-900">{view === 'done' ? 'Nothing marked done yet' : 'No leads waiting'}</h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
            {view === 'done'
              ? 'Leads you tick off from the waiting list stay here for 90 days, in case one needs putting back.'
              : 'When an unfinished checkout opts in to a reminder, it appears here with the product details and a message ready to send.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {leads.map(lead => {
            const lines = recoveryBasketLines(lead.basket)
            const total = recoveryBasketTotal(lines)

            // Only the channel they ticked. The other contact detail is not on
            // the row at all - the API stores each one only when it was opted in.
            const hold = holds.get(lead.id)
            const wa = lead.whatsapp_opt_in && lead.phone
              ? whatsAppLink(lead.phone, recoveryReminderMessage(lead.basket, lead.reference, hold && !hold.ended ? hold : null))
              : null

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
                    {/* The join between this lead and an order taken by hand:
                        pasted into the order form's "Lead reference" box so the
                        sale keeps its attribution. */}
                    <p className="mt-1 select-all font-mono text-xs text-zinc-400">{lead.reference}</p>
                  </div>
                  {total !== null && <p className="text-lg font-bold text-zinc-900">{gbp(total)}</p>}
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
                            <p className="mt-0.5 font-mono text-xs text-zinc-400">{[line.sku, line.fabricCode].filter(Boolean).join(' · ')}</p>
                          )}
                        </div>
                        {line.lineTotal !== null && <span className="shrink-0 font-medium text-zinc-900">{gbp(line.lineTotal)}</span>}
                      </li>
                    ))}
                  </ul>
                )}

                {/* The online offer, stated for the shop: open until when, or over.
                    This is the deadline to honour in the chat, and no later. */}
                {hold && (
                  <p className={`mt-3 rounded-sm px-3 py-2 text-xs font-semibold ${hold.ended ? 'bg-zinc-100 text-zinc-500' : 'bg-orange-50 text-orange-700'}`}>
                    {hold.ended
                      ? `Online offer (£${Math.round(hold.amount)}) ended ${formatOfferDeadline(hold.expiresAt)} - full price now`
                      : `Online offer: £${Math.round(hold.amount)} off until ${formatOfferDeadline(hold.expiresAt)}`}
                  </p>
                )}

                {/* The reminder, one tap away, on whichever channel they chose. */}
                <div className="mt-4 flex items-start gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-whatsapp/10 py-2.5 text-sm font-bold text-whatsapp-dark transition hover:bg-whatsapp/20 active:scale-[0.98]"
                    >
                      <WhatsAppMark /> WhatsApp
                    </a>
                  )}
                  {lead.email_opt_in && lead.email && (
                    <EmailLeadButton id={lead.id} sentLabel={lead.reminder_emailed_at ? when(lead.reminder_emailed_at) : null} />
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {/* The details themselves, for reading a number out or pasting it elsewhere. */}
                  <p className="min-w-0 break-all text-xs text-zinc-500">
                    {[lead.phone ? formatUkMobile(lead.phone) : null, lead.email].filter(Boolean).join(' · ')}
                  </p>

                  {/* Tick it off once it has concluded. Nothing is deleted; it moves to Done. */}
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
