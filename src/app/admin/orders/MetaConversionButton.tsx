'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { sendOrderConversion } from '@/app/actions/orders'

export default function MetaConversionButton({
  orderId,
  kind,
  label,
  className,
}: {
  orderId: string
  kind: 'purchase' | 'delivered'
  label: string
  className: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const send = () => {
    if (pending) return
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('orderId', orderId)
      fd.set('kind', kind)
      const result = await sendOrderConversion(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={send}
        className={className}
      >
        {pending && <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />}
        {pending ? 'Sending…' : label}
      </button>
      {error && (
        <p className="m-0 mt-1.5 text-[10px] font-semibold leading-relaxed text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
