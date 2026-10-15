import type { Metadata } from 'next'
// src/app/admin/leads/page.tsx
//
// Leads, one page with tabs (admin upgrade I1-I6): samples to post, messages
// from the contact form, WhatsApp enquiries, basket reminders and the
// newsletter. Each tab shows its count, and the page opens on the first one
// with something waiting (utils/leadsTabs.ts). This loads the counts and the
// open tab; the *Tab.tsx files show them.
//
// Everything is read under the signed-in admin's own session: each table
// admits admins through RLS, so the database checks every row as well as the
// proxy and the layout.
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { offerHoldsForLeads } from '@/utils/offers/leadHold'
import { newEnquiriesSince, pickLeadsTab, type LeadsCounts } from '@/utils/leadsTabs'
import LeadsTabNav from './LeadsTabNav'
import SamplesTab, { SAMPLE_FILTERS, type SampleRequest } from './SamplesTab'
import MessagesTab, { type ContactMessage } from './MessagesTab'
import EnquiriesTab, { type Enquiry } from './EnquiriesTab'
import RemindersTab, { type RecoveryLead } from './RemindersTab'
import NewsletterTab from './NewsletterTab'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ENQUIRIES_PER_PAGE = 50

type SearchParams = Promise<{
  tab?: string; view?: string; status?: string; show?: string; q?: string; page?: string; done?: string; error?: string
}>

const DONE: Record<string, string> = {
  replied: 'Marked replied.',
  closed: 'Closed without a reply.',
  new: 'Marked as new.',
}

export default async function AdminLeadsPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams
  const supabase = await createClient()
  const dayAgo = newEnquiriesSince()
  const head = { count: 'exact' as const, head: true }

  const [samples, messages, enquiries, reminders, confirmed, waiting, unsubscribed] = await Promise.all([
    supabase.from('swatch_requests').select('id', head).eq('status', 'pending'),
    supabase.from('contact_messages').select('id', head).eq('status', 'new'),
    supabase.from('whatsapp_enquiries').select('id', head).gte('created_at', dayAgo).is('converted_order_id', null),
    // QA/test recovery submissions are left out everywhere.
    supabase.from('checkout_recovery_leads').select('id', head).eq('status', 'active').eq('data_class', 'production_real'),
    supabase.from('newsletter_subscribers').select('id', head).eq('status', 'confirmed'),
    supabase.from('newsletter_subscribers').select('id', head).eq('status', 'pending'),
    supabase.from('newsletter_subscribers').select('id', head).eq('status', 'unsubscribed'),
  ])
  const counts: LeadsCounts = {
    samples: samples.count ?? 0,
    messages: messages.count ?? 0,
    enquiries: enquiries.count ?? 0,
    reminders: reminders.count ?? 0,
    newsletter: confirmed.count ?? 0,
  }
  const tab = pickLeadsTab(sp.tab, counts, sp.view)

  let content: React.ReactNode
  if (tab === 'samples') {
    const status = SAMPLE_FILTERS.some(f => f.key === sp.status) ? sp.status! : 'pending'
    let query = supabase
      .from('swatch_requests')
      .select(`
        id, customer_name, customer_email, customer_phone,
        postcode, shipping_address, status, created_at, posted_at,
        swatch_request_items ( id, fabric_code, fabric_name, fabric_collection )
      `)
    if (status !== 'all') query = query.eq('status', status)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
    content = error ? <LoadError /> : <SamplesTab requests={(data ?? []) as unknown as SampleRequest[]} status={status} />
  } else if (tab === 'messages') {
    const showAll = sp.show === 'all'
    let query = supabase
      .from('contact_messages')
      .select('id, created_at, name, email, order_number, message, status, status_changed_at')
    if (!showAll) query = query.eq('status', 'new')
    const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
    content = error ? <LoadError /> : <MessagesTab messages={(data ?? []) as ContactMessage[]} showAll={showAll} />
  } else if (tab === 'enquiries') {
    const q = (sp.q ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40)
    const showAll = sp.show === 'all' || Boolean(q)
    const page = /^\d+$/.test(sp.page ?? '') ? Math.max(1, parseInt(sp.page!, 10)) : 1
    const from = (page - 1) * ENQUIRIES_PER_PAGE
    let query = supabase
      .from('whatsapp_enquiries')
      .select('id, reference, created_at, page_url, page_context, product_name, utm_source, utm_campaign, fbclid, gclid, gbraid, wbraid, converted_order_id', { count: 'exact' })
    if (q) query = query.ilike('reference', `%${q}%`)
    else if (!showAll) query = query.gte('created_at', dayAgo)
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + ENQUIRIES_PER_PAGE - 1)
    content = error ? <LoadError /> : (
      <EnquiriesTab
        enquiries={(data ?? []) as Enquiry[]}
        showAll={sp.show === 'all'}
        q={q}
        page={page}
        total={count ?? 0}
        lastPage={Math.max(1, Math.ceil((count ?? 0) / ENQUIRIES_PER_PAGE))}
      />
    )
  } else if (tab === 'reminders') {
    const view = sp.view === 'done' ? 'done' : 'waiting'
    const { data, error } = await supabase
      .from('checkout_recovery_leads')
      .select('id, reference, basket, visitor_id, phone, email, whatsapp_opt_in, email_opt_in, updated_at, done_at, reminder_emailed_at')
      .eq('status', view === 'done' ? 'done' : 'active')
      .eq('data_class', 'production_real')
      // Newest shopper activity first while waiting; most recently ticked first once done.
      .order(view === 'done' ? 'done_at' : 'updated_at', { ascending: false })
      .limit(500)
    if (error) {
      content = <LoadError />
    } else {
      const leads = (data ?? []) as RecoveryLead[]
      // Each shopper's ad-offer window, if they had one: the reminder quotes it
      // while it is open, and the card says when it ends - or that it has.
      const holds = await offerHoldsForLeads(supabase, leads)
      content = <RemindersTab leads={leads} holds={holds} view={view} />
    }
  } else {
    const { data } = await supabase.from('newsletter_subscribers').select('email').eq('status', 'confirmed').order('confirmed_at', { ascending: true })
    content = (
      <NewsletterTab
        confirmed={confirmed.count ?? 0}
        waiting={waiting.count ?? 0}
        unsubscribed={unsubscribed.count ?? 0}
        confirmedEmails={(data ?? []).map(r => r.email)}
      />
    )
  }

  const done = tab === 'messages' && sp.done ? DONE[sp.done] : null
  const failed = tab === 'messages' && sp.error

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in duration-500">
      <header>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">Leads</h1>
        <p className="m-0 mt-1 text-sm text-zinc-500">Samples to post, messages, WhatsApp enquiries, basket reminders and the newsletter.</p>
      </header>

      <LeadsTabNav tab={tab} counts={counts} />

      {done && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {done}
        </p>
      )}
      {failed && (
        <p role="alert" className="m-0 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {failed === 'not-found' ? 'That message no longer exists.' : "That didn't save. Try again."}
        </p>
      )}

      {content}
    </div>
  )
}

function LoadError() {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      Could not load this tab right now. Try again in a moment.
    </div>
  )
}
