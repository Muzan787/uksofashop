'use client'
// src/app/confirm-order/[id]/ConfirmOrderForm.tsx

import { useActionState } from 'react'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { confirmCustomerOrder } from '@/app/actions/orders'
import { whatsAppHref } from '@/constants/contact'

/**
 * The one button that confirms the order.
 *
 * A form, so confirming is a POST. Nothing about opening the link confirms
 * anything any more - see confirmCustomerOrder for why that matters.
 *
 * On success the action redirects back to this page with ?confirmed=1, so this
 * component has no success state of its own; the only thing it renders back is
 * a failure, with a way out of it that does not depend on the button working.
 */
export default function ConfirmOrderForm({
  orderId,
  reference,
}: {
  orderId: string
  reference: string
}) {
  const [state, action, pending] = useActionState(confirmCustomerOrder, null)

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="orderId" value={orderId} />

      {state?.error && (
        <p
          role="alert"
          className="m-0 mb-4 flex items-start gap-2 rounded-sm border border-rust-700 bg-rust-50 px-4 py-3 text-body-sm leading-relaxed text-rust-700"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {state.error}{' '}
            <a
              href={whatsAppHref(`Hi, I am trying to confirm order #${reference} but the button is not working.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-rust-700 underline"
            >
              Message us
            </a>
            .
          </span>
        </p>
      )}

      {/* 56px tall and full width. This is the only thing on the page being
          asked for, and it is being pressed with a thumb. */}
      <button
        type="submit"
        disabled={pending}
        className="hover-btn flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-sm btn-ember px-6 font-data text-eyebrow font-bold uppercase tracking-[0.12em] text-ink-900 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
            Confirming…
          </>
        ) : (
          <>
            <Check aria-hidden="true" className="h-4 w-4" />
            Confirm this order
          </>
        )}
      </button>

      <p className="m-0 mt-3 text-center text-caption leading-relaxed text-ink-500">
        Nothing is charged by confirming. You pay on delivery, once the sofa is in the room.
      </p>
    </form>
  )
}
