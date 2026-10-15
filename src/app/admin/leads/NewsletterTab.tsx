// src/app/admin/leads/NewsletterTab.tsx
//
// Newsletter (admin upgrade I5): how many have confirmed, are waiting to
// confirm, or have left, and the confirmed addresses to copy. Only confirmed
// addresses may be emailed: someone who never clicked the link in the
// confirmation email has not said yes.
import CopyTextButton from '@/components/Admin/CopyTextButton'

export default function NewsletterTab({ confirmed, waiting, unsubscribed, confirmedEmails }: {
  confirmed: number
  waiting: number
  unsubscribed: number
  confirmedEmails: string[]
}) {
  const tile = 'min-w-0 rounded-md border border-stone-200 bg-white p-4 shadow-sm'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className={tile}>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-green-700">Confirmed</p>
          <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-stone-900">{confirmed}</p>
        </div>
        <div className={tile}>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Waiting</p>
          <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-stone-900">{waiting}</p>
        </div>
        <div className={tile}>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Left</p>
          <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-stone-900">{unsubscribed}</p>
        </div>
      </div>
      <p className="m-0 text-sm text-stone-600">
        Waiting means they signed up but haven&apos;t clicked the link in the confirmation email yet. Only confirmed addresses may be emailed.
      </p>
      {confirmedEmails.length > 0 ? (
        <CopyTextButton
          text={confirmedEmails.join(', ')}
          label={`Copy ${confirmedEmails.length} confirmed ${confirmedEmails.length === 1 ? 'email' : 'emails'}`}
        />
      ) : (
        <p className="m-0 rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-500">No confirmed addresses yet. The sign-up box is in the shop&apos;s footer.</p>
      )}
    </div>
  )
}
