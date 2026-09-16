import type { Metadata } from 'next'
import { Inbox, Mail, MessageCircle } from 'lucide-react'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { formatRecoveryBasket } from '@/utils/recoveryLeadFormat'
import { whatsAppLink } from '@/utils/phone'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

type RecoveryLead = {
  id: string
  basket: unknown
  phone: string | null
  email: string | null
  updated_at: string
}

export default async function AdminLeadsPage() {
  // /admin is already protected by proxy.ts. The recovery table itself is
  // service-role only, so this server component uses the admin client and does
  // not expose any database credential to the browser.
  const admin = createUntypedAdminClient()
  const { data, error } = await admin
    .from('checkout_recovery_leads')
    .select('id, basket, phone, email, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
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
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Checkout recovery</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">Leads</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Only shoppers who explicitly chose a WhatsApp or email checkout reminder appear here.
          </p>
        </div>
        <p className="text-sm font-medium text-zinc-500">
          {leads.length} {leads.length === 1 ? 'active lead' : 'active leads'}
        </p>
      </header>

      <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
        {leads.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
              <Inbox className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-bold text-zinc-900">No checkout leads yet</h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
              When an unfinished checkout opts in to a reminder, the product details and selected contact channel will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full table-fixed border-collapse text-left">
              <thead className="bg-zinc-950 text-white">
                <tr>
                  <th className="w-[54%] px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">Product Details</th>
                  <th className="w-[21%] px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">WhatsApp Number</th>
                  <th className="w-[25%] px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {leads.map((lead) => {
                  const wa = lead.phone ? whatsAppLink(lead.phone) : null
                  return (
                    <tr key={lead.id} className="align-top hover:bg-zinc-50/70">
                      <td className="px-5 py-4 text-sm leading-relaxed text-zinc-800">
                        {formatRecoveryBasket(lead.basket)}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {lead.phone ? (
                          wa ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 font-semibold text-[#128C7E] hover:underline"
                            >
                              <MessageCircle className="h-4 w-4 shrink-0" />
                              {lead.phone}
                            </a>
                          ) : lead.phone
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-2 break-all font-medium text-zinc-800 hover:text-orange-600 hover:underline"
                          >
                            <Mail className="h-4 w-4 shrink-0 text-zinc-400" />
                            {lead.email}
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
