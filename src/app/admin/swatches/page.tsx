// src/app/admin/swatches/page.tsx
//
// Swatch requests are the Samples tab on Leads now (admin upgrade I1). This
// address stays, so old links and bookmarks still land in the right place,
// with their filter.
import { redirect } from 'next/navigation'
import { leadsHref } from '@/utils/leadsTabs'

type SearchParams = Promise<{ status?: string }>

const STATUSES = ['posted', 'cancelled', 'all']

export default async function SwatchesRedirect(props: { searchParams: SearchParams }) {
  const { status } = await props.searchParams
  redirect(leadsHref('samples', { status: status && STATUSES.includes(status) ? status : null }))
}
